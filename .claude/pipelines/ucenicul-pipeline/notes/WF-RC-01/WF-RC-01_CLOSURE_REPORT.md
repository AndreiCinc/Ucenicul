# WF-RC-01 — Response Composer: live reconciliation closure report

Workflow: **WF-RC-01 Response Composer** (`TClXgmO8H8zsSwMb`)
Instance: `https://n8n-production-d688.up.railway.app/`
Date: 2026-04-18
Operator: autonomous patch via `n8n-patch` + n8n MCP + postgres MCP

---

## 1. Diff summary (live vs. pack)

Pre-state was a 4-node stub (manual trigger + three placeholder AI Agent nodes). Post-state matches the canonical 14-node WF-RC-01 pack:

- 14 nodes / 13 main edges / 2 triggers (Webhook `RC_Input`, manual `RC_Manual_Test_Trigger`) / 2 switches (`RC_Route_Valid`, `RC_Route_Context_Ready`) / 2 Postgres reads (`RC_Load_Execution_Context`, `RC_Load_Thread_Context`) / 4 Code nodes (Validate, Verify, Build_Composition_Input, Compose_Response) / 2 Set nodes (Build_Output_Envelope + Return_Result) / 2 error terminals (Return_Error, Return_Context_Error).
- Connection map matches `WF-RC-01_CONNECTION_MAP.md` 1:1.
- `settings = { executionOrder: "v1", availableInMCP: true }`.

## 2. Exact changes made live

1. `replace` full body with pack-aligned 14-node JSON (`snapshots/..._pre-rc01-replace-20260418T100855Z.json` → `..._post-rc01-replace-20260418T100928Z.json`).
2. Bound real Postgres credential `{ id: "qpZLzVs17Zy7HCFB", name: "Postgres account" }` on both SELECT nodes.
3. Fixed pack switch-routing bug on both switches: `operator.equals(true)` → `operator.true(singleValue)` (see `wf-rc-01-pack/workflows/WF-RC-01_PACK_BUG_SWITCH_V32.md`).
4. During verification: iterative `patch-node` on `RC_Validate_State_Update_Input.jsCode` to inject fixtures V2–V5 (no other node ever patched during tests).
5. Final `patch-node` restored `RC_Validate_State_Update_Input.jsCode` to original (2032-char, identity match).
6. Every mutation reactivated; every mutation hashed and appended to `.audit.jsonl`.

## 3. Shell integrity (V1)

| Check | Expected | Observed |
|---|---|---|
| Node count | 14 | 14 |
| Main edges | 13 | 13 |
| Triggers | 2 (Webhook + Manual) | 2 |
| Switches | 2 | 2 |
| Postgres nodes | 2 | 2 |
| Code nodes | 4 | 4 |
| Set nodes | 4 (envelope + 3 returns) | 4 |
| `availableInMCP` | true | true |
| Postgres creds | bound | both bound to `qpZLzVs17Zy7HCFB` |

## 4. Execution IDs & pass/fail per V

| V | Execution | Scenario | Result | Terminal |
|---|---|---|---|---|
| V1 | — | Shell integrity (static) | PASS | n/a |
| V2 | #749 → **#750** after switch fix | `{}` invalid input | PASS | `RC_Return_Error` |
| V3 | **#751** | Valid happy success | PASS | `RC_Return_Result` |
| V3b | **#752** | Partial + MEM_BLOCKED | PASS (status=partial, warning_count=1) | `RC_Return_Result` |
| V4 | **#753** | warnings + followups | PASS (warning_count=2, followup_count=2, `includes_followups=true`, `includes_warnings=true`) | `RC_Return_Result` |
| V5 | **#754** | thread_id 99… mismatches DB 55… | PASS (`LINEAGE_MISMATCH`) | `RC_Return_Context_Error` |
| V6 | n/a | DB read-only discipline | PASS (no writes — see §5) | n/a |

