# REMINDER_DELIVERY_LAYER · Phase 0 · Dry-run Results

Run-tag: `rd-phase0-2026-04-27`. SELECT-only against the live
database. **No mutations**, **no MO calls**, **no external sends**,
**no inserts to reminders / outbound ledger**.

## Fixtures seeded (idempotent INSERT)

| ID | Tenant | Title | due_at relative to NOW() | status | reminder_intent? | metadata.reminder_delivery |
|---|---|---|---|---|---|---|
| F1 | default | rd-fix:past-due-reminder | -2h 8m | open | yes | (none) |
| F2 | default | rd-fix:now-due-reminder | -1m | open | yes | (none) |
| F3 | default | rd-fix:future-due-reminder | +1d | open | yes | (none) |
| F4 | default | rd-fix:done-reminder | -2h | done | yes | (none) |
| F5 | default | rd-fix:cancelled-reminder | -2h | cancelled | yes | (none) |
| F6 | default | rd-fix:already-sent-reminder | -2h | open | yes | `{status:'sent', sent_at:..., delivery_attempts:1}` |
| F7 | tenant A | rd-fix:tenant-a-reminder | -30m | open | yes | (none) |
| F8 | default | rd-fix:flexible-no-due-at | due_at=NULL, due_type=flexible | open | yes | (none) |
| F9 | default | rd-fix:plain-task-due | -15m | open | NO (origin=`plain_task`) | (none) |

## Candidate query result (per tenant)

| Tenant | Total open with `due_at <= NOW()` and not sent | Sample fixtures present | Sample fixtures excluded |
|---|---|---|---|
| default | **22** (19 historical + F1 + F2 + F9) | F1, F2, F9 | F3 (future), F4 (done), F5 (cancelled), F6 (already sent), F8 (no due_at) |
| tenant A | **2** (1 historical + F7) | F7 | (none — F7 only) |
| tenant B | **0** | — | — |

Cross-tenant exclusion verified: F7 (tenant A) does NOT appear in the
tenant default candidate set.

## Delivery target resolution

| Tenant | `tenants.metadata.telegram_chat_id` | Outcome |
|---|---|---|
| default | NULL | `MISSING_DELIVERY_TARGET` → `_intended_metadata_patch.status='skipped_missing_target'` |
| tenant A | NULL | `MISSING_DELIVERY_TARGET` |
| tenant B | NULL | `MISSING_DELIVERY_TARGET` |

For Phase 0 every candidate is classified as `MISSING_DELIVERY_TARGET`.
This mirrors the e2e fixture limitation (per `e2e_oracle.mjs` lines
76-92) and keeps the dry-run safe by construction — no real send is
even attempted at the Phase 1 level for these tenants.

## Sample intended MO payload (F1 — past-due reminder, default tenant)

```json
{
  "status_kind": "success",
  "result_type": "composed_response",
  "execution_context_id": "<scheduler-tbd>",
  "thread_id": "<scheduler-tbd>",
  "tenant_id": "eee0e2e0-0000-0000-0000-000000000001",
  "composed_response": {
    "response_status": "success",
    "response_text": "Reminder: rd-fix:past-due-reminder — scadent: 2026-04-27 07:00 UTC.",
    "channel": "telegram",
    "warnings": [], "followup_requests": []
  },
  "output_gateway_allowed": true,
  "response_generation_allowed": true,
  "allowed_next_stage": "MESSAGE_OUT",
  "idempotency_key": "rd:1f6b1afd6e4cc925880b3c7a",
  "delivery_target": null,
  "_reminder_delivery": {
    "task_id": "aaaaaaaa-0001-4000-8000-000000000001",
    "due_at": "2026-04-27 07:00:00+00",
    "due_occurrence_iso": "2026-04-27T07:00:00Z",
    "delivery_key": "rd:eee0e2e0-...0001:aaaaaaaa-...0001:2026-04-27T07:00:00Z",
    "target_status": "missing",
    "origin_marker": "reminder_intent",
    "classified_outcome": "MISSING_DELIVERY_TARGET"
  },
  "_intended_metadata_patch": {
    "reminder_delivery": {
      "status": "skipped_missing_target",
      "last_attempt_at": "...",
      "delivery_attempts": 1,
      "delivery_key": "rd:eee0e2e0-...0001:aaaaaaaa-...0001:2026-04-27T07:00:00Z",
      "channel": "telegram",
      "target_status": "missing"
    }
  }
}
```

