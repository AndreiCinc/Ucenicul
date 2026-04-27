# archive/unresolved/

Reserved holding bucket for files that survive content review but cannot be placed deterministically. Closely related to `inventory/ambiguous_holding/` but distinguished by *post-review* status:

- `inventory/ambiguous_holding/` — classifier couldn't decide from metadata alone
- `archive/unresolved/` — files the content-aware pass confirmed are unresolvable without operator input

At reorg close (2026-04-19), this folder is empty — every file was placed after content review. The folder exists as a safety net for future migrations.
