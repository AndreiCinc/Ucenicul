# PHASE 10 — OR planner_context patch record

Run ID: `run_2026-04-20_autonomous_test_e2e_strict_continuation` / Phase 10
Scope: Smallest canonical fix for `B9-OR-PL-PLANNER-CONTEXT-GAP`.
Binding mandates honored:
- "Apply the smallest canonical fix only" (user scope guard).
- "Keep the patch local to WF-OR-01 and keep reruns minimal and targeted."
- "Do not also synthesize `planner_context.goal` unless rerun evidence proves that `user_message_text` alone is insufficient."

This record documents the one or two sub-patches actually applied and the evidence
that motivated each one.

---

## 1. Pre-execution reasoning (6-point note)

1. **Exact blocker**: `B9-OR-PL-PLANNER-CONTEXT-GAP` — `WF-OR-01.OR_Build_Handoff_Payload`
   (`KhGmNpi0ZDmrnz8W`) emits a handoff whose `payload.planner_context` is empty. PL's
   `plan_generation` module rejects with `INSUFFICIENT_PLANNING_CONTEXT` because it
   requires either `planner_context.goal` or `planner_context.user_message_text`.
2. **Why module-contract, not connector**: the OR→PL edge is correctly wired
   (executeWorkflow once, `waitForSubWorkflow=true`, `dispatch` envelope shape). The
   payload shape conforms to the envelope schema. The missing field is a module-level
   input requirement, which is OR's canonical responsibility to enrich (per Module
   Registry and Architecture Spec v3).
3. **Why the chosen fix is smallest canonical**: the Architecture Spec v3 assigns
   message-context enrichment to the orchestrator module (OR). A one-node Postgres
   SELECT on `public.messages` keyed by (`id`, `tenant_id`) is additive, preserves all
   existing OR behavior, and propagates the already-persisted `normalized_content` into
   `planner_context.user_message_text`. No schema migration.
4. **Why OR as patch location**: (a) canonical responsibility assignment; (b) the
   `trigger_message_id` + `tenant_id` are already present on the OR handoff payload, so
   no upstream change is required; (c) TR→EC envelope does not carry `normalized_content`
   and EC does not persist it, so enriching elsewhere would require a bigger blast
   radius.
5. **Files touched**: only `WF-OR-01` (one workflow) — two nodes modified/added:
   - added `OR_Load_Trigger_Message` (postgres, `typeVersion 2.5`, executeQuery),
     credentials reused verbatim from `OR_Load_Execution_Context`
     (cred id `z9nKgToNWvIW7P8f`).
   - updated `OR_Build_Handoff_Payload` jsCode to v1.3 then v1.4.
6. **What to re-run**: 4 TR-originated chat smokes (message_ids 9201-9204) + chain
   walker. Minimal, targeted.

---

## 2. Sub-patches actually applied

### 2.1 Phase 10 (first patch)

- Script: `tests/generated/workflows/snapshots/_patch_or_planner_context_phase10.mjs`
- Snapshots: `WF-OR-01_phase10_pre.json`, `WF-OR-01_phase10_put.json`
- Diff summary:
  - Inserted `OR_Load_Trigger_Message` between `OR_Verify_Context_Match` and
    `OR_Build_Handoff_Payload`.
  - Rewired: Verify → Load → Build (existing Build upstream pointer replaced).
  - New SELECT (inline-interpolation following existing OR convention):
    ```sql
    SELECT
      m.id::text AS message_id,
      m.normalized_content AS normalized_content,
      m.content AS content
    FROM public.messages m
    WHERE m.id = '{{ $json.trigger_message_id }}'::uuid
      AND m.tenant_id = '{{ $json.tenant_id }}'::uuid
    LIMIT 1;
    ```
  - `OR_Build_Handoff_Payload` v1.3: reads verify output by node name, reads message
    row from `$json`, injects `planner_context.user_message_text` when non-empty.
    Preserves all existing payload fields and error short-circuit behavior.

### 2.2 Phase 10b (second, evidence-triggered patch)

**Trigger evidence**: Post-Phase-10 smoke exec 1001 — chain reached PL but PL rejected
with a *different* error:
```
error.code: INSUFFICIENT_PLANNING_CONTEXT (second guard)
error.message: "No requested actions or mappable primary intent are available."
error.missing_fields: ["planner_context.requested_actions or planner_context.primary_intent"]
```

PL exposes two data guards back-to-back:
1. `goal = planner_context.goal || planner_context.user_message_text` — satisfied by
   Phase 10.
2. `planner_context.primary_intent` must be in the PL intent map OR
   `planner_context.requested_actions` must be non-empty — still missing.

