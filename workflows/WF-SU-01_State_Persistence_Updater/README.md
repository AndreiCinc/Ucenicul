# WF-SU-01 State / Persistence Updater

> **Status card**
> - n8n_id: `ENiYNfL3ul8AmmCB`
> - n8n_active: true
> - n8n_updatedAt: 2026-04-18T12:44:00Z
> - repo_status: `scaffold`
> - last_sync: (pending — see `workflow/last_sync.json` after first `wf-sync` run)
> - owner: TBD

## Role

WF-SU-01 is the State / Persistence Updater in the target pipeline. It receives the aggregated module result envelope from WF-RA-01 and applies durable writes across five classes: `execution_state_update`, `thread_state_update`, `memory_candidate_persistence`, `audit_persistence`, `domain_event_write`. It is the single point where cross-request durable state changes originate for a given execution context.

## Authority

- Target architecture: `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
- Workflow wiring: `docs/architecture/n8n_Workflow_Mapping.md`
- Memory model (relevant to `memory_candidate_persistence`): `docs/architecture/Memory_Model_Spec.md`

## Inputs

Aggregated module result envelope from WF-RA-01 (see `docs/contract.md` once populated). Carries `status_kind`, `result_type`, `payload`, `allowed_next_stage == 'WF-SU-01'`, `idempotency_key`.

## Outputs

State-update completion envelope with `allowed_next_stage == 'WF-RC-01'` and SHA256 lineage digest. On context mismatch or lineage error, returns a structured error envelope with `result_type == 'context_error'` or `'lineage_error'`.

## Subfolder tour

| Subfolder | Purpose |
|---|---|
| `workflow/` | n8n blueprint JSON (canonical artifact) |
| `docs/` | node_map, contract, flow, handoffs, sql_policy |
| `sql/` | per-query SQL files (one file per Postgres node) |
| `scripts/` | per-Code-node JavaScript files |
| `tests/` | unit + integration tests, fixtures |
| `reports/` | AUDIT / BUILD / CLOSURE / FIX_LOG / WORK_LOG / REMEDIATION / TEST_REPORT / PENDING_WIRING |
| `assets/` | screenshots / diagrams |

## Open gaps

- All subfolders are empty (scaffold state). First population pass scheduled per `inventory/WORKFLOW_COVERAGE_AUDIT.md` §F.3.
- Previous folder name `WF-SU-01_Sub_Workflow/` has been retired on 2026-04-19; any external reference to that path should be updated.

## Last updated

2026-04-19
