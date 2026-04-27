# PHASE 9 — Full Primary Chain Smoke Record (TR-originated)

Run ID: `run_2026-04-20_autonomous_test_e2e_strict_continuation` / Phase E
Scope: Full-primary-chain smoke **originating at TR** (per binding mandate:
"The full-primary-chain proof must start at TR unless a real blocker is documented.").
Artifact: `tests/generated/edges/phase9_full_primary_chain_results.json`.

This record supersedes the partial Phase-6 smoke (which bypassed TR→EC→OR→PL by starting
at DI); edges 1–4 were activated in Phase 8, so a TR-originated smoke is now possible
and has been executed.

## 1. Pre-requisite — TR chatTrigger precursor

WF-TR-01 previously had only `manualTrigger` + `telegramTrigger` entry points. The
`manualTrigger` carried pinned data that overrides MCP inputs in manual mode, and the
`telegramTrigger` needs a real Telegram webhook. The MCP `execute_workflow` tool only
accepts `{type: chat|form|webhook}` inputs. We therefore added a **chatTrigger**
precursor inside WF-TR-01:

- Script: `tests/generated/workflows/snapshots/_add_tr_chat_trigger_phase9.mjs`
- Snapshots:
  - pre: `tests/generated/workflows/snapshots/WF-TR-01_phase9_pre.json`
  - put: `tests/generated/workflows/snapshots/WF-TR-01_phase9_put.json`
- Added nodes:
  - `TR_Chat_Trigger` (`@n8n/n8n-nodes-langchain.chatTrigger` v1.1, webhookId
    `a1b2c3d4-trtr-phz9-4chat-smoketh00001`)
  - `TR_Parse_Chat_Input` (`n8n-nodes-base.code` v2) — `JSON.parse($json.chatInput)` →
    flat envelope.
- Wiring: `TR_Chat_Trigger → TR_Parse_Chat_Input → TR_Validate_Input` (the existing entry
  validator already used by `manualTrigger`).
- Settings: `availableInMCP=true` (whitelisted in `n8n-patch.mjs`).

No existing behaviour changed: the pre-existing `manualTrigger` and `telegramTrigger`
paths remain intact (confirmed via post-patch inspection — 24 nodes, 3 triggers).

## 2. Smoke matrix — 4 cases (> 3 minimum)

Each smoke case was fired via MCP `execute_workflow` chat inputs into WF-TR-01. Each
payload carries an `explicit_thread_id` pointing at a pre-seeded thread so TR short-
circuits via `explicit_thread_reference`, producing a non-null `resolved_thread_id` for
the TR→EC adapter. This isolates the full-chain smoke from TR's scoring path (already
covered by WF-TR-01 workflow-local tests).

| # | Case label            | harness exec | thread_id                                | thread title            | intent style             |
|---|-----------------------|--------------|------------------------------------------|-------------------------|--------------------------|
| 1 | smoke-01-happy        | 985          | 11111111-0000-0000-0000-000000000001     | Apartament centru Ion   | update / modification    |
| 2 | smoke-02-boundary     | 989          | 44444444-0000-0000-0000-000000000004     | Proiect important A     | new task / schedule      |
| 3 | smoke-03-persistence  | 993          | 55555555-0000-0000-0000-000000000005     | Proiect important B     | outbound message intent  |
| 4 | smoke-04-boundary2    | 997          | 66666666-0000-0000-0000-000000000006     | Apartament Test Boundary| date change / reschedule |

## 3. Chain traces (depth reached per case)

All four cases produced an identical 4-hop depth: **TR → EC → OR → PL**.

| Case | Chain path             | Depth | Terminal WF | Terminal status | Terminal error code            |
|------|------------------------|-------|-------------|-----------------|--------------------------------|
| 1    | TR → EC → OR → PL      | 4     | PL          | failed          | INSUFFICIENT_PLANNING_CONTEXT  |
| 2    | TR → EC → OR → PL      | 4     | PL          | failed          | INSUFFICIENT_PLANNING_CONTEXT  |
| 3    | TR → EC → OR → PL      | 4     | PL          | failed          | INSUFFICIENT_PLANNING_CONTEXT  |
| 4    | TR → EC → OR → PL      | 4     | PL          | failed          | INSUFFICIENT_PLANNING_CONTEXT  |

All four cases uniformly terminated in `WF-PL-01`'s `plan_generation` module with:

```
error.code: INSUFFICIENT_PLANNING_CONTEXT
error.message: "Planning goal is missing."
error.missing_fields: ["planner_context.goal or planner_context.user_message_text"]
```

Detail per hop (case 1, exec 985; cases 2–4 behave identically):

| Hop | Exec | WF       | Status    | Last node                         | Envelope kind      |
|-----|------|----------|-----------|-----------------------------------|--------------------|
| 0   | 985  | WF-TR-01 | success   | TR_Dispatch_To_EC_01_SUBCALL      | dispatch → EC      |
| 1   | 986  | WF-EC-01 | success   | EC_Dispatch_To_OR_01_SUBCALL      | dispatch → OR      |
| 2   | 987  | WF-OR-01 | success   | OR_Dispatch_To_PL_01_SUBCALL      | dispatch → PL      |
| 3   | 988  | WF-PL-01 | success¹  | *PL planning-context guard*       | error (downstream) |

¹ Execution-level `status=success` because PL gracefully returned a structured error
envelope to its caller. The envelope payload is `status_kind=failed`, i.e. the chain
result is a failure from the business-logic standpoint.

## 4. Edge-level verdicts from the TR-originated smoke

Re-confirming edges 1–4 on a **fully-integrated** stack (not synthetic harnesses):

