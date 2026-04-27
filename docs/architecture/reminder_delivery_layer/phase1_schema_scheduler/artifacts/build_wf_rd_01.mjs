// build_wf_rd_01.mjs — produce WF-RD-01_Reminder_Delivery_Scheduler workflow JSON
// for the canonical n8n-patch import command. Outputs WF-RD-01.json next to this file.
//
// Phase 1 v1 design notes:
// - workflow imported INACTIVE; live send placeholder is a NoOp node (safe-by-construction).
// - manual trigger + schedule trigger both feed into RD_Set_Mode; default mode is 'dry_run_audit'.
// - candidate query joins to task_reminder_deliveries to exclude already-sent/skipped/failed_terminal.
// - per-row classification picks one of: missing_target, backlog, dry_run, live. The non-live
//   outcomes write their FINAL status straight from the upsert; live writes 'pending' and the
//   second update marks 'sent' (when the live placeholder is replaced with a real Telegram node).
// - SQL is parameterised throughout. No raw string concatenation with envelope text.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PG_CREDS = { postgres: { id: 'z9nKgToNWvIW7P8f', name: 'Postgres account 2' } };

// Reusable jsCode strings (the n8n Code-node bodies).
const SET_MODE_JS = `// RD_Set_Mode v1.0
// Resolves the mode for this run.
// Inputs accepted from the trigger payload (manual or schedule):
//   { mode: 'dry_run_no_write' | 'dry_run_audit' | 'live', live_allowed: boolean }
// Defaults: mode='dry_run_audit', live_allowed=false.
const inItems = $input.all();
const inJson = inItems.length && inItems[0].json ? inItems[0].json : {};
const requested = String(inJson.mode || 'dry_run_audit').toLowerCase();
const VALID = new Set(['dry_run_no_write','dry_run_audit','live']);
const mode = VALID.has(requested) ? requested : 'dry_run_audit';
const live_allowed = mode === 'live' && inJson.live_allowed === true;
const effective_mode = live_allowed ? 'live' : (mode === 'live' ? 'dry_run_audit' : mode);
return [{ json: {
  mode: effective_mode,
  requested_mode: requested,
  live_allowed,
  dry_run: effective_mode !== 'live',
  run_started_at: new Date().toISOString(),
  candidate_limit: Math.min(Math.max(parseInt(inJson.candidate_limit, 10) || 50, 1), 200),
}}];
`;

const CLASSIFY_JS = `// RD_Classify_And_Build v1.0
// Per-candidate row coming from RD_Load_Candidates. Builds:
//   __db      — params for the upsert + body for the Telegram-build step (live only)
//   outcome   — one of {missing_target, backlog, dry_run, live}
// All channel/target reads come from the already-joined columns.
const crypto = require('crypto');
const mode = ($('RD_Set_Mode').first().json || {}).mode || 'dry_run_audit';
const live_allowed = !!($('RD_Set_Mode').first().json || {}).live_allowed;
const row = $json;

const tenant_id = String(row.tenant_id);
const task_id   = String(row.task_id);
const due_iso_minute = String(row.due_occurrence_iso); // computed in SQL via to_char
const delivery_key = 'rd:' + tenant_id + ':' + task_id + ':' + due_iso_minute;
const idem_hash = crypto.createHash('sha256').update(delivery_key).digest('hex').slice(0, 24);
const idempotency_key = 'rd:' + idem_hash;
const target = (row.delivery_target == null || String(row.delivery_target).trim() === '') ? null : String(row.delivery_target);
const target_status = target ? 'present' : 'missing';
const channel = row.channel || 'telegram';
const force_send = String(row.force_send || 'false').toLowerCase() === 'true';
const is_backlog = !!row.is_backlog;

// Decide outcome
let outcome;
if (target_status === 'missing') outcome = 'missing_target';
else if (is_backlog && !force_send) outcome = 'skipped_backlog';
else if (mode === 'dry_run_audit') outcome = 'dry_run';
else if (mode === 'dry_run_no_write') outcome = 'dry_run_no_write';
else if (mode === 'live' && live_allowed) outcome = 'live';
else outcome = 'dry_run'; // safety fallback

// Map outcome → final delivery_status for the upsert (live writes 'pending'; rest writes final).
const status_for_upsert =
    outcome === 'missing_target' ? 'skipped_missing_target'
  : outcome === 'skipped_backlog' ? 'skipped_backlog'
  : outcome === 'dry_run' ? 'dry_run'
  : outcome === 'dry_run_no_write' ? null  // skip upsert
  : 'pending';

// Romanian summary (no raw JSON). Times in UTC; Phase 1.x will localise per tenants.timezone.
const dueHuman = (function() {
  try { return new Date(row.due_at).toISOString().replace('T',' ').slice(0,16) + ' UTC'; }
  catch (e) { return String(row.due_at); }
})();
const titleSafe = (row.title || '(no title)').toString().slice(0, 200);
const reminderText = 'Reminder: ' + titleSafe + ' — scadent: ' + dueHuman + '.';

// runOnceForEachItem requires a single object return (no array wrap).
return {
  outcome,
  mode,
  live_allowed,
  __db: {
    tenant_id, task_id, due_occurrence_iso: due_iso_minute,
    delivery_key, delivery_status: status_for_upsert,
    channel, delivery_target: target, attempts: 1,
    last_attempt_at: new Date().toISOString(),
    idempotency_key,
  },
  reminder: { task_id, tenant_id, channel, delivery_target: target, response_text: reminderText },
  classified_outcome: outcome,
  target_status,
  is_backlog,
  force_send,
};
`;

