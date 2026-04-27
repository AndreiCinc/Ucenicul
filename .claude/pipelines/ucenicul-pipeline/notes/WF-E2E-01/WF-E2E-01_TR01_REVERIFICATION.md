# WF-E2E-01 — TR-01 Re-verification Report

**Date:** 2026-04-18
**Target:** `wI8hpSROxQI0zC9f` — WF-TR-01 Thread Resolver
**Mandate:** Determine whether TR-01's route-map-asserted `CLOSED`
status is trustworthy for downstream E2E dependence. **Do not redesign
TR-01.** Do not write to TR-01 live. Read-only audit.

---

## 1. Method

- Read-only `get` of the live workflow →
  `tools/n8n-patch/snapshots/wI8hpSROxQI0zC9f_reverify-20260418.json`.
- Direct inspection of node code (Validate/Build/Return/Audit).
- Direct SQL inspection of `public.thread_resolution_audit` for
  real-world execution evidence.
- Directory search for TR-01 closure artefacts.
- Check audit log (`tools/n8n-patch/.audit.jsonl`) for any mutations
  by this cycle — **none**, TR-01 untouched.

## 2. Live shell facts

- Workflow id: `wI8hpSROxQI0zC9f`
- Name: `WF-TR-01 Thread Resolver`
- Active: `true`
- Archived: `false`
- Created: `2026-04-16T04:21:02Z`
- Updated: `2026-04-18T12:20:40Z` (not by E2E-01; audit log has no
  TR-01 entries)
- Settings: `executionOrder=v1`, `binaryMode=separate`,
  `availableInMCP=true`.
- Node count: **20**, edge count: **18**.
- triggerCount: 1 (Telegram) — `availableInMCP` true but the call-as-sub
  path is absent (no `executeWorkflowTrigger`).
- Terminals: `TR_Return_Result`, `TR_Return_Error`.
- DB writes: `TR_Write_Audit` (success path) and `TR_Write_Error_Audit`
  (error path) → `public.thread_resolution_audit`.
- **No `executeWorkflow` sub-call node** — TR-01 does NOT invoke EC-01
  live. The TR→EC link is structurally absent.

## 3. Code quality signals (positive)

Every code node carries a `v2.0 (Remediated)` header with explicit
D-NN fix references (e.g. `D-03 fix: deterministic resolution_id`,
`D-06 fix: explicit error: null on success`, `D-11 fix: no non-contract
fields in output`). Concretely observed:

- `TR_Validate_Input` — adapter layer accepts both nested user-contract
  shape (`request.message.*`) and flat internal shape. Defensive.
- `TR_Build_Result` — deterministic resolution_id = `'tr_' + message_id + '_' + simpleHash(idempotency_key)`. No `Date.now()`. Idempotent by construction.
- `TR_Write_Audit` — `INSERT ... ON CONFLICT (resolution_id) DO NOTHING`. Safe replay.
- `TR_Return_Result` — reads from `$('TR_Build_Result')` directly, not from the downstream audit node. **Audit write failure does not block result return** — production-grade error isolation.

This is high-craft code. It does not read like scaffolding.

## 4. Live execution evidence — `public.thread_resolution_audit`

| Count | Earliest | Latest |
|-------|----------|--------|
| 4 | 2026-04-16T16:27:31Z | 2026-04-16T20:15:31Z |

Decision distribution:

| decision | count | decision_reason(s) exercised |
|----------|-------|-------------------------------|
| `attach_existing_thread` | 3 | `direct_reply_linkage_shortcircuit`, `direct_reply_linkage_override_semantic`, `score_above_attach_threshold` |
| `fail_invalid_input` | 1 | `INVALID_INPUT: normalized_content` |

Sub-paths with live evidence:
- Reply shortcircuit path (`TR_Route_Shortcircuit → TR_Build_Result`).
- Reply-linkage override path (`TR_Route_After_Reply → TR_Build_Result` after reply context loaded).
- Scoring path (`TR_Load_Candidate_Threads → ... → TR_Score_Candidates → TR_Apply_Decision_Policy → TR_Build_Result` with `score_above_attach_threshold`).
- Error path (`TR_Route_Valid → TR_Build_Error_Result → TR_Write_Error_Audit → TR_Return_Error`).

Sub-paths NOT in the audit record (may exist but unexercised within
the 4-row window):
- `create_new_thread` decision (no row observed).
- `create_branch_thread` decision (no row observed).
- `reopen_thread` decision (no row observed).
- `ambiguous_escalate` decision (`ambiguity_detected=true`, no row observed).

