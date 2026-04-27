# common/

Shared, cross-workflow artifacts that govern the whole Ucenicul system.

> **This folder is a reorganized copy.** It is not a new source of truth on its own.
> The canonical authority remains `common/architecture/Architecture_Spec_v3_Ucenicul.md`
> (and its subordinates) as stated in the repo's original `CLAUDE.md`.

## Subfolders

- `architecture/` — canonical architecture specs, migration plan, module registry, DB schema docs, n8n workflow mapping, memory model.
- `contracts/` — master operating contract, module spec contracts, agent registry, execution loop, playbooks, decision presets, tool failure matrix, stage lock template, repo-level `CLAUDE.md`.
- `runtime/` — runtime canonical target, module contracts, execution context evolution, response composer contract.
- `shared_reports/` — stage templates, report templates, documentation verification checklist.
- `shared_test_utils/` — cross-workflow test orchestration scripts, fixture generators, contract/scoring validators, replay verifier, test fixture registry, shared setup SQL.
- `historical_reference/` — original repo/handoff READMEs, file scorecard, generic-root ROUTE_MAP snapshot.

## Non-destructive reorganization

No source file was modified, renamed in place, or deleted. Every file here is a byte-for-byte copy of an existing file under the original repo root.
