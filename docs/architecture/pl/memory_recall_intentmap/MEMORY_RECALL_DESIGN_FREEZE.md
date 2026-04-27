# MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP · Design Freeze

Date: 2026-04-27 (autonomous run, post-M1 close).

## Patch surface (single jsCode rewrite)

`WF-PL-01.PL_Build_Planner_Input.parameters.jsCode` v2.4 → v2.5.

Workflow envelope:

| Bucket | Value |
|---|---|
| Workflow mutations | 1 (WF-PL-01) |
| Node delta | 0 |
| Connection delta | 0 |
| Schema mutation | 0 |
| Memory V2 reopen | NO |
| ME / DI / OR / EC / TR change | NO (byte-identical) |
| Path 5 | NO |
| Duplicate workflows | 0 |

## v2.5 changes

1. `intentMap.recall_memory = 'recall_memory'`.
2. `actionToModule.recall_memory = 'memory_module'`.
3. `extractInputsForAction('recall_memory', goalText)` returns
   `{ limit: 25 }`.
4. New late-binding pass (between F14 store_memory and supersede_memory
   blocks): if a `recall_memory` action has no structural filter
   (`entity_id`/`source_thread_id`/`category`/`memory_type`), inject
   `source_thread_id` from `verify.thread_id` so ME's Recall_Prep
   `MISSING_REQUIRED_FIELDS` guard isn't tripped.

## Why Option A (route to real `recall_memory` handler)

`WF-ME-01` already has `ME_Memory_Recall_Prep` + `ME_Memory_Recall_DB` +
`ME_Memory_Recall_Result`, and `ME_Route_Memory_Action` switch routes
the action `recall_memory`. Aliasing to `search_memory` (Option B)
would orphan the existing handler. Option A preserves the contract.

## Tenant-isolation safety

`ME_Memory_Recall_Prep` reads `tenant_id` from `env.tenant_id`
(envelope), not from `inputs`. ME's DB SELECT filters
`WHERE tenant_id = $1::uuid`. Thus a tenant_B `recall_memory` request
cannot read tenant_A or tenant_default rows even if `source_thread_id`
is manipulated in inputs. Cross-tenant probe MR-004 confirmed live.

## Apply channel

V2-028 canonical local CLI (`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`).
Invocation:

```
node n8n-patch.mjs patch-node RwToPLa1ErHl2tUi PL_Build_Planner_Input \
  --params <path-to-v2.5-params.json>
```

Snapshots and audit log produced automatically by the CLI.

## Pre-state

- WF-PL-01 versionId `839b1750-2fb2-40ab-aeb2-88508d0a01c7` (16n/16c, active).
- WF-ME-01 versionId `328b2b81-58e6-4003-8966-4159d695cfda` (62n/81c, active).
- `public.reminders` count=1, max(created_at)=2026-04-13.

## Post-state

- WF-PL-01 versionId **`4e0406c3-9813-4374-9178-581409c6bdc4`** (16n/16c, active).
- WF-ME-01 versionId `328b2b81-58e6-4003-8966-4159d695cfda` unchanged.