// SQL strings
const CANDIDATE_SQL = `SELECT
  t.id           AS task_id,
  t.tenant_id    AS tenant_id,
  t.title        AS title,
  t.description  AS description,
  t.due_at::text AS due_at,
  to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"') AS due_occurrence_iso,
  (te.metadata->>'telegram_chat_id') AS delivery_target,
  'telegram'::text AS channel,
  te.timezone   AS tenant_timezone,
  (NOW() - t.due_at > INTERVAL '24 hours') AS is_backlog,
  COALESCE(t.metadata->'reminder_delivery'->>'force_send', 'false') AS force_send
FROM public.tasks t
JOIN public.tenants te ON te.id = t.tenant_id AND te.is_active = true
LEFT JOIN public.task_reminder_deliveries d
  ON d.tenant_id = t.tenant_id
 AND d.task_id   = t.id
 AND d.due_occurrence_iso = to_char(date_trunc('minute', t.due_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:00"Z"')
WHERE t.status   = 'open'
  AND t.due_at IS NOT NULL
  AND t.due_at <= NOW()
  AND COALESCE(t.metadata->'reminder_delivery'->>'status', 'pending') <> 'sent'
  AND COALESCE(d.delivery_status, 'pending') NOT IN ('sent','failed_terminal','skipped_missing_target','skipped_backlog')
ORDER BY t.due_at ASC
LIMIT $1::int;`;

const UPSERT_SQL = `INSERT INTO public.task_reminder_deliveries
  (tenant_id, task_id, due_occurrence_iso, delivery_key, delivery_status,
   channel, delivery_target, attempts, last_attempt_at)
VALUES
  ($1::uuid, $2::uuid, $3::text, $4::text, $5::text,
   $6::text, $7::text, $8::int, $9::timestamptz)
ON CONFLICT (tenant_id, task_id, due_occurrence_iso) DO UPDATE
   SET delivery_status  = EXCLUDED.delivery_status,
       delivery_target  = EXCLUDED.delivery_target,
       attempts         = public.task_reminder_deliveries.attempts + 1,
       last_attempt_at  = EXCLUDED.last_attempt_at,
       updated_at       = now()
RETURNING id, delivery_status, attempts;`;

const LIVE_MARK_SQL = `UPDATE public.task_reminder_deliveries
   SET delivery_status     = $1::text,
       sent_at             = $2::timestamptz,
       provider_message_ref= $3::text,
       last_error          = $4::text,
       updated_at          = now()
 WHERE tenant_id = $5::uuid
   AND task_id   = $6::uuid
   AND due_occurrence_iso = $7::text
RETURNING id, delivery_status, attempts, sent_at;`;

const AGGREGATE_JS = `// RD_Aggregate_Result v1.0
const items = $input.all();
const counts = { candidates_seen: 0, sent: 0, failed: 0, dry_run: 0, dry_run_no_write: 0, skipped_missing_target: 0, skipped_backlog: 0, errors: 0 };
const per_outcome = [];
for (const it of items) {
  const r = (it && it.json) || {};
  counts.candidates_seen += 1;
  const o = r.classified_outcome || r.outcome || 'unknown';
  if (o === 'live') {
    if (r.live_send_status === 'sent') counts.sent += 1;
    else counts.failed += 1;
  } else if (o === 'dry_run') counts.dry_run += 1;
  else if (o === 'dry_run_no_write') counts.dry_run_no_write += 1;
  else if (o === 'missing_target') counts.skipped_missing_target += 1;
  else if (o === 'skipped_backlog') counts.skipped_backlog += 1;
  else counts.errors += 1;
  per_outcome.push({ task_id: r.__db && r.__db.task_id, outcome: o });
}
const mode_envelope = ($('RD_Set_Mode').first() && $('RD_Set_Mode').first().json) || {};
return [{ json: {
  status_kind: 'success',
  result_type: 'reminder_delivery_summary',
  workflow_name: 'WF-RD-01_Reminder_Delivery_Scheduler',
  run_started_at: mode_envelope.run_started_at,
  mode: mode_envelope.mode,
  live_allowed: mode_envelope.live_allowed,
  counts,
  per_outcome,
}}];
`;