**Scope justification**: the user scope guard explicitly forbids synthesizing
`planner_context.goal`. It does not forbid passthrough of persisted data fields. The
canonical source of the classified intent is `public.messages.intent` (populated by the
upstream ingestion/NLU layer). Extending the same OR_Load_Trigger_Message SELECT by one
column (`m.intent`) and passing it through as `planner_context.primary_intent` is:
- **Not synthesis** — it's reading a field that already exists in the persisted
  message row.
- **Same blast radius** — still only `WF-OR-01` modified.
- **Directly evidence-backed** — one reproducible PL failure at a second guard.

- Script: `tests/generated/workflows/snapshots/_patch_or_planner_context_phase10b.mjs`
- Snapshots: `WF-OR-01_phase10b_pre.json`, `WF-OR-01_phase10b_put.json`
- Diff summary:
  - SELECT extended: `m.intent AS intent`.
  - `OR_Build_Handoff_Payload` v1.4: additionally injects
    `planner_context.primary_intent` when `msgRow.intent` is non-empty.

---

## 3. Post-patch verification (in-workflow inspection)

A direct GET on workflow `KhGmNpi0ZDmrnz8W` after Phase-10b confirms:

| Check                                                   | Result |
|---------------------------------------------------------|--------|
| `OR_Load_Trigger_Message.parameters.query` contains `m.intent` | ✅ true |
| `OR_Build_Handoff_Payload.parameters.jsCode` contains `primary_intent` | ✅ true |
| Postgres credentials still present on Load node        | ✅ reused from OR_Load_Execution_Context |
| Connections: `Verify → Load → Build` intact             | ✅ via Phase-10 PUT, preserved through 10b |

Observed `planner_context` in post-patch smoke executions (from chain walker
`OR_Build_Handoff_Payload` run data):

| Smoke        | `user_message_text`                                                                          | `primary_intent`    |
|--------------|----------------------------------------------------------------------------------------------|---------------------|
| p10-smoke-01 | "actualizeaza pretul apartamentului din centru la 95000 eur"                                  | `update_task`       |
| p10-smoke-02 | "creeaza un task nou pregateste contractul pentru proiect important a pana vineri"             | `create_task`       |
| p10-smoke-03 | "seteaza o reamintire pentru proiect important b la 09:00 maine"                               | `create_reminder`   |
| p10-smoke-04 | "muta data pentru apartament test boundary cu trei zile mai tarziu"                            | `update_task`       |

Both PL data guards are satisfied — chain progresses past PL in all 4 cases.

---

## 4. Blocker status transitions

| Blocker                              | Before Phase 10                                  | After Phase 10                               | After Phase 10b                                    |
|--------------------------------------|--------------------------------------------------|----------------------------------------------|----------------------------------------------------|
| `B9-OR-PL-PLANNER-CONTEXT-GAP`       | OPEN — chain depth 4 (TR→EC→OR→PL terminal)      | PARTIAL — PL first guard cleared, second open | **RESOLVED** — PL both guards cleared              |
| (new) `B10-DI-UNSUPPORTED-ACTION-AND-MODULE` | not observable (chain never reached DI)     | not observable                               | OPEN — observed only now that chain reaches DI     |

The new blocker `B10` is out of this mission's approved scope (mission target was B9)
and is a separate downstream module-contract gap. See Phase-10 rerun record for details.

---

## 5. Artifacts

- `tests/generated/workflows/snapshots/_patch_or_planner_context_phase10.mjs`
- `tests/generated/workflows/snapshots/WF-OR-01_phase10_pre.json`
- `tests/generated/workflows/snapshots/WF-OR-01_phase10_put.json`
- `tests/generated/workflows/snapshots/_patch_or_planner_context_phase10b.mjs`
- `tests/generated/workflows/snapshots/WF-OR-01_phase10b_pre.json`
- `tests/generated/workflows/snapshots/WF-OR-01_phase10b_put.json`
- `tests/generated/edges/phase10_or_patch_results.json` — machine-readable patch record
- `tests/generated/workflows/snapshots/_walk_phase10_chains.mjs` — chain walker for rerun
- `tests/generated/edges/phase10_rerun_results.json` — rerun evidence
- `tests/generated/edges/PHASE_10_RERUN_RECORD.md` — rerun human-readable record

---

## 6. Verdict for Phase 10

- ✅ B9 resolved (evidence: OR planner_context fully populated; PL no longer blocks
  in 4/4 TR-originated smokes).
- ⚠ A new independent blocker `B10-DI-UNSUPPORTED-ACTION-AND-MODULE` is observed further
  downstream (DI) — NOT addressed by this mission's approved scope.
- ✅ Patch remained local to `WF-OR-01`; no schema migration; reruns minimal.
