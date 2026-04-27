# IMPROVEMENT_MODULE_LIST_FOLLOWUP · Execution Log

Run-tag: `il-2026-04-27`. Repo root: `/sessions/hopeful-gifted-carson/mnt/Ucenicul`.
Started: 2026-04-27 (autonomous run, post-M2 close).

## Pre-state

- WF-PL-01 versionId `4e0406c3-9813-4374-9178-581409c6bdc4` (16n/16c, active).
- WF-ME-01 versionId `328b2b81-58e6-4003-8966-4159d695cfda` (62n/81c, active).
- `public.improvement_requests`: tenant default 12, tenant A 1, tenant B 1; all `status='pending'`.
- `public.reminders` count=1, max(created_at)=2026-04-13 20:17:13Z.

## Discovery

- Schema preflight ✅ (see `IMPROVEMENT_LIST_SCHEMA_PREFLIGHT.md`):
  tenant_id (NOT NULL) + status + created_at columns sufficient for
  read-only tenant-scoped list. No `category`/`severity` columns →
  those filters documented as unsupported.
- ME currently has no sub-action router for improvement_module:
  improvement_module branch from `ME_Route_Module_Name` connects
  directly to `ME_Improvement_Capture_Prep`. Adding `list_improvements`
  requires a sub-action switch.
- PL v2.5 has neither `list_improvements` in intentMap nor in
  actionToModule.

## Build phase

- `artifacts/build_pl_v26.mjs` — string-surgery on PL v2.5 to produce
  v2.6. Parse-checked OK.
- `artifacts/build_me_patch.mjs` — reads pre snapshot, adds 4 nodes,
  rewires improvement branch. Result: 66 nodes / 88 connections.
- `artifacts/WF-ME-01_pre.json` — full pre-snapshot via
  `n8n-patch get`.
- `artifacts/WF-ME-01_post.json` — patched workflow JSON.

## Apply phase

V2-028 canonical local CLI:

```
node n8n-patch.mjs patch-node RwToPLa1ErHl2tUi PL_Build_Planner_Input \
    --params artifacts/PL_Build_Planner_Input_v2.6.params.json
node n8n-patch.mjs replace uq26nh1grIpnHju0 \
    artifacts/WF-ME-01_post.json --reactivate
```

Both succeeded. Workflows reactivated.

## Verify phase

| Workflow | Pre versionId | Post versionId | Nodes / connections |
|---|---|---|---|
| WF-PL-01 | `4e0406c3-9813-4374-9178-581409c6bdc4` | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` | 16 / 16 (jsCode rewrite) |
| WF-ME-01 | `328b2b81-58e6-4003-8966-4159d695cfda` | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | 66 / 88 (+4 / +7) |

## Probe phase

Pre-seed pack (idempotent INSERTs): 7 threads + 7 messages with intents
`list_improvements` × 4, `save_suggestion` × 1, `create_task` × 1,
`store_memory` × 1.

7 sequential probes through TR `wI8hpSROxQI0zC9f`:

| # | Case | Tenant | TR exec | Verdict |
|---|---|---|---|---|
| 1 | IL-001 RO list | default | 10697 | ✅ `step_01_list_improvements` |
| 2 | IL-002 EN list | default | 10711 | ✅ |
| 3 | IL-003 status filter | default | 10725 | ✅ |
| 4 | IL-004 cross-tenant | tenant B | 10739 | ✅ tenant B EC only |
| 5 | IL-005 capture regression | default | 10753 | ✅ +1 row |
| 6 | IL-R-task | default | 10767 | ✅ +1 task |
| 7 | IL-R-store | default | 10781 | ✅ +1 memory |

## Closeout

Verdict: **`IMPROVEMENT_MODULE_LIST_READY = TRUE`**.

Workflow mutation count: 2 (WF-PL-01 jsCode + WF-ME-01 structural).
Schema mutation count: 0. Path 5: NO. Duplicate workflows: 0. Memory V2
reopen: NO. Task module: byte-identical. memory_module nodes:
byte-identical. ME-side new lane is read-only (SELECT only).

Mission docs all written under
`docs/architecture/improvement_module/list_followup/`.