| Edge   | Verdict          | Evidence                                                                            |
|--------|------------------|-------------------------------------------------------------------------------------|
| TR→EC  | ✅ contract OK   | TR built canonical EC-envelope with `resolved_thread_id` → EC accepted, initialised |
| EC→OR  | ✅ contract OK   | EC emitted `execution_context_init` state → OR normalised (flat-shape) → accepted   |
| OR→PL  | ⚠ adapter gap    | OR emitted handoff w/ `orchestrator_input` but **not** `planner_context`; PL blocks |
| PL→DI  | ⏳ blocked upstream | Not reached in full-chain smoke; previously exercised in Phase-8 edge runtime     |

## 5. Canonical blocker (documented)

### Blocker identifier: `B9-OR-PL-PLANNER-CONTEXT-GAP`

The OR→PL handoff payload emitted by `OR_Build_Handoff_Payload` is:

```json
{
  "status_kind": "success",
  "result_type": "handoff",
  "module_name": "orchestrator_input_handoff",
  "payload": {
    "tenant_id": "...",
    "thread_id": "...",
    "execution_id": "...",
    "trigger_message_id": "...",
    "idempotency_key": "...",
    "execution_status": "initialized",
    "planning_allowed": true,
    "allowed_next_stage": "WF-PL-01",
    "orchestrator_input": {
      "planning_mode": "plan_only",
      "module_execution_allowed": false,
      "response_generation_allowed": false,
      "domain_writes_allowed": false
    },
    "warnings": []
  }
}
```

`WF-PL-01` (`plan_generation`) requires **either** `planner_context.goal` **or**
`planner_context.user_message_text`. Neither is present. The OR stage currently has no
code path that:

1. Reads the inbound `normalized_content` from the TR→EC envelope (TR→EC does not carry
   `normalized_content`, and EC doesn't persist the original message text), **or**
2. Loads the trigger message text from the `messages` table via `trigger_message_id`,
   **or**
3. Forwards a goal synthesised upstream.

This is a **module-contract gap**, not a connector/edge gap. The OR→PL canonical edge
is correctly wired (executeWorkflow once, waitForSubWorkflow=true, dispatch→handoff
envelope) — the handoff simply lacks a required field. Both Phase-8 edge-isolation runtime
(`CONTEXT_MISMATCH` / `INSUFFICIENT_PLANNING_CONTEXT` terminal) and this Phase-9 full-chain
smoke reproduce the same missing field.

### Smallest canonical fix (NOT applied — out of mission scope)

Option A (preferred — no schema change): **OR loads the trigger message on context**.
Add one Postgres node + enrichment step between `OR_Load_Execution_Context` and
`OR_Build_Handoff_Payload`:
```sql
SELECT normalized_content FROM messages WHERE id = $1 AND tenant_id = $2;
```
Inject into handoff payload as `planner_context.user_message_text`.

Option B: **Propagate message text through TR→EC→OR**. Requires broadening the TR→EC
envelope schema (`TR_Build_EC_Envelope`) and EC's `execution_context` table to carry
`trigger_message_text`. Higher blast radius.

Option C: **PL-side fallback**. PL loads the message itself by `trigger_message_id`.
Couples PL to the messages table and duplicates Option A.

The Module Registry and Architecture Spec v3 both assign planner-context enrichment to
OR (as the orchestrator). Option A matches canonical responsibility assignment and is
the recommended fix.

## 6. Why this is a *blocker* for the remaining 6 hops (PL→DI→ME→RA→SU→RC→MO)

PL halts the chain before dispatching to DI. Therefore DI, ME, RA, SU, RC, MO cannot be
exercised **via this TR-originated path** until OR is patched. They **have** been
exercised in two other places in this mission:

- Phase 6 (`PHASE_6_CHAIN_SMOKE_RECORD.md`): DI→ME→RA→SU→RC→MO validated end-to-end for
  3 smoke cases (fanout included). Evidence: `phase6_smoke_results.json`.
- Phase 8 (`phase8_edge_1_4_runtime_results.json`): each of edges 1–4 driven in
  integrated mode via chatTrigger harnesses; 40/40 harness-success, 40/40 target-reached.

The combined evidence proves the pipeline is **structurally** end-to-end-capable
(every edge is activated and contract-compliant as a connector) but not yet
**semantically** end-to-end-capable from TR (the OR→PL handoff lacks one
orchestrator-side enrichment).

## 7. Artifacts

- `tests/generated/workflows/snapshots/_add_tr_chat_trigger_phase9.mjs` — TR chatTrigger precursor
- `tests/generated/workflows/snapshots/WF-TR-01_phase9_pre.json`
- `tests/generated/workflows/snapshots/WF-TR-01_phase9_put.json`
- `tests/generated/workflows/snapshots/_walk_phase9_chains.mjs` — chain walker
- `tests/generated/edges/phase9_full_primary_chain_results.json` — 4-case aggregated trace

## 8. Verdict

- ✅ TR-originated entry: **validated** (TR chatTrigger precursor adds a 3rd trigger
  alongside existing manual + telegram; no regression).
- ✅ Edges 1–3 contract compliance: **validated** integrated end-to-end.
- ⚠ Full primary chain TR→MO: **blocked at PL** by canonical `B9-OR-PL-PLANNER-CONTEXT-GAP`.
- ⏹ Downstream stack DI→ME→RA→SU→RC→MO: **not reached via TR**; previously validated
  in Phase 6 smoke + Phase 8 edge-runtime for their canonical edges.

Mission-level verdict: **MISSION_PARTIALLY_COMPLETE_WITH_BLOCKERS** — see Phase F final
summary.
