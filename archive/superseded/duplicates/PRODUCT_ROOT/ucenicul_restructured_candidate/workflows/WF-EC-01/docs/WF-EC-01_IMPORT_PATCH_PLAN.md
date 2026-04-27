# WF-EC-01 Import & Patch Plan (Shell-Preserving)

> **Status:** Live n8n MCP write-surface is classified as unavailable/unstable per
> user directive (2026-04-17). This plan is the exact sequence of steps to execute
> **once a verified native workflow JSON write surface returns**.

Until then, closure happens at the logic level (Python/SQL scripts against live DB).

---

## 1. Shell identity (already live)

- Workflow name: `WF-EC-01`
- Workflow id (verified live): `v9jih4jqeXpOJOiH`
- Current live node count: 3 (placeholder: Manual Trigger, Code, Chat Trigger)
- Current live connections: 2 (both triggers → Code)
- Shell state: preserved, intact, active.

## 2. Pre-flight checks (mandatory before any write)

```text
1. GET /rest/workflows/v9jih4jqeXpOJOiH
2. Confirm `id == 'v9jih4jqeXpOJOiH'`
3. Confirm `name == 'WF-EC-01'`
4. Capture a before-snapshot of the full JSON (save to snapshot file).
5. Save under: workflows/snapshots/WF-EC-01_before_<date>.json
6. Confirm n8n has a valid Postgres credential in the target project
   (same credential as WF-TR-01). We reference it by CREDENTIAL_NAME only.
```

## 3. Replacement strategy (native JSON)

Preferred surface (in priority order, per `04_N8N_MCP_PLAYBOOK.md`):

1. **Native workflow JSON replacement** via verified n8n REST API `PUT /rest/workflows/:id`
   with payload derived from `workflows/WF-EC-01_blueprint.json`.
2. **Shell-preserving node-by-node `patch_workflow_nodes` sequence** (if only per-node
   patch is available): see section 5.
3. **BLOCKED_WITH_EVIDENCE** if no surface round-trips cleanly.

The SDK `update_workflow(code)` path is BANNED for this stage (per AUDIT_REPORT).

## 4. Full-replace import (Option A)

1. Read blueprint: `workflows/WF-EC-01_blueprint.json`.
2. Inject the live `id` into the request (do NOT delete/recreate the workflow).
3. PUT `/rest/workflows/v9jih4jqeXpOJOiH` with the blueprint contents plus the id.
4. Wait for 2xx response.
5. Re-read the workflow live.
6. Assert ALL of:
   - `id == 'v9jih4jqeXpOJOiH'`
   - `name == 'WF-EC-01'`
   - `nodes.length == 8`
   - `connections` has 6 top-level keys: `EC_Trigger`, `EC_Validate_Input`,
     `EC_Route_Valid`, `EC_Build_Init_Payload`, `EC_Upsert_Context`, `EC_Load_Existing_Context`
   - each Postgres node has the SQL text from the blueprint
   - `EC_Route_Valid.parameters.dataType == 'boolean'`
   - `settings.availableInMCP == true`
7. If ANY assertion fails → revert from snapshot; classify as F2 false success.
8. Wire Postgres credentials on `EC_Upsert_Context` and `EC_Load_Existing_Context`.
9. Persist the activation state (active / draft) matching prior shell posture.

## 5. Node-by-node patch (Option B — fallback)

If the JSON PUT surface is missing but a narrow `patch_workflow_nodes(nodeName, replace)`
surface exists:

1. **Remove** placeholder `Code` and `When chat message received` nodes:
   - keep `When clicking 'Execute workflow'` (or rename it to `EC_Trigger`).
2. **Rename** the surviving manual trigger to `EC_Trigger` via `patch_workflow_nodes`.
3. **Add** new nodes one at a time (requires `add_node` surface — if unavailable,
   this option is not viable; classify as BLOCKED_WITH_EVIDENCE).
4. **Patch** connections to match `WF-EC-01_CONNECTION_MAP.md`.
5. **Round-trip-verify** after every single patch; revert on failure.

This path is deliberately fragile and should only be used when Option A fails for
reasons unrelated to workflow correctness.

## 6. Post-import smoke sequence

Once imported & credential-wired, run:

1. **V1 — shell integrity:** live `nodeCount == 8`, 6 connection roots.
2. **V2 — input validation:** invoke with `{ tenant_id: null }` → error-shaped output.
3. **V3 — happy path:** invoke with a real TR result (see `fixtures/TR_EC_happy.json`)
   → expect row inserted with `status='initialized'`.
4. **V4 — idempotency:** replay the same input → expect same `id`, single row in DB.
5. **V5 — cross-tenant:** invoke with a different `tenant_id` using the same
   `trigger_message_id` → expect a distinct row with a different `idempotency_key`.
6. **V6 — TR → EC smoke:** chain via the TR result stored at
   `tr_aaaabbbb-0000-0000-0000-000000000010_replyA`.

## 7. Rollback

If any of V1–V6 fails and cannot be fixed in one pass:

- revert to snapshot file from step 2
- classify as F-class (tool vs runtime vs schema)
- log in `FIX_LOG.md`
- DO NOT leave the workflow partially patched.

## 8. Credentials

- The JSON deliberately does NOT reference credential IDs (same pattern as WF-TR-01).
- After import, manually attach the Postgres credential to both Postgres nodes.
- The credential must point to the same database as WF-TR-01.

## 9. When to claim closure

Only after:

- Option A completed successfully, AND
- V1–V6 all passed, AND
- Post-test DB state matches contract
  (exactly one row per unique `idempotency_key`).

## 10. Next executable action (as of today)

**Logic-level proof continues via `scripts/` and `TEST_RESULTS_WF-EC-01.md`.**
When n8n returns, the first live action is step 1 under Section 4
("Full-replace import (Option A)").
