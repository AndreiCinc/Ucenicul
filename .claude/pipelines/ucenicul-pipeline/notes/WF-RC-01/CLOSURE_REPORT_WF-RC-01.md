# Closure Report — WF-RC-01 Response Composer

**Date:** 2026-04-18
**Stage:** WF-RC-01
**Posture:** `closed`
**Score:** **10 / 10**
**Closed:** `true`
**Advance allowed:** `true` (handoff to MESSAGE_OUT unblocked; downstream wiring out of scope for this stage)
**Workflow:** `TClXgmO8H8zsSwMb` ("WF-RC-01 Response Composer") on `https://n8n-production-d688.up.railway.app/`

> This report supersedes the earlier `NOT_CLOSED` version of 2026-04-18 (preserved
> in §10 below). The earlier pass had identified the live state and prepared a
> bound artefact but could not write to the host; this pass executed the write
> and the live V-sweep using `n8n-patch` with a working JWT.

## 1. Why 10/10

The Ucenicul rule for closure is: **saved live proof of V1–V6 in the n8n workspace, with execution IDs, envelope outputs, and post-test DB drift = 0.** WF-RC-01 now has all six:

- Live import confirmed (4-node stub → 14-node RC body), credential-bound to project Postgres credential (`qpZLzVs17Zy7HCFB` "Postgres account").
- Pack switch-routing bug found and patched live (see §6); both routes fail-closed under negative inputs.
- V1 shell match. V2 fail-closed. V3 happy. V3b partial. V4 warnings+followups. V5 lineage mismatch. V6 zero DB drift.
- Validate-node jsCode restored to pack original (byte-identical, 2032/2032).
- DB fixtures used during the sweep cleaned up (`33…` execution_context and `55…` thread deleted).
- Every PUT/patch hashed and snapshot-paired in `tools/n8n-patch/.audit.jsonl`.

## 2. Scorecard

| Dimension | Result |
|---|---|
| `source_pack_complete` | true |
| `script_verified` | true (650/650 off-node mirror — `workflows/tests/rc/test_families.py`) |
| `sql_contract_verified` | true (lineage check via `RC_Verify_Lineage` on real DB rows) |
| `shell_static_verified` | true (14 nodes / 13 main edges / 2 triggers / 2 switches / 2 Postgres / 4 Code / 4 Set) |
| `db_verified` | true (V6 baseline → post-V2 → post-V5 zero drift on `execution_contexts`, `threads`, `messages`) |
| `live_workflow_verified` | true (GET-after-PUT byte-identity check on validate jsCode) |
| `runtime_execution_verified` | **true** (exec 750, 751, 752, 753, 754) |
| `post_test_db_drift_verified` | **true** (max(updated_at) timestamps pre-date the test window) |
| `closed` | **true** |
| `advance_allowed` | **true** |

## 3. Live execution proof table

| V | Execution | Result | Terminal node | Notes |
|---|---|---|---|---|
| V1 | n/a | shell static | — | 14/13/2/2/2 match pack; `availableInMCP=true` |
| V2 | **750** | `error` | `RC_Return_Error` | input `{}` → `_valid=false` → `RC_Route_Valid` fallback; supersedes #749 (ran on the broken pack switch and was the discovery exec) |
| V3 | **751** | `success` | `RC_Return_Result` | `status_kind=success`, `output_gateway_allowed=true`, `allowed_next_stage=MESSAGE_OUT`, `idempotency_key` present |
| V3b | **752** | `success` | `RC_Return_Result` | `response_status=partial`, `warning_count=1`, RO text contains "Atenționări: MEM_BLOCKED…" |
| V4 | **753** | `success` | `RC_Return_Result` | `warning_count=2`, `followup_count=2`, RO text contains both "Atenționări:" and "Mai am nevoie de clarificări pentru:" |
| V5 | **754** | `error` | `RC_Return_Context_Error` | `LINEAGE_MISMATCH` (`thread_id=99…` vs row `55…`); routed via `RC_Route_Context_Ready` fallback |
| V6 | drift probe | zero drift | — | see §4 |

