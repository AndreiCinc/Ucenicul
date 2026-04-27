# ARCHIVED STUB — Not a workflow

> **Status:** archived stub / vestigial / mount-locked
> **Do not treat as an active workflow.**

## What this is

This folder was created by a naming-mismatch during Phase 3R cross-linking under the (incorrect) name `WF-EC-01_Executor_Closer`. The real cross-link it was meant to carry has since been moved to its correct home:

    ../WF-EC-01_Execution_Context/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md

## Why it is still here

The folder cannot be deleted due to a OneDrive / mount limitation on this checkout. It is retained as an empty stub for transparency rather than being silently removed.

## What changed in the 2026-04-19 closure pass

- Folder was renamed from `WF-EC-01_Executor_Closer` to `_ARCHIVED_Executor_Closer_stub` to eliminate the WF code collision with the canonical `WF-EC-01_Execution_Context/`.
- The WF code `WF-EC-01` is now uniquely owned by `WF-EC-01_Execution_Context/`.
- The empty standard subfolders (`workflow/`, `sql/`, `scripts/`, `tests/`, `reports/`, `assets/`) that were created during a transient fix step are retained because they cannot be removed under the current mount; they are not meaningful content.

## Canonical pointer

The canonical execution-context workflow is at:

    ../WF-EC-01_Execution_Context/

Any reference in older docs to "Executor Closer" as a separate workflow is obsolete and should be re-read as "the closure half of WF-EC-01 Execution Context".

## Index / navigation

This folder is deliberately excluded from `workflows/README.md`. It is documented only here so an agent that stumbles into the folder has a clear explanation.
