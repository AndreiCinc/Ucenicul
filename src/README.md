# src/

Runtime source code. Separated by concern:

- `brain/` — intent classification + field validation (governed by `brain_contract.json`)
- `shared/` — cross-module utilities and constants
- `parsers/` — message parsers
- `utils/` — low-level helpers

Note: at the 2026-04-19 reconciliation, no classified source files were attributed to `src/` yet. Subfolders exist as scaffolding for ongoing migration.
