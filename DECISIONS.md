# DECISIONS.md

Records of architectural or structural decisions beyond what is captured in the specs.

## 2026-04-19 D-001 — Dual-root separation

Product root and Claude pipeline root are reconciled but NEVER merged. Pipeline assets stay under `.claude/pipelines/ucenicul-pipeline/` and only promote into `workflows/` or `docs/` when they are canonical product artifacts (e.g. live runtime n8n JSONs, RA-01/SU-01 source packs). Every promotion is logged in `inventory/move_plan.json` with a `reason`.

## 2026-04-19 D-002 — Canonical copy preference in duplicates

When a file exists in both roots (same sha256), the canonical copy is selected by role rank:
`workflow_owned < repo_root_owned < shared_technical < claude_pipeline_asset < ambiguous < archive`.
Non-canonical copies are routed to `archive/superseded/duplicates/` so no bytes are lost.

## 2026-04-19 D-003 — Previous restructure archived

`ucenicul_restructured_candidate/` (the prior single-root attempt) is archived in full under
`archive/superseded/ucenicul_restructured_candidate/` because it was built under a different assumption (one source, not two).