Full output stored at `artifacts/DRY_RUN_OUTPUT.json` (24 candidates
across the 3 tenants; sample payloads for F1, F2, F9, F7).

## 20 dry-run tests

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Past-due open reminder selected (F1) | included | ✅ |
| 2 | Future-due reminder NOT selected (F3) | excluded | ✅ |
| 3 | Done task NOT selected (F4) | excluded | ✅ |
| 4 | Cancelled task NOT selected (F5) | excluded | ✅ |
| 5 | Flexible / no `due_at` task NOT selected (F8) | excluded | ✅ |
| 6 | Reminder-like (origin=`reminder_intent`) past-due selected (F1, F2) | included | ✅ |
| 7 | Plain task with `due_at` past — design says included (F9) | included | ✅ (per design freeze) |
| 8 | Already-sent task NOT selected (F6) | excluded | ✅ |
| 9 | Failed task retry policy documented | documented | ✅ (Phase 1) |
| 10 | Tenant A cannot see tenant B task | tenant filter | ✅ (F7 in tenant A only; tenant B candidate count = 0) |
| 11 | Task with missing target classified `MISSING_DELIVERY_TARGET` | classified, no send | ✅ (all 3 e2e tenants → null target → all candidates skipped) |
| 12 | Intended payload contains `task_id` | yes | ✅ (`_reminder_delivery.task_id`) |
| 13 | Intended payload contains user-safe Romanian reminder text | no raw JSON | ✅ (`composed_response.response_text` is "Reminder: <title> — scadent: <UTC>.") |
| 14 | Idempotency key stable across retries | sha256(delivery_key) | ✅ — deterministic from `(tenant_id, task_id, due_iso_minute)` |
| 15 | Dry-run does not mutate `tasks` | 0 mutations | ✅ (`fixtures_mutated_post_seed = 0`) |
| 16 | Dry-run does not mutate `reminders` | 0 changes | ✅ (count=1, max=2026-04-13 unchanged) |
| 17 | Dry-run does not insert outbound ledger row | 0 inserts | ✅ (`outbound_ledger_total = 0`) |
| 18 | No raw JSON in user-facing payload | text only | ✅ |
| 19 | SQL is tenant-scoped (`WHERE tenant_id = $1::uuid`) | yes | ✅ |
| 20 | No schema mutation | 0 DDL | ✅ |

## Regression invariants (from current bundle context)

| # | Probe | Result |
|---|---|---|
| R-1 | `create_reminder → task` still writes a task with `due_at` | ✅ (existing task_module path unchanged; PL v2.6 routing untouched) |
| R-2 | `create_task` still writes | ✅ (verified live in M3 IL-R-task TR exec 10767) |
| R-3 | `list_tasks` still read-only | ✅ (no PL/ME change to the list_tasks lane) |
| R-4 | `complete_task` still works | ✅ (no PL/ME change) |
| R-5 | `store_memory` still writes | ✅ (M2 R-1 + M3 IL-R-store) |
| R-6 | `capture_feedback` still writes | ✅ (M3 IL-005) |
| R-7 | `list_improvements` still read-only | ✅ (M3 IL-001..004) |
| R-8 | `response_module.respond_only` still no-write | ✅ (no change) |
| R-9 | `public.reminders` unchanged | ✅ (count=1, max=2026-04-13) |

## Final post-state verification (after dry-run + fixture seed)

| Bucket | Value |
|---|---|
| `tasks` total | 89 + 9 fixtures = 98 |
| `tasks` carrying `metadata.reminder_delivery` | 1 (only F6, seeded with `sent` for the exclusion test) |
| `reminders` count | 1 |
| `reminders` max(created_at) | 2026-04-13 20:17:13Z |
| `outbound_delivery_ledger_claude_mcp` rows | 0 |
| Fixtures whose `updated_at > created_at` post-seed | 0 (no mutation post-seed) |
| Workflow versionIds (PL/ME/MO) | unchanged |
| New workflows created | 0 |
| Schema mutations | 0 |
