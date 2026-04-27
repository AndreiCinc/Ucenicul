# WF-TR-01 / workflow / patches

Overlay / partial-export patches for the WF-TR-01 Thread Resolver workflow.

- `WF-TR-01_PATCHED_switch_fix.json` — partial export containing only `nodes`, `connections`, `settings` (no top-level `name` or `meta`). Addresses Switch-node routing fixes. The canonical full workflow is `../WF-TR-01_Thread_Resolver.json`.

Rule: patches are NEVER the canonical workflow — they must be applied on top of the canonical blueprint.