const LIVE_BUILD_BODY_JS = `// RD_Live_Build_Body v1.0 — placeholder for the live-send path.
// Builds the user-safe text. Phase 1 v1 does NOT actually send; the next node
// is a NoOp standing in for n8n-nodes-base.telegram. A future phase will
// replace the NoOp with the real Telegram node, gated on tenant onboarding.
const r = $json;
return Object.assign({}, r, {
  live_payload: {
    chat_id: r.reminder.delivery_target,
    text: r.reminder.response_text,
  },
  live_send_status: 'placeholder_no_send',
});
`;

const wf = {
  name: 'WF-RD-01_Reminder_Delivery_Scheduler',
  nodes: [
    {
      id: 'rd-trig-manual-0001-aaaa-aaaaaaaaaaaa',
      name: 'RD_Manual_Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [240, 300],
      parameters: {},
    },
    {
      id: 'rd-trig-schedule-0002-aaaa-aaaaaaaaaaaa',
      name: 'RD_Schedule_Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.1,
      position: [240, 460],
      // Default cadence: every 5 minutes. Workflow imported INACTIVE so this does not fire.
      parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } },
    },
    {
      id: 'rd-mode-0003-aaaa-aaaaaaaaaaaa',
      name: 'RD_Set_Mode',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 380],
      parameters: { jsCode: SET_MODE_JS },
    },
    {
      id: 'rd-load-0004-aaaa-aaaaaaaaaaaa',
      name: 'RD_Load_Candidates',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.4,
      position: [720, 380],
      parameters: {
        operation: 'executeQuery',
        query: CANDIDATE_SQL,
        options: { queryReplacement: "={{ [$json.candidate_limit] }}" },
      },
      credentials: PG_CREDS,
    },
    {
      id: 'rd-class-0005-aaaa-aaaaaaaaaaaa',
      name: 'RD_Classify_And_Build',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 380],
      parameters: { jsCode: CLASSIFY_JS, mode: 'runOnceForEachItem' },
    },
    {
      id: 'rd-upsert-0006-aaaa-aaaaaaaaaaaa',
      name: 'RD_Upsert_Delivery_Row',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.4,
      position: [1200, 380],
      parameters: {
        operation: 'executeQuery',
        query: UPSERT_SQL,
        options: {
          queryReplacement: "={{ $json && $json.__db && $json.__db.delivery_status ? [$json.__db.tenant_id, $json.__db.task_id, $json.__db.due_occurrence_iso, $json.__db.delivery_key, $json.__db.delivery_status, $json.__db.channel, $json.__db.delivery_target, $json.__db.attempts, $json.__db.last_attempt_at] : [null,null,null,null,null,null,null,0,null] }}",
        },
      },
      credentials: PG_CREDS,
    },
    {
      id: 'rd-route-0007-aaaa-aaaaaaaaaaaa',
      name: 'RD_Route_Outcome',
      type: 'n8n-nodes-base.switch',
      typeVersion: 3,
      position: [1440, 380],
      parameters: {
        rules: { values: [
          { outputKey: 'missing_target', renameOutput: true,
            conditions: { options: { version: 2, leftValue:'', caseSensitive: true, typeValidation: 'strict' }, combinator:'and',
              conditions: [{ operator:{type:'string',operation:'equals'}, leftValue:"={{ $('RD_Classify_And_Build').item.json.classified_outcome }}", rightValue:'missing_target' }] } },
          { outputKey: 'skipped_backlog', renameOutput: true,
            conditions: { options: { version: 2, leftValue:'', caseSensitive: true, typeValidation: 'strict' }, combinator:'and',
              conditions: [{ operator:{type:'string',operation:'equals'}, leftValue:"={{ $('RD_Classify_And_Build').item.json.classified_outcome }}", rightValue:'skipped_backlog' }] } },
          { outputKey: 'dry_run', renameOutput: true,
            conditions: { options: { version: 2, leftValue:'', caseSensitive: true, typeValidation: 'strict' }, combinator:'and',
              conditions: [{ operator:{type:'string',operation:'equals'}, leftValue:"={{ $('RD_Classify_And_Build').item.json.classified_outcome }}", rightValue:'dry_run' }] } },
          { outputKey: 'live', renameOutput: true,
            conditions: { options: { version: 2, leftValue:'', caseSensitive: true, typeValidation: 'strict' }, combinator:'and',
              conditions: [{ operator:{type:'string',operation:'equals'}, leftValue:"={{ $('RD_Classify_And_Build').item.json.classified_outcome }}", rightValue:'live' }] } },
        ] },
        options: { fallbackOutput: 'extra' },
      },
    },
    {
      id: 'rd-live-build-0008-aaaa-aaaaaaaaaaaa',
      name: 'RD_Live_Build_Body',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1680, 220],
      parameters: { jsCode: LIVE_BUILD_BODY_JS, mode: 'runOnceForEachItem' },
    },
    {
      id: 'rd-live-send-0009-aaaa-aaaaaaaaaaaa',
      name: 'RD_Live_Send_PLACEHOLDER',
      // NoOp: Phase 1 v1 does NOT install a real Telegram node. A future phase
      // (gated on tenant onboarding + sandbox target) replaces this node with
      // n8n-nodes-base.telegram. Workflow remains active=false until then.
      type: 'n8n-nodes-base.noOp',
      typeVersion: 1,
      position: [1920, 220],
      parameters: {},
    },
    {
      id: 'rd-live-mark-0010-aaaa-aaaaaaaaaaaa',
      name: 'RD_Live_Mark_Sent',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.4,
      position: [2160, 220],
      parameters: {
        operation: 'executeQuery',
        query: LIVE_MARK_SQL,
        options: {
          queryReplacement: "={{ ['sent', new Date().toISOString(), $json.live_payload && $json.live_payload.provider_message_ref || null, null, $json.__db.tenant_id, $json.__db.task_id, $json.__db.due_occurrence_iso] }}",
        },
      },
      credentials: PG_CREDS,
    },
    {
      id: 'rd-aggr-0011-aaaa-aaaaaaaaaaaa',
      name: 'RD_Aggregate_Result',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2400, 380],
      parameters: { jsCode: AGGREGATE_JS },
    },
  ],
  connections: {
    RD_Manual_Trigger:    { main: [[{ node: 'RD_Set_Mode', type:'main', index: 0 }]] },
    RD_Schedule_Trigger:  { main: [[{ node: 'RD_Set_Mode', type:'main', index: 0 }]] },
    RD_Set_Mode:          { main: [[{ node: 'RD_Load_Candidates', type:'main', index: 0 }]] },
    RD_Load_Candidates:   { main: [[{ node: 'RD_Classify_And_Build', type:'main', index: 0 }]] },
    RD_Classify_And_Build:{ main: [[{ node: 'RD_Upsert_Delivery_Row', type:'main', index: 0 }]] },
    RD_Upsert_Delivery_Row:{ main: [[{ node: 'RD_Route_Outcome', type:'main', index: 0 }]] },
    RD_Route_Outcome: {
      main: [
        [{ node: 'RD_Aggregate_Result', type:'main', index: 0 }],   // missing_target
        [{ node: 'RD_Aggregate_Result', type:'main', index: 0 }],   // skipped_backlog
        [{ node: 'RD_Aggregate_Result', type:'main', index: 0 }],   // dry_run
        [{ node: 'RD_Live_Build_Body', type:'main', index: 0 }],    // live
        [{ node: 'RD_Aggregate_Result', type:'main', index: 0 }],   // extra/fallback
      ],
    },
    RD_Live_Build_Body:  { main: [[{ node: 'RD_Live_Send_PLACEHOLDER', type:'main', index: 0 }]] },
    RD_Live_Send_PLACEHOLDER: { main: [[{ node: 'RD_Live_Mark_Sent', type:'main', index: 0 }]] },
    RD_Live_Mark_Sent:   { main: [[{ node: 'RD_Aggregate_Result', type:'main', index: 0 }]] },
  },
  settings: {
    executionOrder: 'v1',
    saveExecutionProgress: true,
    saveDataSuccessExecution: 'all',
    saveDataErrorExecution: 'all',
    availableInMCP: true,
  },
};

const out = resolve(__dirname, 'WF-RD-01.json');
writeFileSync(out, JSON.stringify(wf, null, 2));
const nodeCount = wf.nodes.length;
const connCount = Object.values(wf.connections).reduce((s, o) => s + (o.main || []).reduce((s2, arr) => s2 + (Array.isArray(arr) ? arr.length : 0), 0), 0);
console.log(JSON.stringify({ wrote: out, nodeCount, connCount }, null, 2));
