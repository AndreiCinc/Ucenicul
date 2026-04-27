// dry_run.mjs — REMINDER_DELIVERY_LAYER Phase 0 dry-run.
// SELECT-only against public.tasks. Produces intended MO payload per
// candidate task. Does NOT mutate tasks. Does NOT call MO. Does NOT
// write to public.reminders. Does NOT write to outbound ledger.
//
// Usage:
//   node docs/architecture/reminder_delivery_layer/phase0/artifacts/dry_run.mjs --tenant <tenant_id>
//
// Without --tenant, runs for all 3 e2e tenants (default + A + B).

import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');

// Load DB creds from .pgpass-equivalent: read from harness env file.
function loadEnv() {
  const envPath = resolve(REPO_ROOT, '.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env');
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const E2E_TENANT_DEFAULT = 'eee0e2e0-0000-0000-0000-000000000001';
const E2E_TENANT_A = 'eee0e2e0-0000-0000-0000-00000000000a';
const E2E_TENANT_B = 'eee0e2e0-0000-0000-0000-00000000000b';

const args = process.argv.slice(2);
let tenantArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tenant' && args[i + 1]) tenantArg = args[i + 1];
}

const TENANTS = tenantArg ? [tenantArg] : [E2E_TENANT_DEFAULT, E2E_TENANT_A, E2E_TENANT_B];

// Candidate query: SELECT-only.  Selects open tasks with due_at <= now()
// that haven't been marked sent in metadata.
const CANDIDATE_SQL = `
  SELECT id, tenant_id, title, description, due_at, due_date, due_type,
         status, metadata, created_at,
         (metadata ? 'reminder_delivery') AS has_delivery_meta,
         COALESCE(metadata->'reminder_delivery'->>'status', 'pending') AS rd_status,
         COALESCE(metadata->'metadata'->>'origin', metadata->>'origin', 'plain_task') AS origin_marker
    FROM public.tasks
   WHERE tenant_id = $1::uuid
     AND status   = 'open'
     AND due_at IS NOT NULL
     AND due_at <= NOW()
     AND COALESCE(metadata->'reminder_delivery'->>'status', 'pending') <> 'sent'
   ORDER BY due_at ASC
   LIMIT $2;
`;

const TARGET_SQL = `SELECT id AS tenant_id,
                          'telegram'::text AS channel,
                          (metadata->>'telegram_chat_id')::text AS delivery_target
                     FROM public.tenants
                    WHERE id = $1::uuid;`;

function formatRoReminder(task) {
  const dueIso = task.due_at ? new Date(task.due_at).toISOString() : null;
  // Render due_at in user-friendly Romanian (UTC; Phase 1 should localize per tenant timezone).
  const due = dueIso ? dueIso.replace('T', ' ').slice(0, 16) + ' UTC' : 'fără termen';
  const head = (task.description && task.description.trim()) ? task.title : task.title;
  return `Reminder: ${head} — scadent: ${due}.`;
}

function dueOccurrenceIsoMinute(due_at) {
  if (!due_at) return null;
  return new Date(due_at).toISOString().slice(0, 16) + ':00Z'; // truncate to minute
}

function deliveryKey(tenant_id, task_id, due_iso_minute) {
  return `rd:${tenant_id}:${task_id}:${due_iso_minute}`;
}

function buildIntendedMoPayload({ task, tenant_id, channel, delivery_target }) {
  const due_iso_minute = dueOccurrenceIsoMinute(task.due_at);
  const delivery_key = deliveryKey(tenant_id, task.id, due_iso_minute);
  const idempotency_key = `rd:${createHash('sha256').update(delivery_key).digest('hex').slice(0, 24)}`;
  const response_text = formatRoReminder(task);
  const target_status = delivery_target ? 'present' : 'missing';

  return {
    // Phase 0 INTENDED payload — NOT sent. The execution_context_id /
    // thread_id fields are placeholders; in Phase 1 these will come
    // from the synthesized scheduler EC or from the task's
    // metadata.metadata.thread_id.
    status_kind: 'success',
    result_type: 'composed_response',
    execution_context_id: '<scheduler-tbd>',
    thread_id: task.metadata?.metadata?.thread_id || '<scheduler-tbd>',
    tenant_id,
    composed_response: {
      response_status: 'success',
      response_text,
      channel,
      warnings: [],
      followup_requests: [],
    },
    output_gateway_allowed: true,
    response_generation_allowed: true,
    allowed_next_stage: 'MESSAGE_OUT',
    idempotency_key,
    delivery_target,
    // Reminder-delivery telemetry (Phase 0 only — Phase 1 lives in the
    // task_reminder_deliveries ledger).
    _reminder_delivery: {
      task_id: task.id,
      due_at: task.due_at,
      due_occurrence_iso: due_iso_minute,
      delivery_key,
      target_status,
      origin_marker: task.origin_marker,
      classified_outcome: target_status === 'present' ? 'WOULD_SEND_DRY_RUN' : 'MISSING_DELIVERY_TARGET',
    },
    // Intended metadata patch (Option A) — NOT applied in Phase 0.
    _intended_metadata_patch: {
      reminder_delivery: {
        status: target_status === 'present' ? 'pending' : 'skipped_missing_target',
        last_attempt_at: new Date().toISOString(),
        delivery_attempts: 1,
        delivery_key,
        channel,
        target_status,
      }
    }
  };
}

async function main() {
  const env = loadEnv();
  const conn = env.PG_DSN || process.env.PG_DSN;
  if (!conn) throw new Error('PG_DSN not set in env or .env file');
  const client = new Client({ connectionString: conn });
  await client.connect();

  const summary = { run_at: new Date().toISOString(), tenants: [] };

  for (const tenant_id of TENANTS) {
    const candRes = await client.query(CANDIDATE_SQL, [tenant_id, 200]);
    const targetRes = await client.query(TARGET_SQL, [tenant_id]);
    const target = (targetRes.rows[0] || {});
    const intended = candRes.rows.map(t => buildIntendedMoPayload({
      task: t,
      tenant_id,
      channel: target.channel || 'telegram',
      delivery_target: target.delivery_target || null,
    }));
    summary.tenants.push({
      tenant_id,
      candidates_count: candRes.rows.length,
      target_status: target.delivery_target ? 'present' : 'missing',
      candidates: candRes.rows.map(t => ({
        task_id: t.id,
        title: t.title,
        due_at: t.due_at,
        due_type: t.due_type,
        status: t.status,
        origin_marker: t.origin_marker,
        rd_status: t.rd_status,
      })),
      intended_payloads: intended,
    });
  }

  await client.end();

  const out = resolve(__dirname, 'DRY_RUN_OUTPUT.json');
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