Sample V4 final envelope RO text (exec #753):
> Am pregătit răspunsul final pe baza rezultatului confirmat.\nAm procesat cererea ta.\nAcțiuni confirmate: draft_message.\nAplicat: starea execuției.\nBlocat sau rămas neaplicat: scriere de eveniment de domeniu.\nContext util: conversația a fost salvată.\nAtenționări: CAL_UNREACHABLE: Sincronizarea calendar a eșuat temporar.; atenție: timpul estimat poate varia.\nMai am nevoie de clarificări pentru: NEED_DATE: Care e data limită exactă?; NEED_RECIPIENT: Cui trebuie trimis?.

All V2-V5 envelopes carry an `idempotency_key` of the form `compose:<ec_id>:<sha256-12>` and set `output_gateway_allowed=true`, `allowed_next_stage=MESSAGE_OUT`.

## 5. V6 — read-only discipline (DB drift probe)

Verified against `public.execution_contexts`, `public.threads`, `public.messages`:

| Table | rows after V2-V5 | max(updated_at / last_activity_at / created_at) |
|---|---|---|
| execution_contexts | 3 | 2026-04-18T07:51:41.013Z |
| threads | 8 | 2026-04-18T07:51:40.968Z |
| messages | 6 | 2026-04-18T01:00:06.923Z |

All V2-V5 runs happened 10:14-10:22. None of the max timestamps advanced into that window: **RC-01 did not write to any operational table during verification**.

## 6. Credential rebind status

Both `RC_Load_Execution_Context` and `RC_Load_Thread_Context` carry:
`credentials.postgres = { id: "qpZLzVs17Zy7HCFB", name: "Postgres account" }` — verified against the live workflow GET response and by the SELECT executions returning real rows.

## 7. Match status vs. pack

- Node names, types, typeVersions: **match**.
- Connection map: **match**.
- jsCode for Validate/Verify/Build_Composition_Input/Compose_Response: **match** (restored to pack bytes).
- Switch rule shape: **intentionally diverges from pack** per §8 (see `WF-RC-01_PACK_BUG_SWITCH_V32.md`). Live is semantically correct; pack JSON must be updated before any re-deploy.
- `settings`: match (`v1`, `availableInMCP=true`).

## 8. Closure eligibility — WF-RC-01

**Eligible for closure.** Contract upheld end-to-end:
- One-final-response ownership preserved (RC is the sole emitter of composed_response + `output_gateway_allowed=true`).
- Fail-closed posture demonstrated on V2 and V5 — both routed to error terminals.
- Tenant isolation held by scoping SELECTs `AND tenant_id = $2::uuid`.
- Read-only discipline proven by V6 timestamps.
- Idempotency key stable per `ec_id` + composed body.

Recommend updating `CURRENT_STAGE.md` to mark WF-RC-01 closed and moving active stage to WF-EC-01 per CLAUDE.md.

## 9. Updated artefacts

Snapshots (`tools/n8n-patch/snapshots/`):
- `TClXgmO8H8zsSwMb_pre-rc01-replace-20260418T100855Z.json` — pre (4-node stub)
- `TClXgmO8H8zsSwMb_post-rc01-replace-20260418T100928Z.json` — post-replace
- `TClXgmO8H8zsSwMb_post-rc01-final-20260418T1023Z.json` — final (after restore of validate jsCode)

Test harness (`tools/n8n-patch/rc-test-harness/`):
- `V2.fixture.json`, `V3.fixture.json`, `V3b.fixture.json`, `V4.fixture.json`, `V5.fixture.json`
- `original-validate-jsCode.js` (2032 chars — pack original; restored live)
- `inject-fixture.mjs`, `switch-fix-valid.json`, `switch-fix-context.json`

Audit trail: `tools/n8n-patch/.audit.jsonl` — one line per GET/PUT/patch/activate/deactivate/reactivate with before/after hashes and snapshot paths. Last hash on final restore: `before=dd6d0daa32ac`, `after=eca68226d27d`.

Pack bug note: `wf-rc-01-pack/workflows/WF-RC-01_PACK_BUG_SWITCH_V32.md`.

## 10. Remaining blockers / caveats

- **Pack JSON must be updated** to the `isTrue` operator on both switches before the next greenfield deploy. Live is correct; pack is not.
- DB fixtures (`execution_contexts id=33…`, `threads id=55…`) were **deleted** at closure — `ec_remaining=0`, `th_remaining=0`. Re-running tests requires re-seeding via `wf-rc-01-pack/workflows/sql/rc/10_fixtures.sql` plus the `trigger_message_id` adjustment.
- No MESSAGE_OUT wiring was touched. RC-01 emits the envelope; downstream delivery is out of scope for this pass.
- V7 "write-attempt smoke" was folded into V6 — by contract RC has no write nodes, so V6's no-drift measurement is the stronger evidence.
- `n8n-patch` never bypasses `reactivate` on workflows that carry webhook triggers; the workflow was cycled after every patch.
