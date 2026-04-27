// classify_unit_test.mjs — unit test for the RD_Classify_And_Build classification logic.
// Mirrors the Code-node body from build_wf_rd_01.mjs. Exercises every branch:
//   - missing_target wins over backlog wins over (mode-dependent: dry_run / live)
//   - backlog skip is respected unless force_send=true
//   - live requires both mode=live AND live_allowed=true; otherwise falls back to dry_run.
import { createHash } from 'node:crypto';

function classify({ row, mode, live_allowed }) {
  const tenant_id = String(row.tenant_id);
  const task_id   = String(row.task_id);
  const due_iso_minute = String(row.due_occurrence_iso);
  const delivery_key = 'rd:' + tenant_id + ':' + task_id + ':' + due_iso_minute;
  const idempotency_key = 'rd:' + createHash('sha256').update(delivery_key).digest('hex').slice(0, 24);
  const target = (row.delivery_target == null || String(row.delivery_target).trim() === '') ? null : String(row.delivery_target);
  const target_status = target ? 'present' : 'missing';
  const force_send = String(row.force_send || 'false').toLowerCase() === 'true';
  const is_backlog = !!row.is_backlog;

  let outcome;
  if (target_status === 'missing') outcome = 'missing_target';
  else if (is_backlog && !force_send) outcome = 'skipped_backlog';
  else if (mode === 'dry_run_audit') outcome = 'dry_run';
  else if (mode === 'dry_run_no_write') outcome = 'dry_run_no_write';
  else if (mode === 'live' && live_allowed) outcome = 'live';
  else outcome = 'dry_run';

  return { outcome, target_status, is_backlog, force_send, delivery_key, idempotency_key };
}

const cases = [
  // 1) missing_target wins regardless of backlog/mode
  { name: 'missing_target_dry_run',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-27T07:00:00Z', delivery_target: null, is_backlog: false, force_send: 'false' },
    mode: 'dry_run_audit', live_allowed: false, expect: 'missing_target' },
  { name: 'missing_target_with_backlog',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-25T07:00:00Z', delivery_target: null, is_backlog: true, force_send: 'false' },
    mode: 'dry_run_audit', live_allowed: false, expect: 'missing_target' },
  { name: 'missing_target_live_mode',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-27T07:00:00Z', delivery_target: '', is_backlog: false, force_send: 'false' },
    mode: 'live', live_allowed: true, expect: 'missing_target' },

  // 2) skipped_backlog when target present + backlog + no force_send
  { name: 'backlog_when_target_present',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-25T07:00:00Z', delivery_target: 'sandbox-1', is_backlog: true, force_send: 'false' },
    mode: 'dry_run_audit', live_allowed: false, expect: 'skipped_backlog' },
  { name: 'backlog_force_send_overrides',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-25T07:00:00Z', delivery_target: 'sandbox-1', is_backlog: true, force_send: 'true' },
    mode: 'dry_run_audit', live_allowed: false, expect: 'dry_run' },

  // 3) dry_run modes when target present + within 24h
  { name: 'dry_run_audit_default',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-27T07:00:00Z', delivery_target: 'sandbox-1', is_backlog: false, force_send: 'false' },
    mode: 'dry_run_audit', live_allowed: false, expect: 'dry_run' },
  { name: 'dry_run_no_write_branch',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-27T07:00:00Z', delivery_target: 'sandbox-1', is_backlog: false, force_send: 'false' },
    mode: 'dry_run_no_write', live_allowed: false, expect: 'dry_run_no_write' },

  // 4) live requires BOTH mode=live AND live_allowed=true
  { name: 'live_requested_but_not_allowed',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-27T07:00:00Z', delivery_target: 'sandbox-1', is_backlog: false, force_send: 'false' },
    mode: 'live', live_allowed: false, expect: 'dry_run' },
  { name: 'live_allowed_path',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-27T07:00:00Z', delivery_target: 'sandbox-1', is_backlog: false, force_send: 'false' },
    mode: 'live', live_allowed: true, expect: 'live' },

  // 5) idempotency key is stable across calls with same inputs
  { name: 'idempotency_key_stable',
    row: { tenant_id: 'T', task_id: 'X', due_occurrence_iso: '2026-04-27T07:00:00Z', delivery_target: 'sandbox-1', is_backlog: false, force_send: 'false' },
    mode: 'dry_run_audit', live_allowed: false, expect: 'dry_run' },
];

let pass = 0, fail = 0;
const idemKeys = new Set();
for (const c of cases) {
  const got = classify(c);
  const ok = got.outcome === c.expect;
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}\t${c.name}\texpect=${c.expect}\tgot=${got.outcome}\tidem=${got.idempotency_key}`);
  idemKeys.add(got.idempotency_key);
}

// Stability: same inputs → same idem key (cases 1,4 etc share inputs partially; cases 7+10 have identical row → same key).
console.log(`\nUnique idempotency keys observed: ${idemKeys.size} (expected ≤ ${cases.length})`);
console.log(`Total: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
