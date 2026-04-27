# E2E Reconciliation Doc Normalization After F9

> **Mission:** `E2E-RECONCILIATION-DOC-NORMALIZATION-AFTER-F9` (doc-only).
> **Date:** 2026-04-25.
> **Verdict:** `E2E_RECONCILIATION_DOC_NORMALIZED_AFTER_F9 = TRUE`.

## 1. Why this mission existed

The F9 mission closed earlier today reclassified F9 as
`F9_TELEMETRY_ONLY_MISMATCH` — the OR-side flags
(`planning_mode`, `module_execution_allowed`, `response_generation_allowed`,
`domain_writes_allowed`) are descriptive metadata, not gates. The
predecessor `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` still framed F9
as a real product blocker in several load-bearing places (executive
verdict, finding §5, open-blockers table, continuation path, final
verdict). Without normalization, the document carried active
contradictions between its top-of-file Update banners (current truth)
and its lower body (legacy framing).

## 2. Files modified

| File | Modification |
|---|---|
| `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | 7 in-place edits: status header replaced; §0 "Current truth" inserted; §1 Executive verdict marked SUPERSEDED; §5 F9 finding marked SUPERSEDED; §6 Open product blockers table marked SUPERSEDED; §7 Counts row "blocked by F9" annotated SUPERSEDED; §9 Continuation path marked SUPERSEDED; §10 Verdict line marked SUPERSEDED. Historical content preserved verbatim under each SUPERSEDED banner. |
| `docs/architecture/e2e/E2E_RECONCILIATION_DOC_NORMALIZATION_AFTER_F9.md` | New file (this one). |

No other file touched. No workflow JSON. No harness script. No DB.

## 3. Exact stale claims removed or marked SUPERSEDED

| # | Where | Stale claim | Replaced/marked by |
|---|---|---|---|
| 1 | Header `Status:` line | `**E2E_DOMAIN_WRITES_MODE_PRODUCT_DECISION_REQUIRED** — see results/F9_F13_F14_DOMAIN_WRITES_BLOCKER_REPORT.md` | New status: `E2E_TASK_CORRIDORS_PHASE1_READY = TRUE` + `F9_OR_LIVE_EXECUTION_GATING_DOC_ONLY_RECLASSIFIED`; legacy status explicitly marked SUPERSEDED with pointer to §0. |
| 2 | §1 Executive verdict | "the canonical chain runs in `plan_only` mode by default and never writes side-effects … Resolving this requires a product decision (`B-DOMAIN-WRITES-DEFAULT`)" | SUPERSEDED banner above §1 redirects to §0 Current truth, which empirically establishes the chain DOES write real `tasks` rows. |
| 3 | §1 continuation options (i)/(ii)/(iii) | Three options for "resolving" the F9 product gap | Marked obsolete inside the §1 SUPERSEDED banner; current continuation path lives in §0.2. |
| 4 | §5 F9 finding "⚠️ critical" | "These flags **default to false** … no actual write to `tasks` / `reminders` / `memory_items` / `outbound_delivery_ledger_claude_mcp` happens" | SUPERSEDED banner above the finding. The original 2026-04-25 cause-of-zero-rows is correctly attributed to F13 (ME stubs), now closed for `task_module`. |
| 5 | §6 row `B-DOMAIN-WRITES-DEFAULT (F9)` | "All side-effect invariants — basically the whole matrix's 'test side-effects' angle" gated by F9 | Whole §6 table marked SUPERSEDED. Current open blockers table lives in §0.1, listing F14, `improvement_module` stub, `reminder_module.{list,update,cancel}` stubs, and MO `MISSING_DELIVERY_TARGET` (KNOWN_FIXTURE_LIMITATION). |
| 6 | §7 row `SQL invariant green-on-merit \| 0 (all blocked by F9)` | Cited cause "blocked by F9" | Inline SUPERSEDED annotation: actual cause was F13 (ME stubs), since closed for `task_module`; task-corridors-phase1 produced 50/50 green SQL invariants. |
| 7 | §9 Continuation path | "Once `B-DOMAIN-WRITES-DEFAULT` is resolved …" | SUPERSEDED banner above §9 redirects to §0.2 (current path). |
| 8 | §10 Verdict line | `E2E_PHASE1_PARTIAL_WITH_PRODUCT_GAPS` + "Phase 0 SQL invariants: blocked by F9 (chain plan-only mode)" + "Phase 1 P0: not started" | SUPERSEDED banner above §10 redirects to header status + §0. Current cumulative verdicts and counts captured in the SUPERSEDED banner itself for quick reference. |

The historical paragraphs (§1, §5 F9, §6 table, §9, §10) are kept verbatim
under their respective SUPERSEDED banners so the lineage and the original
mission's framing remain auditable.

## 4. Current open blockers as restated in §0.1

For convenience:

- **F14** — PL.intentMap missing `store_memory`. Class: `WORKFLOW_BUG`. Single jsCode rewrite on `WF-PL-01.PL_Build_Planner_Input`. Smallest, highest-leverage next step.
- **`improvement_module` ME stub** — Class: `WORKFLOW_BUG`. Same pattern as the closed `task_module` mission; new Prep + DB + Result chain into `public.improvement_requests`.
- **`reminder_module.{list,update,cancel}` ME stubs** — out-of-scope until the future `REMINDER-DELIVERY-LAYER` mission is opened. Stubs do not write to `public.reminders`, so the ADR invariant is not at risk.
- **MO `MISSING_DELIVERY_TARGET`** — `KNOWN_FIXTURE_LIMITATION`. Already classified by the harness oracle; no further action.

F9 is no longer on the blockers list.

## 5. No-workflow-mutation confirmation

This mission did not call `n8n-patch.mjs replace`, did not call
`mcp__n8n__patch_workflow_nodes`, did not write to
`public.workflow_entity` directly, did not modify any harness file, and
did not run any workflow execution. All ten canonical workflows preserve
their pre-mission versionIds:

- WF-TR-01 `89b783f8…`, WF-EC-01 `78569035…`, WF-OR-01 `2d37a1f3…`,
  WF-PL-01 `898fa273…`, WF-DI-01 `8b10a865…`, WF-ME-01 `3804ec0e…`,
  WF-RA-01 `4a2be8b4…`, WF-SU-01 `4e7bc0d1…`, WF-RC-01 `6d3f5208…`,
  WF-MO-01 `4e0163b2…`.

Schema mutations: **0**. Path 5 used: **no**. Unauthorized MCP write: **no**.
Memory V2: not reopened.

## 6. Next recommended frontier

**F14 — add `store_memory` to PL.intentMap.** Same shape as the
predecessor `task_module` mission's PL patch: one jsCode rewrite on
`WF-PL-01.PL_Build_Planner_Input`, 0 node delta, 0 connection delta,
0 schema change, 0 Memory V2 reopen. This is the smallest contract-backed
step that materially unblocks memory-write corridors (C2 / C4 / C9 /
C10 write side / C11 write idempotency) of the rich matrix when those
corridors are emitted as `messages.intent='store_memory'`.

`E2E_RECONCILIATION_DOC_NORMALIZED_AFTER_F9 = TRUE`
