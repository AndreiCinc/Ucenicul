# FIX_LOG — WF-RC-01 (live-implementation pass, 2026-04-18)

## Attempts and outcomes (in order)

1. Read live workflow `TClXgmO8H8zsSwMb` via `mcp__n8n__get_workflow`.
   - OK. 4-node langchain scaffold, not an RC workflow.
   - Snapshot saved: `snapshots/TClXgmO8H8zsSwMb_pre-rc-impl-20260418T122000.json`.

2. Diff live vs. pack.
   - All 14 RC_* nodes absent; all 3 live nodes (chatTrigger, langchain.agent,
     lmChatOpenAi) are out-of-scope for RC and must be removed.
   - The single manualTrigger can be reused but must be renamed to
     RC_Manual_Test_Trigger.

3. Attempted `node tools/n8n-patch/n8n-patch.mjs get …`
   - FAIL: `fetch failed`. Sandbox proxy denies egress to
     `https://n8n-production-d688.up.railway.app/`.
   - Confirmed with `curl` returning HTTP 403 from proxy on CONNECT.

4. Investigated MCP `mcp__f2e8be41-…__update_workflow` (SDK code path).
   - SDK factories (`node`, `trigger`, `manualTrigger`, `code`, etc.) either
     errored "Unknown identifier" or silently returned undefined; resulting
     `workflow(...)` objects reported `nodeCount: 0`.
   - No discoverable documentation for the SDK's node-factory surface in
     this environment. Authoring 14 nodes in the SDK was not feasible.

5. Smoke test via `mcp__n8n__patch_workflow_nodes` (rename one trigger).
   - FAIL: n8n API returned HTTP 400:
     `request/body/settings must NOT have additional properties`.
   - The live workflow's `settings` contains `binaryMode`, `timeSavedMode`,
     `callerPolicy`, `availableInMCP` — fields not in the n8n OpenAPI
     whitelist. The MCP wrapper does not filter them before PUT.
   - Even surgical writes fail on this workflow via this tool.

6. Prepared deployable artifact.
   - Copied `workflows/WF-RC-01_Response_Composer.json` into
     `snapshots/WF-RC-01_Response_Composer_bound.json`.
   - Rebound both Postgres placeholders to the live project credential
     `z9nKgToNWvIW7P8f` / "Postgres account 2" (sourced from live
     `WF-SU-01` which is closed and uses the same credential).
   - Replaced `settings` with `{"executionOrder":"v1"}` to pass the n8n
     OpenAPI whitelist.
   - Local structural verification: 14 nodes / 13 edges / 2 triggers /
     2 switches / 2 Postgres reads.

7. Ran deterministic off-node suite.
   - `python3 workflows/tests/rc/test_families.py`
   - 13 families × 50 tests = 650 / 650 PASS.

8. Re-verified live workflow post-pass.
   - `mcp__n8n__verify_workflow(nodeCount=14)` → got 4. Shell still stub.

9. Deeper SDK probe via `mcp__f2e8be41-…__validate_workflow` +
   `search_nodes` + `get_node_types`.
   - Discovered defined SDK identifiers by pattern: `workflow`, `trigger`,
     `node`, `tool`, `vectorStore`, `memory`, `fromAi` do NOT throw
     "Unknown identifier"; `code`, `manualTrigger`, `schedule`, `build`,
     `compile`, `create`, `make`, `credentials`, `expression`, `connect`,
     `chain`, `agent`, `languageModel`, `llm`, `embeddings`, `document`,
     `retriever`, `model` all throw "Unknown identifier" when called.
   - SDK parser constraints observed: no `Object.*`/`JSON.*` access
     (security violation), no `new` expressions, no arrow functions,
     only `export default`, no named exports.
   - Exact-type probe from `get_node_types`: passing
     `trigger({ type, version, isTrigger:true, config })` with every
     combination of extra fields (`name`, `id`, `position`, `parameters`,
     `typeVersion`, `config.name`, `config.params`, positional args,
     2-arg, 3-arg) parses as `valid: true` but always resolves to
     `nodeCount: 0`. No error is surfaced; nodes are silently dropped.
   - Shape-dropping confirmed end-to-end: called
     `create_workflow_from_code` on a throwaway workflow
     `_sdk_probe_delete_me` (id `x0OyhdLQgIlYVk3U`). Live n8n response:
     `nodeCount: 0`, empty `nodes: []`. Probe archived immediately.
   - Update-path confirmation: calling `update_workflow` on the same
     probe id with `node({ type, version, config })` also produced
     `nodeCount: 0`. With `node({ type, version, typeVersion: 1,
     parameters: {} })` the parser errored "Cannot read properties of
     undefined (reading 'name')" — confirming that extra / wrong fields
     cause a specific read-undefined error, while "correct" shapes
     silently no-op.
   - Verbatim hint `vectorStore({ mode: 'retrieve' })` also errored
     "reading 'name'", so the hint format from `search_nodes` is
     incomplete and cannot be used as a template.
   - Conclusion: the SDK parser's expected argument shape for
     `trigger` / `node` / factor functions is not discoverable from this
     environment via `validate_workflow` or `create_workflow_from_code`
     response text. Authoring WF-RC-01 via this MCP remains blocked.

## Net live delta
No live changes to the workflow body.
Off-node logic proven. Shell patch artefact prepared and staged.
SDK crack attempt exhausted — factory surface is not discoverable from
sandbox-visible tooling.

## Recommended next write
From an environment that can reach the n8n host:
```
node tools/n8n-patch/n8n-patch.mjs replace TClXgmO8H8zsSwMb \
    snapshots/WF-RC-01_Response_Composer_bound.json \
    --reactivate
```