## 5. Closure artefact search — negative

- No `CLOSURE_REPORT_WF-TR-01.md` in the workspace.
- No `STATE_WF-TR-01.json` in the workspace.
- No `BUILD_REPORT_WF-TR-01.md` / `AUDIT_REPORT_WF-TR-01.md`.
- No `wf-tr-01/` or `wf-tr-01-pack/` directory.
- The only top-level TR-01 mentions are in `00_ROUTE_MAP.md`
  (status CLOSED asserted) and the E2E-01 docs we just wrote.

The route map asserts closure but the audit trail for that closure is
missing from this workspace. This is exactly why the user flagged
TR-01 as needing re-verification on 2026-04-18.

## 6. Verdict

### 6.1 What can be honestly asserted

- **TR-01 is a real, live, high-craft workflow** running in production.
  Its code has gone through a named remediation cycle (`v2.0 (Remediated)`)
  and it has produced real, correctly-structured audit rows.
- **It is structurally trustworthy at the head-of-chain position.**
  Its upstream entry (Telegram Trigger) is real. Its result/error
  terminals are well-formed. Its audit write is idempotent.
- **Three success sub-paths + one error sub-path have live evidence.**
  That is a partial V-sweep.

### 6.2 What cannot be asserted

- **TR-01 is not formally closed at 10/10.** No closure report,
  no STATE entry, no full V-sweep covering all decision branches,
  no BUILD/AUDIT report.
- **TR-01 does not invoke EC-01.** The TR→EC sub-workflow connector
  is structurally absent. Live handoff cannot occur today.
- **Call-as-sub is not supported.** TR-01 has no `executeWorkflowTrigger`.
  (This is acceptable for chain-head position; noted for completeness.)

### 6.3 Trust posture for E2E dependence

**Conditional trust** — trustworthy enough that E2E-01 does not need
to redesign or re-patch TR-01 under the current mandate. But **not
closed**, so E2E-01 cannot claim any link closure that depends on TR-01.

Specifically:
- Any future work on Link 1 (TR → EC) will require EC-01 to be
  individually closed first, and then a TR→EC sub-workflow connector
  added. Adding that connector is additive to TR-01 (new node +
  edge from `TR_Build_Result` or `TR_Return_Result` downstream).
  TR-01's output envelope is already shaped for consumption by EC-01
  (fields include `resolution_id`, `tenant_id`, `resolved_thread_id`,
  `decision`, `module_name`, `result_type`, `status`, etc.).
- Any claim that "TR-01 is closed" in E2E-01 docs must be tagged
  "route-map-asserted, evidence partial" until a proper TR-01
  closure cycle is run.

## 7. Required-to-clear list (for a future formal TR-01 closure)

Not in scope of this re-verification, but surfaced for future planning:

1. Run a full V-sweep covering all 7 decision branches (attach,
   create_new, create_branch, reopen, ambiguous_escalate, fail_invalid,
   plus the reply shortcircuit).
2. Produce `CLOSURE_REPORT_WF-TR-01.md` listing pinData fixtures,
   execution IDs, and audit row IDs proving each branch.
3. Promote into `STATE.json` as `tr_01_live_impl` with a
   `live_shell: {nodes:20, edges:18}` entry and a `live_executions:
   […]` list.
4. Decide whether TR-01 should also gain a call-as-sub entry
   (`executeWorkflowTrigger`) for symmetry with EC..RC peers. If yes,
   add it additively per the same pattern used for SU-01 under E2E-01.
5. Design and add the TR→EC connector (new `executeWorkflow` node in
   TR-01) once EC-01 is 10/10 closed.

## 8. No mutation occurred

No live PUT against `wI8hpSROxQI0zC9f` was issued in this re-verification
cycle. `tools/n8n-patch/.audit.jsonl` has zero entries for this id.
The only artefact produced is the read-only snapshot in
`tools/n8n-patch/snapshots/wI8hpSROxQI0zC9f_reverify-20260418.json`
plus this report.

## 9. Recommended outcome for STATE.json

Fold `tr_01_reverification_pending` → `tr_01_reverification_done`
(or keep as `_pending` but stamp with a `reverify_result` block)
carrying:
- `trust_posture: conditional`
- `closed: false`
- `evidence`: audit rows count + branches observed
- `gaps`: list per §6.2 above
- `advance_allowed: false` (no TR-01 closure claim)
- `next_step`: full V-sweep + closure report (owned by a future
  TR-01 closure cycle, NOT by E2E-01).
