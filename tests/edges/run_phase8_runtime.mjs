#!/usr/bin/env node
// Phase-8 runtime edge harness: 10 live cases per edge for edges 1–4.
//
// Strategy (mirrors Phase-5 runtime pattern): for each edge, directly invoke
// the TARGET workflow via its {X}_Input executeWorkflowTrigger with the exact
// envelope the source's terminal emits. This proves the edge's envelope
// contract is satisfied by the n8n runtime: if the target workflow executes
// to completion (or fails with a deterministic downstream error like
// CONTEXT_MISMATCH for a synthetic execution_id) then the edge accepted the
// envelope shape.
//
// For each edge, we record:
//   - executionId of the target invocation
//   - final status + last node executed
//   - whether a downstream dispatch fired (sub-execution id for edges 2, 3, 4
//     that continue the cascade)
//
// Output: tests/generated/edges/phase8_edge_1_4_runtime_results.json

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ──────────────────────────────────────────────────────────────────────
// Env
// ──────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env';
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = loadEnv();
const N8N_URL = env.N8N_URL.replace(/\/$/,'');
const N8N_API_KEY = env.N8N_API_KEY;

const WF = {
  TR: 'wI8hpSROxQI0zC9f',
  EC: 'v9jih4jqeXpOJOiH',
  OR: 'KhGmNpi0ZDmrnz8W',
  PL: 'RwToPLa1ErHl2tUi',
  DI: 'abqYINcXr3JAhGGk',
};

// ──────────────────────────────────────────────────────────────────────
// Postgres helper via /api/v1 — use the MCP postgres route. For speed and
// simplicity we instead invoke psql directly through the existing postgres
// credential by hitting n8n's /api/v1/workflows proxy — no, too complex.
// Simplest: ensure each test case uses a DISTINCT idempotency_key + a fresh
// execution_context row. We can pre-seed via the postgres MCP; here we use
// per-case UUIDs so the idempotency test is implicit.
// ──────────────────────────────────────────────────────────────────────

async function invoke(workflowId, payload) {
  // Mirror the MCP execute_workflow internals: POST to /api/v1/workflows/{id}/execute
  // with executionMode production and an input item. The executeWorkflowTrigger
  // accepts any JSON — $json of the trigger is exactly the POST body's data.
  //
  // n8n's Public API doesn't publicly expose workflow execution, so we use the
  // existing MCP execute_workflow tool surface via the /mcp endpoint. Easier:
  // we rely on the caller to have used the mcp tool. But since we're in a
  // standalone script, we POST to /webhook-test is not applicable.
  //
  // Instead: we use n8n's /api/v1/executions creator endpoint? It doesn't exist
  // for triggering executions either. The only public way is webhooks/triggers.
  //
  // For executeWorkflowTrigger, we can do a round-trip via a shell invocation
  // of the MCP tool. But that's awkward here. The cleanest path is to write
  // the cases to a JSON file and let a companion MCP-using script run them.
  //
  // This script therefore just builds the case fixtures; the runtime results
  // are populated by the MCP-driven companion (which runs in the assistant
  // harness, not in this script).
  throw new Error('Use mcp__execute_workflow from the assistant harness.');
}

// ──────────────────────────────────────────────────────────────────────
// Fixture builders — identical shapes to the per-edge adapter output
// ──────────────────────────────────────────────────────────────────────

const uuid = (ns, seed) => `${ns}-${String(seed).padStart(12,'0').slice(-12)}`;

function edge1Cases(n=10) {
  // Input shape = EC_Validate_Input flat input (what TR_Build_EC_Envelope emits).
  const out = [];
  for (let i=1;i<=n;i++){
    const ten = 'aaaaaaaa-0000-0000-0000-000000000001';
    const threadId = `55555555-0000-0000-0000-${String(i).padStart(12,'0')}`;
    const trigMsg = `bbbbcccc-0001-0000-0000-${String(i).padStart(12,'0')}`;
    out.push({
      case_id: i,
      edge: 'TR→EC',
      payload: {
        tenant_id: ten,
        thread_id: threadId,
        trigger_message_id: trigMsg,
        resolution_method: 'attach_to_existing_thread',
        resolved_at: new Date().toISOString(),
        idempotency_key: `tr-to-ec:${ten}:${trigMsg}:v1`
      }
    });
  }
  return out;
}

