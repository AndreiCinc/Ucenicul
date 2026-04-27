# Phase 1 · Doc Normalization · Diff Summary

## File 1 — `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`

### Hunk A (§0.1 improvement_module row tail)

```diff
-| ~~**`improvement_module` ME stub**~~ | ~~`WORKFLOW_BUG`~~ | ~~Corridors that need feedback-capture as a domain side-effect~~ | **CLOSED 2026-04-25** by `IMPROVEMENT-MODULE-LIVE-EXECUTION-USER-READY`. WF-ME-01 versionId `3804ec0e…` → `161a612d…`; WF-PL-01 versionId `c4d9796d…` → `dce0febe…`. See top-of-file Update banner and `docs/architecture/improvement_module/live_execution/`. `list_improvements` deferred as `IMPROVEMENT_MODULE_LIST_FOLLOWUP`. |
+| ~~**`improvement_module` ME stub**~~ | ~~`WORKFLOW_BUG`~~ | ~~Corridors that need feedback-capture as a domain side-effect~~ | **CLOSED 2026-04-25** by `IMPROVEMENT-MODULE-LIVE-EXECUTION-USER-READY`. … ~~`list_improvements` deferred as `IMPROVEMENT_MODULE_LIST_FOLLOWUP`.~~ **`list_improvements` CLOSED 2026-04-27** by NEXT_3_FOLLOWUPS bundle (`IMPROVEMENT_MODULE_LIST_READY = TRUE`); WF-ME-01 versionId now `d2197ed5…` (66/88, +4 nodes / +7 connections — sub-action router + read-only list lane). |
```

### Hunk B (§0.1 — recall row turned CLOSED + reminder stubs row clarified + new Phase 2 row + MO row clarified)

```diff
-| **`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (low priority) | `WORKFLOW_BUG` | upstream `intent='recall_memory'` falls through PL routing | Add `recall_memory` to `intentMap` + `actionToModule`. ME has the handler. Lower priority because `search_memory` already covers most recall use cases. |
-| **`reminder_module.{list,update,cancel}` ME stubs** | `WORKFLOW_BUG` | Reminder list/update/cancel paths if and when product chooses to expose them as a CRUD lane (current stage routes only `create_reminder` → `task_module.create_task` per ADR) | Out of scope until the future `REMINDER-DELIVERY-LAYER` mission is opened. Stubs do not write to `public.reminders`, so the ADR invariant is not at risk. |
-| **MO `MISSING_DELIVERY_TARGET`** for e2e tenants | `KNOWN_FIXTURE_LIMITATION` | `assert_one_outbound_for_case` in raw form for any e2e tenant without a real Telegram chat target | Already classified by `e2e_oracle.mjs` lines 76-92. No further action. |
+| ~~**`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (low priority)~~ | ~~`WORKFLOW_BUG`~~ | ~~upstream `intent='recall_memory'` falls through PL routing~~ | **CLOSED 2026-04-27** by NEXT_3_FOLLOWUPS bundle … |
+| **`reminder_module.{list,update,cancel}` ME stubs** | `WORKFLOW_BUG` (deferred) | Reminder list/update/cancel paths if and when product chooses to expose them as a CRUD lane … | Out of stage. The new `REMINDER-DELIVERY-LAYER` Phase 1 ships **delivery only** (scheduler + ledger), NOT a CRUD lane on `public.reminders`. … See `WF-RD-01` declaration in `n8n_Workflow_Mapping.md` §11. |
+| **`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`** (next frontier) | `OPEN` | Phase 1 v1 is `READY_EXCEPT_LIVE_SANDBOX_PROBE`: scheduler + audit ledger live, dry-run + idempotency proven, but `RD_Live_Send_PLACEHOLDER` is a NoOp and no controlled send has been performed. | Replace NoOp with `n8n-nodes-base.telegram` … Gated on operator providing the sandbox chat id. |
+| **MO `MISSING_DELIVERY_TARGET`** for e2e tenants | `KNOWN_FIXTURE_LIMITATION` | … | Already classified by `e2e_oracle.mjs` lines 76-92. No further action. The new `WF-RD-01` Phase 1 mirrors the same convention: missing target ⇒ `delivery_status='skipped_missing_target'` (not an error). |
```

