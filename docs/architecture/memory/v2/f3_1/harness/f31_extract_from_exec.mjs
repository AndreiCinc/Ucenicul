#!/usr/bin/env node
// f31_extract_from_exec.mjs — Stage C batch helper.
//
// Consumes a saved get_execution JSON file and a case_id, extracts the
// per-family response_envelope, and writes the canonical raw artifact
// under artifacts/runtime/. Optionally accepts db_pre / db_post rows as
// inline JSON args.
//
// Usage:
//   node harness/f31_extract_from_exec.mjs \
//     --case-id f31-search-003 \
//     --exec-json /path/to/saved-get_execution.txt \
//     [--db-pre '[{"pre_max":"..."}]'] \
//     [--db-post '[{"post_max":"..."}]'] \
//     [--notes 'free text']
//
// The helper figures out the action from the matrix and picks the right
// Result node: ME_Memory_{Search,Recall,Promote,Supersede}_Result.
//
// Writes exec_<case_id>_<execution_id>.raw.json and prints its path.

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MATRIX_PATH = path.resolve(HERE, '..', 'matrix', 'f31_cases_150.json');
const ART_DIR = path.resolve(HERE, '..', 'artifacts', 'runtime');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      out[key] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function loadMatrix() { return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')); }

function actionResultNode(action) {
  switch (action) {
    case 'search_memory':    return 'ME_Memory_Search_Result';
    case 'recall_memory':    return 'ME_Memory_Recall_Result';
    case 'promote_memory':   return 'ME_Memory_Promote_Result';
    case 'supersede_memory': return 'ME_Memory_Supersede_Result';
    case 'store_memory':     return 'ME_Memory_Store_Result';
    default: return null;
  }
}

function pluckDetails(execJson, nodeName) {
  const runData = execJson?.data?.resultData?.runData || {};
  const node = runData[nodeName];
  if (!node || !node[0]) return null;
  const json = node[0]?.data?.main?.[0]?.[0]?.json;
  return json || null;
}

function pluckReturnResult(execJson) {
  return pluckDetails(execJson, 'ME_Return_Result');
}

function shapeResponseEnvelope(action, moduleWrapper, execJson) {
  const mr = moduleWrapper?.module_result || {};
  const details = mr.actions_executed?.[0]?.details || {};
  // For recall, applied_filters lives on ME_Memory_Recall_Prep.passthrough,
  // not on Recall_Result.details. Pull it out so the oracle can check it.
  function pluckRecallAppliedFilters() {
    const prepNode = execJson?.data?.resultData?.runData?.ME_Memory_Recall_Prep;
    const pt = prepNode?.[0]?.data?.main?.[0]?.[0]?.json?.passthrough;
    return pt?.applied_filters ?? null;
  }
  switch (action) {
    case 'search_memory':
      return {
        status: mr.status,
        query: details.query,
        used_embedding: details.used_embedding,
        embedding_attempted: details.embedding_attempted,
        embedding_error: details.embedding_error,
        semantic_match_count: details.semantic_match_count,
        lexical_match_count: details.lexical_match_count,
        recall_results: details.recall_results,
      };
    case 'recall_memory':
      return {
        status: mr.status,
        applied_filters: details.applied_filters ?? pluckRecallAppliedFilters(),
        recall_results: details.recall_results,
      };
    case 'promote_memory':
      return {
        status: mr.status,
        denial_reason: details.denial_reason ?? null,
        acceptance_signals: details.acceptance_signals ?? [],
        promoted: details.promoted ?? null,
        memory_id: details.memory_id ?? null,
        tier_before: details.tier_before ?? null,
        tier_after: details.tier_after ?? null,
      };
    case 'supersede_memory':
      return {
        status: mr.status,
        error_code: details.error_code ?? null,
        idempotency_reused: details.idempotency_reused ?? null,
        new_insert: details.new_insert ?? null,
        superseded_memory_id: details.superseded_memory_id ?? null,
        new_memory_id: details.new_memory_id ?? null,
      };
    case 'store_memory':
      return {
        status: mr.status,
        memory_id: details.memory_id ?? null,
        idempotency_reused: details.idempotency_reused ?? null,
        stored_at: details.stored_at ?? null,
      };
    default:
      return { status: mr.status, raw: details };
  }
}

function shapeModuleResultOuter(moduleWrapper) {
  if (!moduleWrapper) return null;
  const mr = moduleWrapper.module_result || {};
  return {
    status_kind: moduleWrapper.status_kind,
    result_type: moduleWrapper.result_type,
    module_name: mr.module_name,
    step_id: mr.step_id,
    summary: mr.summary,
    artifacts: mr.artifacts ?? [],
    domain_writes_performed: moduleWrapper.domain_writes_performed,
    response_generation_allowed: moduleWrapper.response_generation_allowed,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const required = ['case-id', 'exec-json'];
  for (const k of required) if (!args[k]) {
    console.error(`missing --${k}`);
    process.exit(1);
  }
  const caseId = args['case-id'];
  const execJsonPath = args['exec-json'];
  const matrix = loadMatrix();
  const c = matrix.cases.find(x => x.case_id === caseId);
  if (!c) { console.error(`case not found: ${caseId}`); process.exit(1); }

  const execBlob = JSON.parse(fs.readFileSync(execJsonPath, 'utf8'));
  const execution = execBlob.execution || execBlob;
  const execId = execution.id || args['exec-id'];
  const execStatus = execution.status || 'unknown';

  const nodeName = actionResultNode(c.action);
  const nodeWrapper = nodeName ? pluckDetails(execBlob, nodeName) : null;
  const returnWrapper = pluckReturnResult(execBlob);
  const wrapper = returnWrapper || nodeWrapper;
  const response_envelope = shapeResponseEnvelope(c.action, wrapper, execBlob);
  const module_result_outer = shapeModuleResultOuter(wrapper);

  const raw = {
    case_id: caseId,
    execution_id: String(execId),
    execution_status: execStatus,
    execution_mcp_response: { executionId: String(execId), status: execStatus },
    response_envelope,
    module_result_outer,
    db_pre: args['db-pre'] ? JSON.parse(args['db-pre']) : [],
    db_post: args['db-post'] ? JSON.parse(args['db-post']) : [],
    error: null,
    captured_at: new Date().toISOString(),
  };
  if (args.notes) raw.notes = args.notes;

  fs.mkdirSync(ART_DIR, { recursive: true });
  const outPath = path.join(ART_DIR, `exec_${caseId}_${execId}.raw.json`);
  fs.writeFileSync(outPath, JSON.stringify(raw, null, 2));
  console.log(outPath);
}

main();
