# PHASE 10 — Rerun record (TR-originated full primary chain)

Run ID: `run_2026-04-20_autonomous_test_e2e_strict_continuation` / Phase 10 rerun
Scope: Re-execute the TR-originated full primary chain after the OR Phase-10 +
Phase-10b patch to measure how far the chain now traverses.
Artifact: `tests/generated/edges/phase10_rerun_results.json`.

---

## 1. Methodology

- Entry: chatTrigger precursor on `WF-TR-01` (`TR_Chat_Trigger` → `TR_Parse_Chat_Input`
  → `TR_Validate_Input`) — same entry point used in Phase 9.
- Inputs: flat envelope JSON passed as `chatInput`, carrying `explicit_thread_id` to
  force a short-circuit on the thread resolver.
- Fixture messages (4 rows, all tenant `aaaaaaaa-0000-0000-0000-000000000001`, all
  with `intent` now populated — PL-mappable intents chosen deliberately):

  | message_id                                | intent            | thread_id                                 |
  |-------------------------------------------|-------------------|-------------------------------------------|
  | `00000000-0000-0000-0000-000000009201`    | `update_task`     | `11111111-0000-0000-0000-000000000001`    |
  | `00000000-0000-0000-0000-000000009202`    | `create_task`     | `44444444-0000-0000-0000-000000000004`    |
  | `00000000-0000-0000-0000-000000009203`    | `create_reminder` | `55555555-0000-0000-0000-000000000005`    |
  | `00000000-0000-0000-0000-000000009204`    | `update_task`     | `66666666-0000-0000-0000-000000000006`    |

- Firing: 4 `execute_workflow` calls into `WF-TR-01` (production). Exec IDs returned:
  1005, 1011, 1017, 1023.
- Walker: `tests/generated/workflows/snapshots/_walk_phase10_chains.mjs`.

## 2. Per-case chain traversal

| Case          | start_exec | chain path                    | depth | terminal WF | DI error code                        |
|---------------|------------|-------------------------------|-------|-------------|--------------------------------------|
| p10-smoke-01  | 1005       | TR → EC → OR → PL → DI        | 5     | DI          | `UNSUPPORTED_ACTION`                 |
| p10-smoke-02  | 1011       | TR → EC → OR → PL → DI        | 5     | DI          | `UNSUPPORTED_ACTION`                 |
| p10-smoke-03  | 1017       | TR → EC → OR → PL → DI        | 5     | DI          | `UNSUPPORTED_MODULE`                 |
| p10-smoke-04  | 1023       | TR → EC → OR → PL → DI        | 5     | DI          | `UNSUPPORTED_ACTION`                 |

All 4 cases cleanly pass through TR → EC → OR → PL (Phase 9's terminus) into DI. The
4th hop (PL) previously terminated the chain; in this rerun it succeeds and dispatches
to DI.

## 3. Evidence that B9 is resolved

Walker captured `OR_Build_Handoff_Payload` output for each case — `planner_context` is
fully populated:

| Case          | planner_context.user_message_text                                                                           | planner_context.primary_intent |
|---------------|-------------------------------------------------------------------------------------------------------------|--------------------------------|
| p10-smoke-01  | `actualizeaza pretul apartamentului din centru la 95000 eur`                                                  | `update_task`                  |
| p10-smoke-02  | `creeaza un task nou pregateste contractul pentru proiect important a pana vineri`                             | `create_task`                  |
| p10-smoke-03  | `seteaza o reamintire pentru proiect important b la 09:00 maine`                                               | `create_reminder`              |
| p10-smoke-04  | `muta data pentru apartament test boundary cu trei zile mai tarziu`                                            | `update_task`                  |

No PL `INSUFFICIENT_PLANNING_CONTEXT` in any of the 4 cases — chain progresses past PL.

## 4. New blocker surfaced downstream — `B10-DI-UNSUPPORTED-ACTION-AND-MODULE`

DI now terminates each chain with one of two distinct errors:

### 4.1 `UNSUPPORTED_ACTION` (3/4 cases — smokes 01, 02, 04)

```
status_kind: error
module_name: module_execution
error.code:  UNSUPPORTED_ACTION
error.message: "Unsupported task_module action: undefined."
```

Classification: PL's plan output dispatches into DI with
`execution_plan.task_module.action === undefined`. Either PL is not populating the
`action` field on its emitted plan, or DI's extractor is looking at the wrong path.
Either way, this is a module-contract alignment issue between PL and DI — **not** an
edge/connector gap (the PL→DI edge is correctly wired and the envelope arrives at DI).

### 4.2 `UNSUPPORTED_MODULE` (1/4 — smoke 03, `create_reminder`)

```
status_kind: error
module_name: module_execution
error.code:  UNSUPPORTED_MODULE
error.message: "WF-ME-01 currently supports task_module only in live-capable mode; got reminder_module."
```

Classification: PL correctly maps `create_reminder` → `reminder_module`, DI dispatches
to ME, but ME's current implementation only handles `task_module`. This is a coverage
gap in ME — again a module-contract issue, distinct from any connector gap.

## 5. Scope discipline

Per the user's explicit scope guard:

> "apply the smallest canonical fix only. Inject `planner_context.user_message_text` in
> OR first. Do not also synthesize `planner_context.goal` unless rerun evidence proves
> that `user_message_text` alone is insufficient. Keep the patch local to WF-OR-01 and
> keep reruns minimal and targeted."

The mission target was B9. B9 is resolved. The B10 class of problems is a *different*
set of module-contract gaps, deeper in the pipeline, not discoverable until B9 is
cleared. Per Phase-4 stopping rule ("apply at most one additional targeted remediation
if evidence is strong"), we have already applied the one additional patch (Phase 10b —
primary_intent passthrough, which was an evidence-backed passthrough not a synthesis).
We **stop escalation** here and document B10 as the next-recommended work item outside
this mission's scope.

## 6. Artifacts

- `tests/generated/edges/phase10_rerun_results.json` — machine-readable rerun trace
- `tests/generated/workflows/snapshots/_walk_phase10_chains.mjs` — walker used
- This file.

## 7. Verdict

- ✅ B9 `B9-OR-PL-PLANNER-CONTEXT-GAP` fully resolved (4/4 smokes clear PL).
- ⚠ New blocker `B10-DI-UNSUPPORTED-ACTION-AND-MODULE` documented (out of scope).
- ❌ End-to-end TR→MO: still not reached in this rerun (now blocked at DI instead
  of PL). Chain depth improvement: 4 → 5 hops on every case.

Mission-level verdict: **MISSION_PARTIALLY_COMPLETE_WITH_BLOCKERS** — B9 cleared; new
independent B10 surfaced one hop deeper.
