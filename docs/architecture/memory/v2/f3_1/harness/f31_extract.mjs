#!/usr/bin/env node
// f31_extract.mjs — Stage C helper.
//
// Given the components gathered by a subagent/session during execution —
//   (case_id, execution_id, execution_status, response_envelope,
//    module_result_outer, db_pre, db_post, error, notes) —
// this helper assembles them into the canonical raw artifact shape that
// f31_oracle.mjs consumes, and writes it to
// artifacts/runtime/exec_<case_id>_<execution_id>.raw.json.
//
// Usage (as a CLI with a single JSON arg from stdin):
//   cat body.json | node harness/f31_extract.mjs
//
// Where body.json is:
// {
//   "case_id": "f31-search-002",
//   "execution_id": "1745",
//   "execution_status": "success",
//   "execution_mcp_response": { "executionId": "1745", "status": "success" },
//   "response_envelope": { ... action-specific envelope ... },
//   "module_result_outer": { ... optional outer module_result wrapper ... },
//   "db_pre": [ ... ],
//   "db_post": [ ... ],
//   "error": null,
//   "notes": "optional string"
// }
//
// The helper writes the raw artifact and prints its path to stdout.
// It does NOT call the oracle — use f31_runner.mjs verdict <path> for that.

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ART_DIR = path.resolve(HERE, '..', 'artifacts', 'runtime');

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function validate(body) {
  const required = ['case_id', 'execution_id', 'execution_status', 'response_envelope'];
  for (const k of required) {
    if (!(k in body)) throw new Error(`missing required field: ${k}`);
  }
  if (typeof body.case_id !== 'string' || !body.case_id.startsWith('f31-')) {
    throw new Error(`invalid case_id: ${body.case_id}`);
  }
  if (typeof body.execution_id !== 'string' && typeof body.execution_id !== 'number') {
    throw new Error(`invalid execution_id: ${body.execution_id}`);
  }
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.error('usage: cat body.json | node harness/f31_extract.mjs');
    process.exit(1);
  }
  const body = JSON.parse(input);
  validate(body);

  const raw = {
    case_id: body.case_id,
    execution_id: String(body.execution_id),
    execution_status: body.execution_status,
    execution_mcp_response: body.execution_mcp_response || { executionId: String(body.execution_id), status: body.execution_status },
    response_envelope: body.response_envelope,
    module_result_outer: body.module_result_outer || null,
    db_pre: body.db_pre || [],
    db_post: body.db_post || [],
    error: body.error ?? null,
    captured_at: new Date().toISOString(),
  };
  if (body.notes) raw.notes = body.notes;

  fs.mkdirSync(ART_DIR, { recursive: true });
  const outPath = path.join(ART_DIR, `exec_${raw.case_id}_${raw.execution_id}.raw.json`);
  fs.writeFileSync(outPath, JSON.stringify(raw, null, 2));
  console.log(outPath);
}

main().catch(e => { console.error(e.message); process.exit(2); });