V4 final RO envelope (exec #753) — verbatim from `data.resultData.runData.RC_Build_Output_Envelope`:

> Am pregătit răspunsul final pe baza rezultatului confirmat.\nAm procesat cererea ta.\nAcțiuni confirmate: draft_message.\nAplicat: starea execuției.\nBlocat sau rămas neaplicat: scriere de eveniment de domeniu.\nContext util: conversația a fost salvată.\nAtenționări: CAL_UNREACHABLE: Sincronizarea calendar a eșuat temporar.; atenție: timpul estimat poate varia.\nMai am nevoie de clarificări pentru: NEED_DATE: Care e data limită exactă?; NEED_RECIPIENT: Cui trebuie trimis?.

## 4. V6 read-only discipline

Probe across all 3 RC-touched tables, taken 2026-04-18 ~10:23Z (after V5):

| Table | rows | max(timestamp) | inside test window 10:14–10:22? |
|---|---|---|---|
| `execution_contexts` | 3 | 2026-04-18T07:51:41.013Z (`updated_at`) | **no** |
| `threads` | 8 | 2026-04-18T07:51:40.968Z (`last_activity_at`) | **no** |
| `messages` | 6 | 2026-04-18T01:00:06.923Z (`created_at`) | **no** |

RC-01 emitted no writes during the V-sweep. Read-only contract upheld.

## 5. Credential binding

Both Postgres reads bound to:
`{ id: "qpZLzVs17Zy7HCFB", name: "Postgres account" }` — verified by GET-after-PUT and by V3-V5 returning real fixture rows.

## 6. Pack bug discovered and patched live

`WF-RC-01_Response_Composer.json` (canonical pack) declares both switches with
`operator.equals(true)` against an expression `={{ $json._valid }}`/`={{ $json._context_ready }}` under `typeValidation:"strict"`. On the live n8n switch v3.2 this routes `false` items to the **matched** output instead of the fallback — V2 exec **#749** demonstrated this by sending an invalid input through the happy path to `RC_Return_Result`.

Fix applied live (both `RC_Route_Valid` and `RC_Route_Context_Ready`):

```json
"operator": { "type": "boolean", "operation": "true", "singleValue": true }
```

After the fix, V2 re-ran as **#750** and terminated correctly at `RC_Return_Error`. Documented in `wf-rc-01-pack/workflows/WF-RC-01_PACK_BUG_SWITCH_V32.md`. **The pack JSON must be updated** before the next greenfield deploy — live is correct, pack is not.

## 7. Handoff continuity (RC → MESSAGE_OUT)

RC-01 is the sole emitter of `composed_response` and is the only stage that flips `output_gateway_allowed=true` with `allowed_next_stage="MESSAGE_OUT"`. The contract upstream (SU-01 → RC-01) and downstream (RC-01 → MESSAGE_OUT) is now in matched form: SU-01's `state_update_result` envelope is the exact input shape RC-01's validator expects.

## 8. Artefacts

Snapshots (`tools/n8n-patch/snapshots/`):
- `TClXgmO8H8zsSwMb_pre-rc01-replace-20260418T100855Z.json` — pre (4-node stub)
- `TClXgmO8H8zsSwMb_post-rc01-replace-20260418T100928Z.json` — post-replace
- `TClXgmO8H8zsSwMb_post-rc01-final-20260418T1023Z.json` — final (after restore of validate jsCode)

Test harness (`tools/n8n-patch/rc-test-harness/`):
- `V2.fixture.json`, `V3.fixture.json`, `V3b.fixture.json`, `V4.fixture.json`, `V5.fixture.json`
- `original-validate-jsCode.js` (pack original; restored on live)
- `inject-fixture.mjs`, `switch-fix-valid.json`, `switch-fix-context.json`

Audit trail: `tools/n8n-patch/.audit.jsonl` — append-only with before/after hashes and snapshot paths per mutation.

Pack bug note: `wf-rc-01-pack/workflows/WF-RC-01_PACK_BUG_SWITCH_V32.md`.

Operational summary: `WF-RC-01_CLOSURE_REPORT.md` (root-level, this session's write-up).

## 9. Caveats / non-blockers

- DB fixtures `execution_contexts.id=33…` and `threads.id=55…` have been **deleted** at closure. Re-running V2-V5 requires re-seeding via `wf-rc-01-pack/workflows/sql/rc/10_fixtures.sql` plus the `trigger_message_id` adjustment.
- MESSAGE_OUT wiring downstream is out of scope and not touched.
- Pack JSON divergence on switches is intentional and documented (§6); live is the source of truth.

## 10. Provenance — earlier `NOT_CLOSED` pass (2026-04-18, prior session)

The earlier closure attempt correctly identified the 4-node stub state and
prepared a bound artefact (`snapshots/WF-RC-01_Response_Composer_bound.json`,
credential bound to `z9nKgToNWvIW7P8f` "Postgres account 2") but could not
write to the host because the sandbox proxy refused egress and the available
MCP write paths were either surgical-only or rejected the live `settings`
shape. That report's closure was honest at the time: `NOT_CLOSED`.

This session resolved both blockers:
- Used `n8n-patch` CLI from a context with working egress and a freshly
  pasted full JWT (the .env had previously been truncated to a 1-dot key).
- Rebound credentials to `qpZLzVs17Zy7HCFB` "Postgres account" — the cred
  actually present and authorised on the live workflow's Postgres reads.
- Filtered `settings` through the n8n-patch whitelist on PUT to avoid the
  earlier 400 from `binaryMode`/`timeSavedMode`/`callerPolicy`.
- Discovered and patched the pack switch-routing bug (§6) before declaring
  any of V2-V5 PASS.

The `BUILD_REPORT_WF-RC-01.md` and `FIX_LOG_WF-RC-01.md` from prior cycles
are unchanged by this closure and remain valid context.