### Hunk C (§0.2 — close steps 6–9, add step 10)

```diff
-6. **`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (lower priority) — add `recall_memory` to PL.intentMap. …
-7. **`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** (deferred from prior mission).
-8. **Phase 2 rich matrix run** with the four follow-up patches in place to fully close C7 + open C4.
-9. **(Optional, low priority)** doc-only hygiene pass on `workflows/WF-OR-01_Orchestrator/docs/WF-OR-01_CONTRACTS.md` §4 …
+6. ~~**`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (lower priority)~~ — **DONE 2026-04-27** (NEXT_3_FOLLOWUPS bundle, Mission 2). `MEMORY_RECALL_PL_INTENTMAP_READY = TRUE`.
+7. ~~**`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** (deferred from prior mission)~~ — **DONE 2026-04-27** (NEXT_3_FOLLOWUPS bundle, Mission 3). `IMPROVEMENT_MODULE_LIST_READY = TRUE`.
+8. ~~**Phase 2 rich matrix run** …~~ — **DONE 2026-04-26** (FULL_240_RERUN + FULL_240_VARIANT_SWEEP); 12/12 corridors GREEN end-to-end. Closed by `FULL_240_VARIANT_SWEEP_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`.
+9. ~~**(Optional, low priority)** doc-only hygiene pass …~~ — **OPTIONAL, STILL OPEN** (no functional impact; deferred indefinitely).
+10. **`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`** (current next frontier) — replace `RD_Live_Send_PLACEHOLDER` (NoOp) with `n8n-nodes-base.telegram`, onboard a sandbox `telegram_chat_id` on a single non-production tenant, fire one fixture in live mode … Gated on operator providing the sandbox chat id.
```

## File 2 — `docs/architecture/Module_Registry_Ucenicul.md`

### Hunk D (`reminder_module` section — added 2026-04-27 banner)

```diff
 ### reminder_module

 > **Current-stage status (2026-04-25, per `decisions/ADR-REMINDER-AS-TASK-LAYER.md`):**
 > Deferred as a CRUD module. …
 > deferred for the current implementation stage.
+>
+> **Update 2026-04-27 (REMINDER-DELIVERY-LAYER Phase 1):** The delivery
+> half of the long-term `reminder_module` contract is now opened — but
+> as a **scheduler workflow + audit ledger**, NOT as a CRUD module. New
+> canonical workflow `WF-RD-01_Reminder_Delivery_Scheduler`
+> (id `nc7rTC3hjO9QqbXs`, versionId `894ad514-7ce7-4b35-90d4-6c5190f01408`,
+> 11 nodes / 14 connections, **active=false**, `availableInMCP=true`)
+> consumes `public.tasks` rows whose `due_at <= NOW()` … `RD_Live_Send_PLACEHOLDER`
+> is a `n8n-nodes-base.noOp` until the operator authorises a sandbox
+> Telegram chat id. **`public.reminders` remains untouched** — the
+> ADR invariant holds. The CRUD `{list_reminders, update_reminder,
+> cancel_reminder}` capabilities below remain deferred. Verdict:
+> `REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`.
+> Next mission: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`.
```

## File 3 — `docs/architecture/n8n_Workflow_Mapping.md`

**No diff in Mission 1.** §11 declaration of `WF-RD-01` was already added during Phase 1 execution. Verified.

## Mission-local files (new)

- `READ_STATUS.md`
- `DRIFT_REGISTER.md`
- `NORMALIZATION_PLAN.md`
- `DOC_DIFF_SUMMARY.md` (this file)
- `CURRENT_TRUTH_AFTER_PHASE1.md`
- `CLOSEOUT.md`
