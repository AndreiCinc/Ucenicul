# RUN_QUEUE

Batch: Ucenicul workflows-in-scope, 2026-04-19, Cowork autonomous pass.

Risk order: `STANDARD` entries first (they hold active n8n counterparts), `_ARCHIVED_` last.

workflow_code | folder | tier_hint | risk | live_scope | status | notes
---|---|---|---|---|---|---
WF-TR-01 | workflows/WF-TR-01_Thread_Resolver | standard | medium | allowed (not executed — no mount access) | QUARANTINED | folder unreadable, unwritable; see QUARANTINE_NOTE__WF-TR-01.md
WF-EC-01 | workflows/WF-EC-01_Execution_Context | standard | medium | allowed (not executed) | QUARANTINED | QUARANTINE_NOTE__WF-EC-01.md
WF-OR-01 | workflows/WF-OR-01_Orchestrator | standard | medium | allowed (not executed) | QUARANTINED | QUARANTINE_NOTE__WF-OR-01.md
WF-PL-01 | workflows/WF-PL-01_Plan_Generation | standard | medium | allowed (not executed) | QUARANTINED | QUARANTINE_NOTE__WF-PL-01.md
WF-DI-01 | workflows/WF-DI-01_Dispatcher | standard | medium | allowed (not executed) | QUARANTINED | QUARANTINE_NOTE__WF-DI-01.md
WF-ME-01 | workflows/WF-ME-01_Module_Execution | standard | medium | allowed (not executed) | QUARANTINED | QUARANTINE_NOTE__WF-ME-01.md
WF-RA-01 | workflows/WF-RA-01_Result_Aggregator | standard | medium | allowed (not executed) | QUARANTINED | QUARANTINE_NOTE__WF-RA-01.md
WF-SU-01 | workflows/WF-SU-01_State_Persistence_Updater (baseline) / WF-SU-01_Sub_Workflow (audit-staged rename) | standard | medium-high | allowed (not executed) | QUARANTINED | naming drift unverifiable; QUARANTINE_NOTE__WF-SU-01.md
_ARCHIVED_Executor_Closer_stub | workflows/_ARCHIVED_Executor_Closer_stub | archived | low | n/a | QUARANTINED | archived; QUARANTINE_NOTE___ARCHIVED_Executor_Closer_stub.md

## Out-of-scope / documented gaps (not in the 9-entry queue)

Per `WORKFLOW_COVERAGE_AUDIT.md` §C "missing folders":

- `WF-RC-01_Response_Composer` — absent in repo; live in n8n. Cannot be created in this mount.
- `WF-MO-01_Message_Out` — absent in repo; live in n8n. Cannot be created in this mount.
- `WF-00_Morning_Briefing` — active cron in n8n, absent in repo. Cannot be created in this mount.
- `WF-01 Message Receiver` — inactive in n8n, absent in repo. Status already "frozen / pending decision" per audit.
- Monolith `brain_main_inbound_mvp_v6_preprocessor_fixed` — active in n8n, no repo folder; orientation doc absent at `docs/archive/brain_main_monolith_orientation.md`.
- `DEPRECATED__WF-MO-01_langchain_stub` — inactive in n8n, no repo folder. No action proposed; see audit §B row 14.

These are OUT_OF_SCOPE for the 9-WF standardization batch and remain documented as pre-existing gaps, not new findings.

## Queue invariants (self-check)

- 9 queue entries = 8 active WFs from baseline §6 + 1 archived entry. ✓
- Each queued entry has exactly one matching WORKFLOW_RUN_RECORD and QUARANTINE_NOTE artefact in this folder. ✓
- No queue entry is silently dropped. ✓
- Max remediation passes per workflow = 3 (per RUN_MISSION.md). Actual passes per workflow = 0 (impossible under this mount). ✓

---

> Generated run artifact. 2026-04-19.
