# .claude/

Claude-facing metadata and orchestration material for the Ucenicul repo. **Not product source** — product source lives in `../workflows/`, `../docs/`, `../src/`, `../db/`, etc.

## Current state at closure (2026-04-19)

| Path | State | Notes |
|---|---|---|
| `pipelines/` | partially populated | Holds `LAYOUT.md` (relocated from `pipelines/ucenicul-pipeline/LAYOUT.md` because that subfolder is read-only under the current mount). |
| `pipelines/ucenicul-pipeline/` | **empty placeholder (read-only on current mount)** | Reserved for Claude's autonomous execution / orchestration pipeline. Not currently populated in this checkout. See `pipelines/LAYOUT.md` for the intended shape. |
| `skills/` | **empty placeholder** | Reserved for per-repo skills. No skills defined yet. |
| `_removed_test.txt` | sandbox vestige | Write-capability probe created during the closure pass; could not be deleted under the current mount. Safe to ignore. |

## Honesty statement

An earlier version of this README claimed the pipeline content was "preserved byte-for-byte from the original `.claude/ucenicul-pipeline/` source root at reorg time". That statement did not match the actual state of this checkout, where `pipelines/ucenicul-pipeline/` is empty. The current README above describes the real state. If pipeline content needs to live here, it must be populated from the source root in a separate, explicit pass; this folder is not a silent import.

## Boundary rule

Pipeline assets do **not** cross into product folders unless explicitly promoted in `../inventory/move_plan.json` with a `reason:` field starting with `promoted`. Conversely, product docs do **not** land in `.claude/`.
