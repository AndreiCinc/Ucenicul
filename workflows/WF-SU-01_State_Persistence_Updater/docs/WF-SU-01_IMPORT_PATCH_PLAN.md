# WF-SU-01 Import / Patch Plan

## Objective
Import WF-SU-01 safely without repeating the destructive workflow-wipe pattern previously observed on RA.

## Hard rules
1. **Do not use full-body MCP `update_workflow` / PUT** on the live workflow after import.
2. Read the workflow first.
3. Re-read after every write.
4. Preserve node count, connection count, queryReplacement bindings, and all canonical Code-node bodies.
5. If a patch must modify Postgres nodes, verify `alwaysOutputData` and `options.queryReplacement` are still present after save.

## Safe import path
1. Import `WF-SU-01_State_Persistence_Updater.json` through the n8n UI.
2. Rebind Postgres credential manually if needed.
3. Re-read shell via API and verify:
   - node count = 17
   - main-edge count = 18
   - triggers = `SU_Input`, `SU_Manual_Test_Trigger`
   - guard switches = `SU_Route_Valid`, `SU_Route_Context_Ready`
   - all 6 Postgres nodes present
4. Only then run V1–V6 matrix.

## Safe patch path
- Use `patch_workflow_nodes` or UI edits only.
- Never ship raw `$1` placeholders without runtime binding.
- When n8n cannot bind params in a specific node, use sanitized inline interpolation and document why.

## Important autonomy notes
- `SU_Load_Write_Permissions` intentionally emits the pack-default allowlist. Do not “fix” it back to a missing live table before closure.
- V4 denied-write coverage uses `_write_permission_override` on the pinned envelope.
- V5 replay coverage uses `_replay_seen_input_hash` on the pinned envelope.
