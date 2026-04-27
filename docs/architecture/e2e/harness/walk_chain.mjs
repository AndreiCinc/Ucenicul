// walk_chain.mjs — walk a TR-originated chain via metadata.subExecution links.
//
// For each n8n execute_workflow node call, n8n records:
//   runData[<nodeName>][<runIdx>].metadata.subExecution = { executionId, workflowId }
// We follow these links from TR forward.
//
// Returns a structured trace with per-hop exec ids + key payloads.

const HOP_ORDER = ['TR', 'EC', 'OR', 'PL', 'DI', 'ME', 'RA', 'SU', 'RC', 'MO'];

// Map workflowId → acronym for label resolution.
const WF_BY_ID = {
  'wI8hpSROxQI0zC9f': 'TR',
  'v9jih4jqeXpOJOiH': 'EC',
  'KhGmNpi0ZDmrnz8W': 'OR',
  'RwToPLa1ErHl2tUi': 'PL',
  'abqYINcXr3JAhGGk': 'DI',
  'uq26nh1grIpnHju0': 'ME',
  '5RcNLtxNjAHJsZPE': 'RA',
  'ENiYNfL3ul8AmmCB': 'SU',
  'TClXgmO8H8zsSwMb': 'RC',
  'OooZdC0DgsDR6gm0': 'MO',
};

function getNodeJson(exec, nodeName, runIdx = 0) {
  const runs = exec?.data?.resultData?.runData?.[nodeName] || null;
  return runs?.[runIdx]?.data?.main?.[0]?.[0]?.json || null;
}

function findRunWhere(exec, nodeName, predicate) {
  const runs = exec?.data?.resultData?.runData?.[nodeName] || null;
  if (!runs) return null;
  for (const r of runs) {
    const j = r?.data?.main?.[0]?.[0]?.json;
    if (j && predicate(j)) return j;
  }
  return null;
}

// Collect all sub-execution metadata from this exec's runData.
function collectSubExecutions(exec) {
  const out = [];
  const runData = exec?.data?.resultData?.runData || {};
  for (const [nodeName, runs] of Object.entries(runData)) {
    for (let i = 0; i < runs.length; i++) {
      const se = runs[i]?.metadata?.subExecution;
      if (se?.executionId) out.push({ node: nodeName, runIdx: i, executionId: String(se.executionId), workflowId: String(se.workflowId || '') });
    }
  }
  return out;
}

function summarize(exec) {
  if (!exec) return null;
  const rd = exec.data?.resultData || {};
  const lastNode = rd.lastNodeExecuted || null;
  const last = lastNode ? getNodeJson(exec, lastNode, 0) : null;
  return {
    exec_id: String(exec.id),
    started_at: exec.startedAt,
    stopped_at: exec.stoppedAt,
    status: exec.status,
    finished: !!exec.finished,
    last_node: lastNode,
    last_node_json: last,
  };
}

// Map WF acronym → its workflow id.
const ID_BY_WF = Object.fromEntries(Object.entries(WF_BY_ID).map(([id, wf]) => [wf, id]));

// Pick a tight executions list and find the first one started after `afterTs` for
// the given workflow, within a window.  Used for hops where the parent didn't
// record subExecution metadata (e.g. DI's mode=each splitter).
async function findExecAfterTs(client, workflowId, afterIso, windowMs = 90000) {
  const after = new Date(afterIso || 0).getTime();
  const list = await client.listExecs(workflowId, 25);
  const cands = list
    .map(e => ({ id: String(e.id), started: e.startedAt, status: e.status, delta: new Date(e.startedAt).getTime() - after }))
    .filter(e => e.delta >= -2000 && e.delta <= windowMs)
    .sort((a, b) => a.delta - b.delta);
  return cands[0] || null;
}

