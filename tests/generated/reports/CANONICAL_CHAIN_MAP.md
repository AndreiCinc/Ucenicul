# CANONICAL_CHAIN_MAP — Ucenicul Autonomous Test & E2E Mission

Run ID: `run_2026-04-19_autonomous_test_e2e`
Precedence stack: `17_CHAIN_DISCOVERY_AND_PRECEDENCE_POLICY.md` (precedence levels P1..P5).
Evidence source: live n8n topology captures via `mcp__...__get_workflow_details` on 2026-04-19, cross-checked against `docs/architecture/n8n_Workflow_Mapping.md` (P3) and per-workflow `readiness/` docs.

> **Correction vs. prior state** — Prior ledger listed `WF-RA-01 → WF-RC-01` as the primary edge and `WF-RA-01 → WF-SU-01` as a side-effect. Live topology inspection of `WF-RA-01` (`5RcNLtxNjAHJsZPE`) and `WF-SU-01` (`ENiYNfL3ul8AmmCB`) proves that the primary handoff from RA is to SU, and SU is the precursor to RC. The prior ledger's `RA → RC` edge is reclassified as `EDGE_NON_CANONICAL` and the folder retained only as rejected audit trail.

## 1. Canonical chain order

```
WF-TR-01 → WF-EC-01 → WF-OR-01 → WF-PL-01 → WF-DI-01 → WF-ME-01 → WF-RA-01 → WF-SU-01 → WF-RC-01 → WF-MO-01
```

Nine primary edges in total. No active `Execute Workflow` connectors exist on any canonical edge; RC→MO has disabled infrastructure; the remaining eight have no infrastructure at all.

## 2. Per-edge decision table

| # | Edge | Type | Decision | Evidence (live `allowed_next_stage` emission / callable trigger) | Connector state | Mapping file |
|---|---|---|---|---|---|---|
| 1 | WF-TR-01 → WF-EC-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | Architecture (P3) requires TR before EC. TR emits thread-resolved payload; EC keys its upsert on `idempotency_key` derived from TR output. | none | `tests/generated/chains/WF-TR-01__TO__WF-EC-01/CHAIN_MAPPING.md` |
| 2 | WF-EC-01 → WF-OR-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | EC writes `execution_contexts`; OR reads it. No `allowed_next_stage` emitted by EC in live (upsert is terminal in WF-EC-01). Downstream handoff carried via DB + envelope. | none | `tests/generated/chains/WF-EC-01__TO__WF-OR-01/CHAIN_MAPPING.md` |
| 3 | WF-OR-01 → WF-PL-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | `OR_Return_Result` emits `allowed_next_stage='WF-PL-01'`, `result_type='handoff'`. | none | `tests/generated/chains/WF-OR-01__TO__WF-PL-01/CHAIN_MAPPING.md` |
| 4 | WF-PL-01 → WF-DI-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | `PL_Generate_Plan` emits `allowed_next_stage='WF-DI-01'`. | none | `tests/generated/chains/WF-PL-01__TO__WF-DI-01/CHAIN_MAPPING.md` |
| 5 | WF-DI-01 → WF-ME-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | `DI_Build_Dispatch_Payload` emits `allowed_next_stage='WF-ME-01'`. `ME_Input` is `executeWorkflowTrigger` (ME is already a callable subworkflow). | none | `tests/generated/chains/WF-DI-01__TO__WF-ME-01/CHAIN_MAPPING.md` |
| 6 | WF-ME-01 → WF-RA-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | `ME_Return_Result` emits `allowed_next_stage='WF-RA-01'`. `RA_Input` is `executeWorkflowTrigger`. | none | `tests/generated/chains/WF-ME-01__TO__WF-RA-01/CHAIN_MAPPING.md` |
| 7 | WF-RA-01 → WF-SU-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | `RA_Build_Downstream_Envelope` emits `allowed_next_stage='WF-SU-01'`. `SU_Input` is `executeWorkflowTrigger`. | none | `tests/generated/chains/WF-RA-01__TO__WF-SU-01/CHAIN_MAPPING.md` |
| 8 | WF-SU-01 → WF-RC-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | `SU_Build_Downstream_Envelope` emits `allowed_next_stage='WF-RC-01'`, `response_generation_allowed=true`. | none | `tests/generated/chains/WF-SU-01__TO__WF-RC-01/CHAIN_MAPPING.md` |
| 9 | WF-RC-01 → WF-MO-01 | primary | EDGE_CONFIRMED_AS_CANONICAL | `RC_Build_Output_Envelope` emits `allowed_next_stage='MESSAGE_OUT'`. `RC_Dispatch_To_MO_01_SUBCALL` is an `executeWorkflow` node pointing to `OooZdC0DgsDR6gm0` (MO) but is **disabled**. `RC_Prepare_MO_01_Handoff` is a code node also disabled. Gated by `dispatch_to_mo_01 === true`. | disabled infrastructure | `tests/generated/chains/WF-RC-01__TO__WF-MO-01/CHAIN_MAPPING.md` |
| — | WF-RA-01 → WF-RC-01 | rejected | EDGE_NON_CANONICAL | Prior classification. Live RA does not emit `allowed_next_stage='WF-RC-01'` — its only downstream stage is `WF-SU-01`. Retained as folder ghost for audit. | n/a | `tests/generated/chains/WF-RA-01__TO__WF-RC-01/CHAIN_MAPPING.md` |

