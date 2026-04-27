# WF-E2E-01 — Duplicate Disposition: `rooFWDryqC0YDyVa`

**Date:** 2026-04-18
**Authority:** user direction 2026-04-18 — *"Duplicate rooFWDryqC0YDyVa
must be archived/deprecated and excluded from canonical MO-01 usage."*

## What this duplicate actually was

A live, active n8n workflow named `WF-MO-01` at id `rooFWDryqC0YDyVa`,
parallel to the canonical MO-01 at id `OooZdC0DgsDR6gm0`.

On inspection, it was **not** an MO-01 stub at all. It was a 4-node
LangChain chat agent sharing only the display name:

| Node | Type |
|------|------|
| When clicking 'Execute workflow' | `n8n-nodes-base.manualTrigger` |
| When chat message received | `@n8n/n8n-nodes-langchain.chatTrigger` |
| AI Agent | `@n8n/n8n-nodes-langchain.agent` |
| OpenAI Chat Model | `@n8n/n8n-nodes-langchain.lmChatOpenAi` |

It contains no Message-Out logic. The collision with canonical MO-01's
name was a naming accident that caused identity ambiguity (CLAUDE.md
§Discover explicitly bans editing when identity is ambiguous). Left
as-is, a future discovery pass could easily match the wrong workflow
id and misroute a patch.

## Disposition chosen

**Deactivate + rename. Do not delete.**

Rationale:
- Deletion is destructive and requires explicit user `--yes` per
  `n8n-patch`. User authorised deprecation, not deletion.
- Renaming eliminates the name collision and leaves a clear audit
  trail for whoever created it to reclaim if they want.
- Deactivating prevents accidental invocation of the chat agent under
  the "WF-MO-01" label.

## Mutation applied live

Pre-disposition snapshot:
`tools/n8n-patch/snapshots/e2e-01-duplicate-disposition/rooFWDryqC0YDyVa_pre-disposition-20260418.json`

Steps:

1. `node tools/n8n-patch/n8n-patch.mjs get rooFWDryqC0YDyVa --out ...pre...json`
2. `node tools/n8n-patch/n8n-patch.mjs deactivate rooFWDryqC0YDyVa`
   → `deactivated rooFWDryqC0YDyVa`
3. Built rename payload (name field only changed; nodes, connections,
   settings preserved byte-identically):
   `tools/n8n-patch/snapshots/e2e-01-duplicate-disposition/rooFWDryqC0YDyVa_rename-payload.json`
4. `node tools/n8n-patch/n8n-patch.mjs replace rooFWDryqC0YDyVa ...rename-payload.json`
   → PUT accepted. Not reactivated (intentional — stays off).

Post-disposition snapshot:
`tools/n8n-patch/snapshots/e2e-01-duplicate-disposition/rooFWDryqC0YDyVa_post-disposition-20260418.json`

Result:

```
name=  DEPRECATED__WF-MO-01_langchain_stub__rooFWDryqC0YDyVa
active= False
nodes preserved= 4
```

Final `n8n-patch search /WF-MO-01/` output:

```
OooZdC0DgsDR6gm0	ON 	WF-MO-01 Message Out / Output Gateway
rooFWDryqC0YDyVa	off	DEPRECATED__WF-MO-01_langchain_stub__rooFWDryqC0YDyVa
```

## Reversibility

If the owner of `rooFWDryqC0YDyVa` needs the chat agent back:

```
node tools/n8n-patch/n8n-patch.mjs replace rooFWDryqC0YDyVa \
  tools/n8n-patch/snapshots/e2e-01-duplicate-disposition/rooFWDryqC0YDyVa_pre-disposition-20260418.json
node tools/n8n-patch/n8n-patch.mjs activate rooFWDryqC0YDyVa
```

restores the original name `WF-MO-01` and its active state. The
LangChain nodes were preserved byte-identically in the rename step,
so the only fields that change on restore are `name` and `active`.

## Post-condition (verified)

- Only one workflow named `WF-MO-01 ...` is active:
  `OooZdC0DgsDR6gm0 WF-MO-01 Message Out / Output Gateway`.
- The former collision id `rooFWDryqC0YDyVa` is now off and renamed
  with a `DEPRECATED__` prefix.
- Canonical MO-01 usage in this codebase (CLOSURE_REPORT_WF-MO-01,
  STATE.json `mo_01_live_impl`, `wf-mo-01-pack/`) is unaffected.
- Pre- and post- snapshots preserved; `tools/n8n-patch/.audit.jsonl`
  appended with both the deactivate and the replace.