export async function walkChain(client, trExecId) {
  const trExec = await client.waitExecFinal(trExecId, 60000, 1500);
  const trSummary = summarize(trExec);

  // Hops by workflow acronym.
  const hops = { TR: { ...trSummary, exec: trExec, sub_calls: [] } };

  // BFS through sub-executions. Each parent emits one or more sub-executions;
  // keep them ordered by startedAt.
  const queue = [{ wf: 'TR', exec: trExec }];
  while (queue.length) {
    const { wf, exec } = queue.shift();
    const subs = collectSubExecutions(exec);
    for (const s of subs) {
      const childWf = WF_BY_ID[s.workflowId] || ('UNKNOWN_' + s.workflowId.slice(0, 6));
      if (hops[wf]) hops[wf].sub_calls.push({ via_node: s.node, exec_id: s.executionId, target_wf: childWf });
      // Skip already-visited
      if (hops[childWf]) continue;
      try {
        const childExec = await client.waitExecFinal(s.executionId, 60000, 1500);
        hops[childWf] = { ...summarize(childExec), exec: childExec, sub_calls: [] };
        queue.push({ wf: childWf, exec: childExec });
      } catch (e) {
        hops[childWf] = { exec_id: s.executionId, error: 'fetch_failed:' + String(e).slice(0, 200) };
      }
    }
  }

  // Timestamp-proximity fallback for any missing canonical hop.
  for (const wf of HOP_ORDER) {
    if (hops[wf]) continue;
    // Find the previous canonical hop with a captured exec (its startedAt is our baseline).
    const idx = HOP_ORDER.indexOf(wf);
    let prev = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (hops[HOP_ORDER[i]]?.exec?.startedAt) { prev = hops[HOP_ORDER[i]]; break; }
    }
    if (!prev) continue;
    const wfId = ID_BY_WF[wf];
    if (!wfId) continue;
    const cand = await findExecAfterTs(client, wfId, prev.exec.startedAt, 90000);
    if (!cand) continue;
    try {
      const childExec = await client.waitExecFinal(cand.id, 60000, 1500);
      hops[wf] = { ...summarize(childExec), exec: childExec, sub_calls: [], via: 'ts_proximity' };
    } catch (e) {
      hops[wf] = { exec_id: cand.id, error: 'fetch_failed:' + String(e).slice(0, 200), via: 'ts_proximity' };
    }
  }

  // Build per-hop digest (omit raw exec to keep file size reasonable).
  const digest = {};
  for (const wf of HOP_ORDER) {
    const h = hops[wf];
    if (!h) { digest[wf] = null; continue; }
    digest[wf] = {
      exec_id: h.exec_id,
      status: h.status,
      finished: h.finished,
      started_at: h.started_at,
      last_node: h.last_node,
      last_node_json: h.last_node_json,
      sub_calls: h.sub_calls,
      // Capture select interesting nodes per hop.
      selected_nodes: pickSelectedNodes(wf, h.exec),
    };
  }

  // Hops string
  const hopsStr = HOP_ORDER
    .filter(w => digest[w])
    .map(w => `${w}:${digest[w].exec_id}`)
    .join(' → ');

  return { tr_exec_id: String(trExecId), hops_str: hopsStr, digest };
}

function pickSelectedNodes(wf, exec) {
  if (!exec) return null;
  const out = {};
  const runData = exec.data?.resultData?.runData || {};

  function take(name) {
    const runs = runData[name];
    if (!runs) return;
    out[name] = runs.map(r => ({
      executed: !!r,
      json: r?.data?.main?.[0]?.[0]?.json || null,
      error: r?.error || null,
    }));
  }

  if (wf === 'TR') {
    take('TR_Validate_Input');
    take('TR_Resolved_Thread_Result');
    take('TR_Build_EC_Envelope');
    take('TR_Dispatch_To_EC_01_SUBCALL');
  } else if (wf === 'EC') {
    take('EC_Build_OR_Envelope');
    take('EC_Dispatch_To_OR_01_SUBCALL');
  } else if (wf === 'OR') {
    take('OR_Build_Handoff_Payload');
    take('OR_Dispatch_To_PL_01_SUBCALL');
  } else if (wf === 'PL') {
    take('PL_Generate_Plan');
    take('PL_Build_DI_Envelope');
    take('PL_Build_Planner_Input');
    take('PL_Return_Error');
  } else if (wf === 'DI') {
    take('DI_Build_Dispatch_Payload');
    take('DI_Build_ME_Envelopes');
    take('DI_Dispatch_To_ME_01_SUBCALL');
  } else if (wf === 'ME') {
    for (const n of ['ME_Task_Create_Result','ME_Reminder_Create_Result','ME_Memory_Search_Result',
                     'ME_Memory_Store_Result','ME_Memory_Update_Result','ME_Memory_Recall_Result',
                     'ME_Improvement_Capture_Result','ME_Response_Compose_Result',
                     'ME_Build_RA_Envelope','ME_Return_Result']) take(n);
  } else if (wf === 'RA') {
    take('RA_Build_Downstream_Envelope');
    take('RA_Dispatch_To_SU_01_SUBCALL');
  } else if (wf === 'SU') {
    take('SU_Build_Downstream_Envelope');
    take('SU_Dispatch_To_RC_01_SUBCALL');
  } else if (wf === 'RC') {
    take('RC_Build_Output_Envelope');
    take('RC_Dispatch_To_MO_01_SUBCALL');
    take('RC_Compose_Final_Response');
  } else if (wf === 'MO') {
    take('MO_Send_Outbound');
    take('MO_Return_Result');
    take('MO_Build_Result');
  }
  return out;
}

export { HOP_ORDER, WF_BY_ID };
