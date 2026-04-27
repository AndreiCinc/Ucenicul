# Closure Report — WF-MO-01 Message Out / Output Gateway

**Date:** 2026-04-18
**Stage:** WF-MO-01
**Posture:** `closed`
**Score:** **10 / 10**
**Closed:** `true`
**Advance allowed:** `true` (terminal stage of the canonical pipeline; downstream is the live Telegram chat)
**Workflow:** `OooZdC0DgsDR6gm0` ("WF-MO-01 Message Out / Output Gateway") on `https://n8n-production-d688.up.railway.app/`

> This is the live closure of MO-01 with a real Telegram delivery. V3 sent a real
> message to the bound Telegram test chat (`5101664726`) and got back
> `message_id=536`. V2/V4/V5/V6 fail-closed paths were exercised end-to-end. V7
> DB drift probe across `messages`, `threads`, `execution_contexts` is zero
> (only `outbound_delivery_ledger_claude_mcp` recorded the V3 send, then was
> cleaned up).

## 1. Why 10/10

- Live import of the 18-node MO-01 body (manualTrigger + executeWorkflowTrigger + 5 Postgres + 1 Telegram + 7 Code + 3 Switch).
- All 5 Postgres nodes credential-bound to `qpZLzVs17Zy7HCFB` ("Postgres account").
- Telegram node credential-bound to `Z0ovMbkHwXEC8ZtF` ("Telegram account") with `chat_id=5101664726`.
- Pack ships `pythonCode` Code-node bodies; Railway n8n has **no Python runner** (V2 exec #755 returned `"Python runner unavailable: Python 3 is missing from this system"`). All 7 Code nodes were translated faithfully from `wf-mo-01-pack/workflows/scripts/mo/mo_logic.py` to JavaScript and patched live (see §6).
- Pack ships `n8n-nodes-base.switch` v3.2 nodes without `options.fallbackOutput`, so unmatched items are dropped instead of routing to output[1]. The 3 switches were patched live to add `options.fallbackOutput: "extra"` (see §6).
- Pack assumes `tenants.telegram_chat_id` and a `messages.source` column that don't exist in this DB. Live channel-delivery context query was rewritten to read `(metadata->>'telegram_chat_id')`. Outbound logging was redirected to `public.outbound_delivery_ledger_claude_mcp` (the fallback ledger from `wf-mo-01-pack/workflows/sql/mo/07_create_fallback_delivery_ledger_claude_mcp.sql`). Replay-guard query was rewritten to probe the same fallback ledger by `(tenant_id, idempotency_key)` (see §6).
- V2 fail-closed (INVALID_MESSAGE_OUT_INPUT). V3 happy Telegram send. V4 UNSUPPORTED_CHANNEL. V5 LINEAGE_MISMATCH. V6 REPLAY_BLOCKED. V7 DB drift = 0 outside the intended ledger.
- Validate-node jsCode restored byte-identical to the canonical JS baseline saved as `tools/n8n-patch/mo-test-harness/original-validate-jsCode.js` (sha256:b74f5e5df1c1586d…, 2375/2375 chars).
- DB fixtures used during the sweep cleaned up (tenant `44…`, thread `55…`, execution_context `33…`, ledger row `53d8…`) — final counts equal pre-test baselines.
- Every PUT/patch hashed and snapshot-paired in `tools/n8n-patch/.audit.jsonl`.

## 2. Scorecard

| Dimension | Result |
|---|---|
| `source_pack_complete` | true |
| `script_verified` | true (mo_logic.py is the semantic source of truth; JS bodies are faithful translations) |
| `sql_contract_verified` | true (lineage + replay enforced in `MO_Verify_Lineage_And_Replay`; channel context and outbound ledger queries verified live) |
| `shell_static_verified` | true (18 nodes / 18 main edges / 2 triggers / 3 switches / 5 Postgres / 1 Telegram / 7 Code) |
| `db_verified` | true (V7 baseline → post-V3 → post-cleanup zero drift on `messages`, `threads`, `execution_contexts`, `tenants`) |
| `live_workflow_verified` | true (GET-after-PUT byte-identity check on validate jsCode) |
| `runtime_execution_verified` | **true** (exec 757, 758, 759, 760, 761) |
| `live_provider_delivery_verified` | **true** (Telegram `message_id=536` returned by `MO_Send_Channel_PLACEHOLDER`, exec #758) |
| `post_test_db_drift_verified` | **true** (post-cleanup row counts match pre-test baselines exactly) |
| `closed` | **true** |
| `advance_allowed` | **true** |

## 3. Live execution proof table

| V | Execution | Result | Terminal node | Notes |
|---|---|---|---|---|
| V1 | n/a | shell static | — | 18/18/2/3/5/1/7 match pack post-translation; `availableInMCP=true` |
| V2 | **757** | `error` | `MO_Return_Error` | input `{}` → validate `_valid=false`, code=`INVALID_MESSAGE_OUT_INPUT`, missing 10 top-level fields; routed via `MO_Route_Valid` fallback (output[1]) |
| V3 | **758** | `success` | `MO_Return_Result` | **Live Telegram send.** `message_id=536`, chat `5101664726`, `provider_message_ref=telegram:5101664726:536`, `applied_write_classes=[provider_delivery, outbound_message_log]`, `response_text_hash=0528424d0e9fe1d9`, `delivery_request_id=deliver:33333333…:44f7ee522710`; ledger row `53d8335f-38d1-48b3-bd3f-39896a265b61` written |
| V4 | **759** | `error` | `MO_Return_Context_Error` | `channel=whatsapp` → `UNSUPPORTED_CHANNEL` in `MO_Verify_Lineage_And_Replay` (only `telegram` is in SUPPORTED set) |
| V5 | **760** | `error` | `MO_Return_Context_Error` | `thread_id=99…` vs execution_context row `thread_id=55…` → `LINEAGE_MISMATCH` with `row_thread_id=55…` in details |
| V6 | **761** | `error` | `MO_Return_Context_Error` | replays V3's `idempotency_key=mo-v3-test-20260418-104500-001`; `MO_Replay_Guard_Probe` returned the V3 ledger row → `REPLAY_BLOCKED` |
| V7 | drift probe | zero drift | — | see §4 |

V3 final envelope (exec #758) — verbatim from `data.resultData.runData.MO_Return_Result`:

```json
{
  "status_kind": "success",
  "result_type": "message_out_result",
  "execution_context_id": "33333333-3333-3333-3333-333333333333",
  "thread_id": "55555555-5555-5555-5555-555555555555",
  "tenant_id": "44444444-4444-4444-4444-444444444444",
  "message_out_result": {
    "status": "success",
    "channel": "telegram",
    "delivery_target": "5101664726",
    "provider_message_ref": "telegram:5101664726:536",
    "applied_write_classes": ["provider_delivery", "outbound_message_log"],
    "blocked_write_classes": [],
    "warning_count": 0,
    "warnings": [],
    "followup_count": 0,
    "followup_requests": [],
    "response_status": "success",
    "response_text_hash": "0528424d0e9fe1d9"
  },
  "terminal_stage": true,
  "message_out_completed": true,
  "provider_delivery_attempted": true,
  "idempotency_key": "mo-v3-test-20260418-104500-001"
}
```

## 4. V7 — DB drift discipline

Pre-test baseline (taken before the V-sweep, `2026-04-18 ~11:14Z`):

| Table | Pre | Post-V6 | Post-cleanup |
|---|---:|---:|---:|
| `messages` | 6 | 6 | 6 |
| `threads` | 7 | 8 (`55…` fixture) | 7 |
| `execution_contexts` | 2 | 3 (`33…` fixture) | 2 |
| `tenants` | 7 | 8 (`44…` fixture) | 7 |
| `outbound_delivery_ledger_claude_mcp` | 0 | 1 (V3 delivery) | 0 |

The only intended live writes during the sweep were:
1. **Telegram provider** — one outgoing message (chat `5101664726`, `message_id=536`).
2. **`outbound_delivery_ledger_claude_mcp`** — one INSERT keyed by `(tenant_id, idempotency_key)`, returning `id=53d8335f-38d1-48b3-bd3f-39896a265b61, delivery_status=delivered`.

No write touched `messages`, `threads`, `execution_contexts`, or `tenants`.
Cleanup deleted the four fixture rows and the ledger row, restoring all counts to baseline.

## 5. Live shell match

```
nodes:        18  (executeWorkflowTrigger=1, manualTrigger=1, code=7, postgres=5, telegram=1, switch=3)
main_edges:   18
triggers:     2 (manual + executeWorkflow)
switches:     3 (MO_Route_Valid, MO_Route_Context_Ready, MO_Route_Channel)
postgres:     5 (Load_Execution_Context, Load_Thread_Context, Load_Channel_Delivery_Context, Replay_Guard_Probe, Log_Outbound_Message)
telegram:     1 (MO_Send_Channel_PLACEHOLDER, chat_id=5101664726)
code:         7 (Validate, Verify, Build_Request, Build_Result, Return_Result, Return_Error, Return_Context_Error)
```

Execution order matches the pack DAG. All 5 Postgres nodes use the project credential `qpZLzVs17Zy7HCFB`. Telegram uses `Z0ovMbkHwXEC8ZtF`.

## 6. Pack bugs found and patched live

### 6.1 Python runner unavailable on Railway

**Severity:** blocking
**Where:** all 7 Code nodes (`MO_Validate_Composed_Response_Input`, `MO_Verify_Lineage_And_Replay`, `MO_Build_Delivery_Request`, `MO_Build_Delivery_Result`, `MO_Return_Result`, `MO_Return_Error`, `MO_Return_Context_Error`).
**Symptom:** V2 exec #755 returned `{"executionId":"755","status":"error","error":"Python runner unavailable: Python 3 is missing from this system"}`.
**Pack assumption:** Code nodes ship as `language: python` with `pythonCode` bodies translated from `wf-mo-01-pack/workflows/scripts/mo/mo_logic.py`.
**Live reality:** Railway n8n image has no Python 3 runtime. Same issue surfaced and was already resolved in WF-RC-01 closure (RC-01 nodes were authored as `javaScript`).
**Fix applied live:** translated all 7 Code-node bodies from Python to JavaScript. `mo_logic.py` was treated as the semantic source of truth — the JS bodies preserve the canonical envelopes (canonicalError shape, idempotency_key handling, response_text_hash via SHA-256, delivery_request_id format, applied/blocked/warnings semantics).
**JS sources of record (in repo):**
- `tools/n8n-patch/mo-test-harness/build-code-params-js.py` — canonical generator (also the source for the pack update; see §9).
- `tools/n8n-patch/mo-test-harness/original-validate-jsCode.js` — saved baseline of the live validate body for restore (sha256:b74f5e5df1c1586d…, 2375 chars).

### 6.2 Switch v3.2 missing `options.fallbackOutput`

**Severity:** blocking
**Where:** `MO_Route_Valid`, `MO_Route_Context_Ready`, `MO_Route_Channel`.
**Symptom:** V2 exec #756 routed `_valid=false` items to nowhere — switch returned `main:[[]]` instead of emitting on output[1] (which connects to `MO_Return_Error`).
**Pack assumption:** A single rule on output[0] implicitly sends unmatched items to output[1].
**Live reality:** n8n switch v3.2 default for unmatched items is "drop". Output[1] is reachable only when `options.fallbackOutput` is set (`"extra"` adds an explicit fallback output after the rules).
**Fix applied live:** patched all 3 switches with `options: { fallbackOutput: "extra" }`. Verified via V2 exec #757 that the fallback path now reaches `MO_Return_Error`.
**Note:** This is the *exact same* class of bug as the RC-01 pack bug (`operator.equals(true)` vs `operator.true(singleValue)`), in the same switch v3.2 family. The MO-01 pack uses the correct boolean operator but is missing the fallback-output declaration.

### 6.3 Schema assumptions that don't match the live DB

**Severity:** blocking (DB-side)
**Where:** `MO_Load_Channel_Delivery_Context`, `MO_Log_Outbound_Message`, `MO_Replay_Guard_Probe`.
**Pack assumption:**
- `tenants.telegram_chat_id` column exists.
- `messages` table has a `source` column for marking outbound rows.
- A canonical `outbound_message_log` (or equivalent) table exists.
**Live reality:** None of these are present. `tenants` has a JSONB `metadata`. `messages` has `source_message_ref` (not `source`) and a NOT NULL `organization_id`. There is no `outbound_message_log`.
**Fixes applied live:**
- `MO_Load_Channel_Delivery_Context` query rewritten to `SELECT id AS tenant_id, 'telegram' AS channel, (metadata->>'telegram_chat_id')::text AS delivery_target FROM tenants WHERE id = $1`.
- `MO_Log_Outbound_Message` redirected to `public.outbound_delivery_ledger_claude_mcp` (the fallback ledger, applied from `wf-mo-01-pack/workflows/sql/mo/07_create_fallback_delivery_ledger_claude_mcp.sql`) with INSERT keyed by `(tenant_id, idempotency_key)` and a unique index for replay enforcement.
- `MO_Replay_Guard_Probe` rewritten to probe the same fallback ledger by `(tenant_id, idempotency_key)` instead of content-match on `messages`.

## 7. Audit trail

```
$ n8n-patch audit --tail 12
```

Key entries (all hashed with sha256 over PUT body, snapshot-paired):

- `OooZdC0DgsDR6gm0_post-import-20260418T1040Z.json` — initial 18-node import.
- `OooZdC0DgsDR6gm0_post-patchall-20260418T1044Z.json` — Postgres-credential bind + query rewrites for live schema.
- `OooZdC0DgsDR6gm0_pre-js-translate-20260418T1415Z.json` — pre-translation snapshot (Python bodies).
- `OooZdC0DgsDR6gm0_post-js-translate-20260418T1415Z.json` — all 7 Code nodes converted to javaScript.
- `OooZdC0DgsDR6gm0_post-restore-20260418T1420Z.json` — final state, validate body restored to canonical JS baseline.

## 8. Final live state

- Workflow `OooZdC0DgsDR6gm0` is **active**.
- All 7 Code nodes are `language: javaScript`. All 3 switches have `options.fallbackOutput: extra`.
- All 5 Postgres nodes are bound to `qpZLzVs17Zy7HCFB`. The Telegram node is bound to `Z0ovMbkHwXEC8ZtF`.
- `availableInMCP: true`.
- DB tables touched during the sweep are all back at their pre-test baseline counts.

## 9. Outstanding follow-ups (post-closure, non-blocking)

1. **Update canonical pack JSON** (`wf-mo-01-pack/workflows/WF-MO-01_Message_Out.json` and equivalents) so all 7 Code nodes are `javaScript` with the bodies generated by `tools/n8n-patch/mo-test-harness/build-code-params-js.py`, and so all 3 switches carry `options.fallbackOutput: "extra"`.
2. **Document pack bugs** in `wf-mo-01-pack/workflows/WF-MO-01_PACK_BUGS.md` (Python runner / switch fallback / schema assumptions) — same shape as `wf-rc-01-pack/workflows/WF-RC-01_PACK_BUG_SWITCH_V32.md`.
3. **Pack the SQL drift** under `wf-mo-01-pack/workflows/sql/mo/`: the rewritten queries for channel context, replay probe, and outbound log (against `outbound_delivery_ledger_claude_mcp`) so a greenfield re-deploy is reproducible.
4. **Decide on canonical outbound log table.** The fallback ledger was used because no canonical exists; if the canonical pipeline is supposed to write into `messages` with `direction='out'`, the schema needs the `direction` column added (or the contract needs to be updated to use the ledger).
