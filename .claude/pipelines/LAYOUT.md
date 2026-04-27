# .claude/pipelines/ — LAYOUT

> **Role of this document:** describes how the `pipelines/` namespace inside `.claude/` is organized.
> This LAYOUT.md would normally live at `pipelines/ucenicul-pipeline/LAYOUT.md`, but the `ucenicul-pipeline/` subfolder is read-only under the current mount on this checkout. LAYOUT.md is therefore placed one level up, at `pipelines/LAYOUT.md`, to serve the same navigational purpose.

## Current state

| Path | State |
|---|---|
| `pipelines/ucenicul-pipeline/` | empty placeholder (read-only under current mount) |

## Intended shape of `pipelines/ucenicul-pipeline/` when populated

| Subpath | Contains |
|---|---|
| `README.md` | Purpose, usage, entry points for Claude's autonomous pipeline |
| `LAYOUT.md` | Structural map (this document, relocated up one level for now) |
| `prompts/` | Prompt templates used by pipeline stages |
| `manifests/` | Pipeline manifest files (stage graphs, state declarations) |
| `notes/` | Stage notes, working notes, persisted pointers |
| `archive/` | Superseded pipeline artifacts kept for auditability |

## Boundary

Pipeline artifacts under `ucenicul-pipeline/` must not cross into:

- `../../docs/` (product documentation)
- `../../workflows/` (product n8n workflows)
- `../../src/` (product runtime code)

Cross-promotion is allowed only via an explicit entry in `../../inventory/move_plan.json` with `reason:` beginning with `promoted`.

## Authority

This folder is subordinate to `../../docs/architecture/Architecture_Spec_v3_Ucenicul.md`. It does not define product architecture.