## 3. Callable subworkflow readiness

A canonical edge can only be activated when the target workflow has an `executeWorkflowTrigger` (n8n callable) as its first input node.

| Target | Callable? | First trigger node type | Action required |
|---|---|---|---|
| WF-EC-01 | to verify | (upsert path starts from generic trigger) | confirm trigger node; refactor if necessary |
| WF-OR-01 | unverified | (legacy manual + scheduler triggers) | refactor to executeWorkflowTrigger |
| WF-PL-01 | unverified | (legacy trigger layout) | refactor to executeWorkflowTrigger |
| WF-DI-01 | unverified | (legacy trigger layout) | refactor to executeWorkflowTrigger |
| WF-ME-01 | **yes** | `executeWorkflowTrigger` | none |
| WF-RA-01 | **yes** | `executeWorkflowTrigger` | none |
| WF-SU-01 | **yes** | `executeWorkflowTrigger` | none |
| WF-RC-01 | unverified | (legacy trigger layout) | refactor to executeWorkflowTrigger |
| WF-MO-01 | **yes** | `executeWorkflowTrigger` | none |

TR has no downstream callable obligation (it is a chain entry, not an edge target) but its exit node will need an `Execute Workflow` added that calls EC.

## 4. Connector gap summary

Total canonical primary edges: **9**
Active `Execute Workflow` connectors: **0**
Disabled-infrastructure edges: **1** (RC→MO)
No-infrastructure edges: **8**

Implication for Phase 3: connector activation is required on every edge. Where the target is not yet callable, it will also need a subworkflow refactor in the same patch cycle.

## 5. Execution mode defaults

- Connector mechanism: `Execute Workflow` (synchronous, wait-for-child-completion) — per `20_CONNECTOR_PATCH_AND_SUBWORKFLOW_POLICY.md`.
- Parameter passing: full handoff envelope from the source's `*_Return_Result` payload.
- Idempotency: every target honours `idempotency_key` already present on the envelope (EC/ME/RA/SU contracts all derive their ledger keys from it).

## 6. DB touchpoint coverage per edge

| Edge | Required DB assertion (synthetic) |
|---|---|
| TR→EC | `execution_contexts` row inserted with idempotency_key derived from TR payload (ON CONFLICT DO NOTHING) |
| EC→OR | OR reads `execution_contexts` row just written; no new writes |
| OR→PL | no DB write required; envelope-level handoff only |
| PL→DI | no DB write required; envelope-level handoff only |
| DI→ME | ME writes `tasks` when module=`task_module`; otherwise no domain write |
| ME→RA | RA reads `module_results` (or receives inline via envelope) |
| RA→SU | SU applies write classes to `execution_contexts`, `threads`, `tasks`, `reminders`, `messages`, `rag_memories` |
| SU→RC | no DB write required; envelope-level handoff only |
| RC→MO | MO writes `outbound_delivery_ledger_claude_mcp` (idempotency ledger) |

## 7. Final chain classification

- 9 primary edges — all `EDGE_CONFIRMED_AS_CANONICAL`.
- 0 side-effect edges.
- 1 rejected edge (`WF-RA-01__TO__WF-RC-01`) retained as folder ghost for audit.
- 0 provisional / deferred edges.
