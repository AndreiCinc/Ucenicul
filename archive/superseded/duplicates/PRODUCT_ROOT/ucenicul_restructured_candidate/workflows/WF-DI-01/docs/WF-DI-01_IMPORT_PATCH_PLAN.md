# WF-DI-01 Import Patch Plan

## Intent
Import `WF-DI-01_Dispatcher.json` into the user-created `WF-DI-01` shell while preserving shell identity.

## Safe-write preference
1. user import of the full native JSON into the existing shell
2. live re-read to confirm node count, connection count, triggers, switch routes, and Postgres binding
3. runtime proof

## Shell-preserving rules
- preserve workflow record id
- do not blank the shell
- do not trust save success without live re-read
- do not use banned mutation paths

## Live checks after import
- node count == 13
- connection count == 13
- both triggers present
- `DI_Load_Execution_Context.alwaysOutputData === true`
- `_valid` switch intact
- `_context_ready` switch intact
- Postgres credential still bound correctly

## Known deviation
- SQL uses inline n8n interpolation because this project already proved that pattern stable in source packs and the fixer/taster toolchain is aligned to it. Keep tenant scoping explicit.

## Expected live proofs
- V1 happy path -> `DI_Return_Result`
- V2 invalid input -> `DI_Return_Error` / `INVALID_HANDOFF_INPUT`
- V3 malformed plan / bad step -> `DI_Return_Error` / `INVALID_PLAN`
- V4 replay stability -> byte-identical output
- V5 cross-tenant / missing execution row -> `CONTEXT_MISMATCH`
- V6 DB drift -> zero writes