function edge2Cases(n=10) {
  // Input shape = EC_Return_Result flat output (what EC_Dispatch_To_OR_01_SUBCALL sends).
  // OR_Validate_EC_Result will accept either wrapped or flat. We send flat.
  const out = [];
  for (let i=1;i<=n;i++){
    const ten = 'aaaaaaaa-0000-0000-0000-000000000001';
    const id  = `cccccccc-0002-0000-0000-${String(i).padStart(12,'0')}`;
    const threadId = `55555555-0000-0000-0000-${String(i).padStart(12,'0')}`;
    const trigMsg = `bbbbcccc-0002-0000-0000-${String(i).padStart(12,'0')}`;
    out.push({
      case_id: i,
      edge: 'EC→OR',
      payload: {
        id, tenant_id: ten, thread_id: threadId, trigger_message_id: trigMsg,
        status: 'initialized',
        current_goal: null, current_plan_ref: null,
        pending_steps: [], completed_steps: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error: null,
        module_name: 'execution_context_init',
        result_type: 'state',
        status_kind: 'success',
        ttl_seconds: 900,
        idempotency_key: `ec-to-or:${ten}:${trigMsg}:v1`
      }
    });
  }
  return out;
}

function edge3Cases(n=10) {
  // Input shape = OR_Build_Handoff_Payload wrapped output.
  const out = [];
  for (let i=1;i<=n;i++){
    const ten = 'aaaaaaaa-0000-0000-0000-000000000001';
    const execId = `dddddddd-0003-0000-0000-${String(i).padStart(12,'0')}`;
    const threadId = `55555555-0000-0000-0000-${String(i).padStart(12,'0')}`;
    const trigMsg = `bbbbcccc-0003-0000-0000-${String(i).padStart(12,'0')}`;
    out.push({
      case_id: i,
      edge: 'OR→PL',
      payload: {
        status_kind: 'success',
        result_type: 'handoff',
        module_name: 'orchestrator_input_handoff',
        payload: {
          tenant_id: ten,
          thread_id: threadId,
          execution_id: execId,
          trigger_message_id: trigMsg,
          idempotency_key: `or-to-pl:${ten}:${trigMsg}:v1`,
          execution_status: 'initialized',
          planning_allowed: true,
          allowed_next_stage: 'WF-PL-01',
          orchestrator_input: {
            planning_mode: 'plan_only',
            module_execution_allowed: false,
            response_generation_allowed: false,
            domain_writes_allowed: false
          },
          warnings: []
        }
      }
    });
  }
  return out;
}

function edge4Cases(n=10) {
  // Input shape = PL_Build_DI_Envelope output (wrapped plan envelope).
  const out = [];
  for (let i=1;i<=n;i++){
    const ten = 'aaaaaaaa-0000-0000-0000-000000000001';
    const execId = `dddddddd-0004-0000-0000-${String(i).padStart(12,'0')}`;
    const threadId = `55555555-0000-0000-0000-${String(i).padStart(12,'0')}`;
    const trigMsg = `bbbbcccc-0004-0000-0000-${String(i).padStart(12,'0')}`;
    const idem = `pl-to-di:${ten}:${trigMsg}:v1`;
    const primary = (i%2===0)?'create_task':'create_reminder';
    out.push({
      case_id: i,
      edge: 'PL→DI',
      payload: {
        status_kind: 'success',
        result_type: 'plan',
        module_name: 'plan_generation',
        payload: {
          tenant_id: ten,
          thread_id: threadId,
          execution_id: execId,
          trigger_message_id: trigMsg,
          idempotency_key: idem,
          plan_id: `plan:${execId}:v1`,
          goal: `goal-${i}`,
          primary_intent: primary,
          steps: [{
            step_id: `step_01_${primary}`,
            module_name: primary === 'create_task' ? 'task_module' : 'reminder_module',
            purpose: 'p',
            inputs: {},
            depends_on: [],
            execution_mode: 'sequential',
            expected_outputs: [],
            replan_if: ['failed'],
            failure_policy: 'continue_with_notice',
            status: 'pending'
          }],
          allowed_next_stage: 'WF-DI-01',
          dispatcher_input: {
            dispatch_allowed: true,
            module_execution_started: false,
            response_generation_allowed: false,
            domain_writes_performed: false
          }
        }
      }
    });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Emit fixtures (one JSON per edge) and a runner manifest.
// ──────────────────────────────────────────────────────────────────────

const manifest = {
  ts: new Date().toISOString(),
  workflows: WF,
  n8n_url: N8N_URL,
  edges: [
    { id: 1, name: 'TR→EC', target: WF.EC, cases: edge1Cases() },
    { id: 2, name: 'EC→OR', target: WF.OR, cases: edge2Cases() },
    { id: 3, name: 'OR→PL', target: WF.PL, cases: edge3Cases() },
    { id: 4, name: 'PL→DI', target: WF.DI, cases: edge4Cases() },
  ]
};

const outPath = join(__dirname, '..', 'generated', 'edges', 'phase8_runtime_manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log('wrote', outPath);
console.log('Cases per edge:', manifest.edges.map(e => `${e.name}:${e.cases.length}`).join(' '));
