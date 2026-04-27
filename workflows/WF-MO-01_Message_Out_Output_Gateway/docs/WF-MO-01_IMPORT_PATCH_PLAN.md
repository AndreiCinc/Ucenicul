# WF-MO-01_IMPORT_PATCH_PLAN

## Purpose
Safely create or patch the live terminal delivery workflow from this pack.

## Important safety rules
1. Read the live workflow first.
2. Prefer patch-safe mutation paths over destructive full-body overwrite.
3. Do not bind or mutate secrets blindly.
4. Re-read the workflow after every mutation.
5. Do not claim closure without real provider-send proof and post-test drift verification.

## Live implementation sequence
1. Read the live target workflow or create a new workflow shell if none exists.
2. Import or patch the workflow body from `WF-MO-01_Message_Out.json`.
3. Preserve or bind:
   - real Telegram / channel-send credentials
   - real Postgres credentials
4. Replace `MO_Send_Channel_PLACEHOLDER` with the real provider-send node:
   - preferred first target: Telegram send path already used elsewhere in the project
   - fallback: HTTP Request to provider API with secrets sourced from credentials / env
5. Re-read the workflow and verify shell shape:
   - node count
   - edge count
   - triggers
   - switches
   - read nodes
   - provider-send node present
6. Seed fixtures from `workflows/sql/mo/10_fixtures_create.sql` if needed.
7. Run V1–V7:
   - V1 shell integrity
   - V2 invalid RC envelope
   - V3 happy path outbound delivery
   - V4 unsupported / forbidden channel
   - V5 lineage mismatch fail-closed
   - V6 replay block / duplicate-send prevention
   - V7 DB drift / append-only outbound log verification
8. Clean fixtures via `11_fixtures_cleanup.sql`.
9. Update reports honestly.

## Required live checks
- provider-send path is real, not placeholder
- append-only outbound log is written exactly once on success
- replay of the same `idempotency_key` does not send again
- invalid or mismatched lineage does not send
- no business tables drift outside the intended outbound log target

## Notes on placeholders
This pack intentionally ships with `MO_Send_Channel_PLACEHOLDER` so the workflow JSON stays portable.
Closure requires replacing it live.

## Expected closure posture if all checks pass
- `closed = true`
- `advance_allowed = true`
- terminal-stage delivery proven