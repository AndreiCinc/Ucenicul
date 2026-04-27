# workflow/

## Purpose

Canonical n8n implementation for WF-TR-01 Thread Resolver.

## Contents

- `WF-TR-01_Thread_Resolver.json` — **canonical** full workflow export. Source of truth for implementation.
- `patches/` — overlay patches on top of the canonical export. See `patches/README.md`.

## Canonicality

- `WF-TR-01_Thread_Resolver.json` is the single source of truth for workflow implementation per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §4.B.
- Patches are overlays. A patch is NEVER the canonical workflow — it must be applied on top of the canonical export.

## Not source of truth

- Topology prose in `../docs/` (if any) is a supporting view only; the `connections` block of the canonical JSON is authoritative.
- Status (that lives in `../state/STATE__WF-TR-01.json`).
