# common/contracts/

Cross-cutting contracts, playbooks, and the repo-level `CLAUDE.md`.

Contents (all copied byte-for-byte from the original repo):

- `CLAUDE.md` — repo-level Claude instructions (from repo root)
- `Module_Spec_*.md` — per-module contracts (from `docs/`)
- `ThreadResolutionContracts.md` — thread resolution contracts (from `workflows/contracts/`)
- `01_MASTER_OPERATING_CONTRACT.md`
- `02_AGENT_REGISTRY.md`
- `03_EXECUTION_LOOP.md`
- `04_N8N_MCP_PLAYBOOK.md`
- `05_DB_AUTONOMY_PLAYBOOK.md`
- `07_IMPEDIMENTS_AND_GUARDRAILS.md`
- `08_SCORECARD_AND_GATES.md`
- `11_DECISION_PRESETS.md`
- `12_TOOL_FAILURE_MATRIX.md`
- `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`
- `16_AUTONOMOUS_STOP_AND_RECOVERY.md`
- `17_ACTIVE_STAGE_LOCK.md` — the **template**; workflow-specific instances live under `workflows/WF-XX-01/docs/`.

All `NN_*` files above originate from `docs/ucenicul_claude_handoff_hardened/`.

> Contracts here are subordinate to `common/architecture/Architecture_Spec_v3_Ucenicul.md`.
