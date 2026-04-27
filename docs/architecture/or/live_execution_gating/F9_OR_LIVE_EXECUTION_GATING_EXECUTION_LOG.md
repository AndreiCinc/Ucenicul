# F9 — OR Live Execution Gating · Execution Log

> **Mission:** `F9-OR-LIVE-EXECUTION-GATING-DISCOVERY-AND-SAFE-FIX`
> **Doc status:** mission-local working log. Subordinate to
> `docs/architecture/Architecture_Spec_v3_Ucenicul.md` and
> `docs/architecture/n8n_Workflow_Mapping.md`.

## 1. Run identity

| Field | Value |
|---|---|
| Start timestamp (session) | 2026-04-25 |
| Repo root (host) | `C:\Users\andre\Projects\Ucenicul` |
| Repo root (sandbox) | `/sessions/clever-magical-wozniak/mnt/Ucenicul` |
| Mission predecessor | `PROJECT-E2E-RICH-TEST-MATRIX-TASK-CORRIDORS-PHASE1` (closed earlier today; verdict `READY = TRUE`) |
| Predecessor predecessor | `TASK-MODULE-LIVE-EXECUTION-USER-READY` |

## 2. Live workflow versions

| Workflow | id | versionId | nodes | active |
|---|---|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | `89b783f8-510a-4275-999e-4853490c580a` | 24 | ✅ |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035-997d-4514-bdfe-6c6679b78795` | 11 | ✅ |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3-e30a-4279-a952-2e4b1c7297fa` | 13 | ✅ |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `898fa273-68d3-4443-b6f9-9990d1739bb2` | 16 | ✅ |
| WF-DI-01 | `abqYINcXr3JAhGGk` | `8b10a865-39c4-4aa6-bee0-4ec75468ebed` | 16 | ✅ |
| WF-ME-01 | `uq26nh1grIpnHju0` | `3804ec0e-cc32-417d-9054-253ed14dcd73` | 59 | ✅ |
| WF-RA-01 | `5RcNLtxNjAHJsZPE` | `4a2be8b4-08d1-43b4-9adf-376b6c30c18a` | 16 | ✅ |
| WF-SU-01 | `ENiYNfL3ul8AmmCB` | `4e7bc0d1-65fa-4f62-b96a-7035a99d4308` | 18 | ✅ |
| WF-RC-01 | `TClXgmO8H8zsSwMb` | `6d3f5208-c963-4a02-811d-5a0d12d7ac6a` | 18 | ✅ |
| WF-MO-01 | `OooZdC0DgsDR6gm0` | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | 18 | ✅ |

These are the post-task-module-mission baselines. F9 does **not** require
mutating any of these unless the audit proves a real gate is fighting the
chain.

## 3. Layer-0 docs read

- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` — task corridors phase 1 closed; F9 explicitly named as a separate frontier.
- `docs/architecture/e2e/task_corridors_phase1/TASK_CORRIDORS_PHASE1_CLOSEOUT.md` — verdict `E2E_TASK_CORRIDORS_PHASE1_READY = TRUE`; F9 listed under "remaining blockers" but explicitly out-of-scope of that mission.
- `docs/architecture/task_module/live_execution/TASK_MODULE_CLOSEOUT.md` — verdict `TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`; F9 listed under "Known limitations" §3 with the load-bearing finding: "ME's validator only checks PL's `dispatcher_input` flags, NOT the OR-side `orchestrator_input` flags. The chain works correctly for task domain writes because ME does not consult OR's `domain_writes_allowed`."
- `docs/architecture/e2e/results/F9_F13_F14_DOMAIN_WRITES_BLOCKER_REPORT.md` — §1 already conclusively states: "These flags describe OR's own behavior ('during the OR stage, we don't plan / dispatch / respond / write'). They are emitted into the handoff payload as `orchestrator_input.*` for downstream stages to **read**, but they are **NOT enforced gates** that prevent ME from writing. ME's handler code makes no reference to these flags. So F9, as originally framed in the prior reconciliation, is **not the actual blocker**." F13 (now closed) was the real blocker.

## 4. Layer-1 docs read

- `docs/architecture/n8n_Workflow_Mapping.md` — chain mapping; PostgreSQL query policy; apply-channel rules.
- `docs/architecture/Architecture_Spec_v3_Ucenicul.md` — system spec (read on access).
- `docs/architecture/Module_Registry_Ucenicul.md` — `task_module` user-ready entry (post-predecessor); `reminder_module` deferred per ADR.

## 5. Working hypothesis (pre-probe)

F9 is, with high confidence, **`F9_TELEMETRY_ONLY_MISMATCH`** — the
hardcoded OR-side flags
(`planning_mode='plan_only'`, `module_execution_allowed=false`,
`response_generation_allowed=false`, `domain_writes_allowed=false`) describe
OR's own stage behavior and are NOT enforced as gates downstream. Empirical
evidence already captured by predecessor missions:

- task_module writes real `tasks` rows even though OR sets `domain_writes_allowed=false`;
- memory_module writes real `memory_items` rows in production missions even though OR says `module_execution_allowed=false`;
- the chain has been GREEN end-to-end through 56 task-corridor cases just hours before this mission.

The audit in §6 will rigorously verify by grepping every consumer for
references to those four field names. Probes in §7 will prove no
regression.

## 6. Audit plan

1. Inspect `WF-OR-01.OR_Build_Handoff_Payload.parameters.jsCode` to confirm the producer (already read).
2. Grep every Code/Switch node in `WF-PL-01`, `WF-DI-01`, `WF-ME-01`, `WF-RA-01`, `WF-SU-01`, `WF-RC-01`, `WF-MO-01` for the strings `module_execution_allowed`, `domain_writes_allowed`, `response_generation_allowed`, `planning_mode`. Distinguish reads from `orchestrator_input.*` versus reads from `dispatcher_input.*` (PL-emitted; semantically different).
3. Cross-reference the OR contract doc (`workflows/WF-OR-01_Orchestrator/docs/WF-OR-01_CONTRACTS.md` §4).
4. Confirm whether each occurrence is a gate (rejects/branches the chain) or pure passthrough.
5. Classify F9.

## 7. Probe matrix (post-classification)

Sequential, scoped by tenant + thread + fire_iso:

| # | Intent | Goal |
|---|---|---|
| 1 | `create_task` | Confirm task path still writes a real row (no regression). |
| 2 | `list_tasks` | Confirm read-only path. |
| 3 | `briefing` (response-only) | Confirm chain reaches MO with response_module-only plan; memory not touched. |
| 4 | `search_memory` | Confirm Memory V2 read path still GREEN. |
| 5 | `capture_feedback` | Document whether `improvement_module` is still a stub; confirm OR flags are not the gate. |
| 6 | `create_reminder` | Confirm PL re-route still produces a `tasks` row, not `reminders`. |

Run-tag `f9probe-2026-04-25`.

## 8. Decisions

- **No workflow mutation** unless the audit + probes prove a real gate.
- **No Path 5.** No duplicate workflows. No unauthorized MCP write.
- **No Memory V2 reopen.**
- **No task_module change** — task corridors are GREEN.
- If F9 is `F9_TELEMETRY_ONLY_MISMATCH` (hypothesis), the fix is doc-only:
  reclassify F9 in the project reconciliation doc and update the OR
  contract doc to mark §4 as "telemetry-only / not a gate".

## 9. No-duplicate-workflow declaration

This mission is read-only against workflows by default. Snapshots, if
written, live under
`docs/architecture/or/live_execution_gating/artifacts/`.

## 10. Phase plan

1. Audit producer + consumers (§6) → classify F9.
2. Run probe matrix (§7) → confirm no regression.
3. Decision: doc-only or contract-backed patch.
4. Closeout + reconciliation update.

Verdict candidate: `F9_OR_LIVE_EXECUTION_GATING_DOC_ONLY_RECLASSIFIED`,
unless the audit surprises us.
