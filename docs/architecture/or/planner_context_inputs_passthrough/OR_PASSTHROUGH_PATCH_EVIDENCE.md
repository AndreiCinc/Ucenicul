# OR PASSTHROUGH · Patch Evidence

> Apply channel: V2-028 canonical local CLI `n8n-patch.mjs replace`.

---

## Workflows modified

| Workflow | id | versionId before | versionId after | nodes | conns |
|---|---|---|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | `89b783f8…` | `ce336539-c3c1-4397-8b2e-a174c4e72464` (then re-patched to current after the v1.1 fix) | 24 | 25 |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035…` | `d25e4316-f584-4f2b-ba83-423ff82d749b` | 11 | 10 |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3…` | `f4925ede-35c5-41a1-baff-54c9a2de8101` | 13 | 12 |
| (WF-PL-01, WF-DI-01, WF-ME-01, WF-RA-01, WF-SU-01, WF-RC-01, WF-MO-01) | — | unchanged | unchanged | — | — |

## Diff surface

- **3 workflows touched** (TR + EC + OR)
- **6 jsCode rewrites total** (1 in TR, 2 in EC, 3 in OR)
- **0 node delta** in each workflow
- **0 connection delta** in each workflow
- **0 schema mutation**
- **0 new node, 0 new connection, 0 new workflow**
- **No Path 5**
- **No `mcp__n8n__patch_workflow_nodes` write** (only `verify_workflow` for read-only post-apply checks)

## Live trace evidence (exec 9732 — successful canonical e2e supersede)

OR's `_normalized_ec_result.payload.envelope_metadata` carried the chat envelope's `{memory_id: "f6cf6926-…"}` correctly. PL_Build_Planner_Input received `planner_context.inputs.memory_id` and emitted:

```json
{
  "primary_intent": "supersede_memory",
  "requested_actions": [{
    "action": "supersede_memory",
    "module_name": "memory_module",
    "purpose": "Handle intent supersede_memory",
    "inputs": {
      "content": "culoarea preferata in albastru (e2e supersede via metadata.memory_id)",
      "memory_type": "fact",
      "category": "general",
      "memory_id": "f6cf6926-fc91-4aa4-8262-dda1be92b492",
      "supersedes_memory_id": "f6cf6926-fc91-4aa4-8262-dda1be92b492",
      "source_thread_id": "f8bc3a2a-…",
      "source_message_id": "b454159e-…"
    }
  }]
}
```

ME's `ME_Memory_Supersede_*` chain executed end-to-end and wrote both the OLD-row supersede mark and the NEW row.

## DB write evidence

| memory_items.id | content | status | supersedes_memory_id |
|---|---|---|---|
| `f6cf6926-…` (OLD) | `OLD culoarea preferata era verde (ORPT e2e)` | **`superseded`** ✅ | NULL |
| `8572b8b1-…` (NEW, written via canonical chain) | `culoarea preferata in albastru (e2e supersede via metadata.memory_id)` | `active` | **`f6cf6926-…`** ✅ |

## Allowlist enforcement spot-check (no probe needed)

The OR_Build_Handoff_Payload v1.5 jsCode iterates `Object.keys(env_meta)`, drops anything not in `ALLOWED_KEYS`, and validates each value against UUID regex. A value that's not a UUID string is dropped without writing to `planner_context.inputs`. Memory V2 internals stay closed.

## Memory V2 byte-identity confirmation

Spot-check via `n8n-patch.mjs get` of WF-ME-01 (id `uq26nh1grIpnHju0`) post-apply: versionId remains `4fd95689-39f9-4dff-8ed2-6d0ccb5270de`, nodes 61, connections 79 — unchanged from prior ACG mission. ME_Memory_Supersede_* nodes byte-identical.

## Apply command sequence

```
$ cd .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch
$ node n8n-patch.mjs replace wI8hpSROxQI0zC9f .../WF-TR-01.next.json --reactivate
$ node n8n-patch.mjs replace v9jih4jqeXpOJOiH .../WF-EC-01.next.json --reactivate
$ node n8n-patch.mjs replace KhGmNpi0ZDmrnz8W .../WF-OR-01.next.json --reactivate
```

Plus a one-shot re-apply of TR after the `safeNode('TR_Validate_Input')` correction to its v1.1 jsCode.

## Artifacts

- `artifacts/WF-TR-01.{pre,next}.json`
- `artifacts/WF-EC-01.{pre,next}.json`
- `artifacts/WF-OR-01.{pre,next}.json`
- `artifacts/{TR_Build_EC_Envelope,EC_Validate_Input,EC_Return_Result,OR_Validate_EC_Result,OR_Extract_Handoff_Input,OR_Build_Handoff_Payload}.{pre,next}.js`
- `artifacts/build_passthrough_patches.mjs`
