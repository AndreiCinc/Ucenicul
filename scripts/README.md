# scripts/

| Subfolder | Purpose |
|---|---|
| `repo_maintenance/` | Repo hygiene scripts |
| `migration/` | One-off migration helpers |
| `validation/` | Validation helpers |
| `workflow_shared/` | Shared workflow tooling: `generate_fixtures.js`, `lint_workflow.js`, `validate_contract.js`, `validate_scoring.js`, `verify_replay.js`, `test_all.sh` |

At the 2026-04-19 reorg, only `workflow_shared/` was populated (from `workflows/scripts/*.{js,sh}` in PRODUCT_ROOT).
