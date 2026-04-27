// build_me_patch.mjs — derive WF-ME-01 patched JSON for replace command.
//
// PL_BRIEFING_INTENT_MAPPING_FOLLOWUP 2026-04-26 (3 changes):
//   1. ME_Route_Module_Name: + response_module rule (before fallback).
//   2. New node ME_Response_Respond_Only_Result (Code, no-write canonical lane).
//   3. Connections: ME_Route_Module_Name.main[5] → new node;
//      new node.main[0] → ME_Return_Result.
//
// Output: docs/architecture/pl/briefing_respond_only/artifacts/me_patched.json
//   ready for `n8n-patch replace uq26nh1grIpnHju0 me_patched.json --reactivate`.
import { readFileSync, writeFileSync } from 'node:fs';

const live = JSON.parse(readFileSync('/tmp/me_full.json', 'utf8'));
// snapshot the live state for audit.
writeFileSync('docs/architecture/pl/briefing_respond_only/artifacts/me_live_pre.json', JSON.stringify(live, null, 2));

// Take the workflow body that PUT expects (n8n-patch CLI strips everything except
// {name, nodes, connections, settings} so we can carry extra keys here).
const wf = {
  name: live.name,
  nodes: structuredClone(live.nodes),
  connections: structuredClone(live.connections),
  settings: structuredClone(live.settings || {}),
};

// 1) Update ME_Route_Module_Name switch params: insert response_module rule
//    immediately AFTER the watcher_module_basic rule and BEFORE the fallback
//    (handled by `options.fallbackOutput: 'extra'`).
const sw = wf.nodes.find(n => n.name === 'ME_Route_Module_Name');
if (!sw) throw new Error('ME_Route_Module_Name not found');
const watcherRuleIdx = sw.parameters.rules.values.findIndex(r => r.outputKey === 'watcher_module_basic');
if (watcherRuleIdx === -1) throw new Error('watcher_module_basic rule not found');
const respondRule = {
  outputKey: 'response_module',
  conditions: {
    options: { version: 2, leftValue: '', caseSensitive: true, typeValidation: 'strict' },
    combinator: 'and',
    conditions: [{
      operator: { type: 'string', operation: 'equals' },
      leftValue: "={{ $('ME_Validate_Dispatcher_Result').first().json.step.module_name }}",
      rightValue: 'response_module'
    }]
  },
  renameOutput: true
};
sw.parameters.rules.values.splice(watcherRuleIdx + 1, 0, respondRule);

// 2) Add new node ME_Response_Respond_Only_Result.
//    Place it spatially near ME_Watcher_Observe_Result for n8n editor canvas
//    cleanliness (reading watcher's position).
const watcherNode = wf.nodes.find(n => n.name === 'ME_Watcher_Observe_Result');
if (!watcherNode) throw new Error('ME_Watcher_Observe_Result not found');
const newNode = {
  parameters: {
    jsCode: `// ME_Response_Respond_Only_Result — v1.0 (PL_BRIEFING_INTENT_MAPPING_FOLLOWUP 2026-04-26)
// No-write response-only lane. Mirrors ME_Watcher_Observe_Result shape but emits
// a 'respond_only' action and response_generation_allowed:true so RC composes
// a natural response from the user message. Strictly no DB writes; no module
// side effects.
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const userMessage = String(inputs.user_message || '').slice(0, 4000);
const responseIntent = String(inputs.response_intent || 'briefing');
const safeSummary = \`Response-only briefing acknowledged for intent='\${responseIntent}'.\`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'response_module',
    step_id: step.step_id,
    result_type: 'response',
    status: 'success',
    summary: safeSummary,
    actions_executed: [{
      action: 'respond_only',
      status: 'success',
      details: {
        user_message: userMessage,
        response_intent: responseIntent
      }
    }],
    artifacts: [],
    observations: [],
    proposals: [],
    confidence: 1.0,
    needs_followup: false,
    followup_requests: []
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: true
}}];
`,
  },
  id: 'me-response-respond-only-result',
  name: 'ME_Response_Respond_Only_Result',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [Math.round(watcherNode.position[0] + 200), Math.round(watcherNode.position[1] + 120)],
};
wf.nodes.push(newNode);

// 3) Add 2 connections.
//    a) ME_Route_Module_Name.main[5] → ME_Response_Respond_Only_Result
//    The switch's connections.main is an array of arrays; index by output rule.
//    Currently 6 outputs (5 named + extra). We're inserting a new rule at index 5,
//    so the previous extra at index 5 shifts to index 6.
const routeConn = wf.connections['ME_Route_Module_Name'];
if (!routeConn || !routeConn.main || routeConn.main.length < 6) throw new Error('Route_Module_Name connections shape unexpected');
// Existing main is [task, reminder, memory, improvement, watcher, extra(error)].
// After our new rule splice (index 5), the connections array must mirror the
// new outputs order. Insert at 5: [{ node: ME_Response_..., type: 'main', index: 0 }].
const newMainAt5 = [{ node: 'ME_Response_Respond_Only_Result', type: 'main', index: 0 }];
routeConn.main.splice(5, 0, newMainAt5);

//    b) ME_Response_Respond_Only_Result.main[0] → ME_Return_Result
wf.connections['ME_Response_Respond_Only_Result'] = {
  main: [[{ node: 'ME_Return_Result', type: 'main', index: 0 }]]
};

// Save patched body.
writeFileSync('docs/architecture/pl/briefing_respond_only/artifacts/me_patched.json', JSON.stringify(wf, null, 2));

// Sanity report.
const cConnCount = Object.values(wf.connections).reduce((n, v) => n + (v.main || []).reduce((m, arr) => m + arr.length, 0), 0);
console.log('ME post-patch nodes:', wf.nodes.length, '(was', live.nodes.length, ')');
console.log('ME post-patch connections (main edge count):', cConnCount);
console.log('Switch rules now:', sw.parameters.rules.values.map(r => r.outputKey).join(','));
console.log('New node created:', newNode.name);
console.log('Route_Module_Name.main length:', routeConn.main.length);
