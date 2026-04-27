# WF-ME-01 Phase 6 Patches — README

> **Document status: LEVEL 3 — SUBORDINATE IMPLEMENTATION ARTIFACT**
> Subordinate to `docs/architecture/memory/patch_plan.md` (Phase 5 freeze, 2026-04-20).
> Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md` for system-level authority.

Phase: 6 — patch implementation.
Workflow: `WF-ME-01 Module Execution` (n8n id `uq26nh1grIpnHju0`).
Base versionId at freeze: `3b3fc427-9600-4652-96d7-1b0536ddd39f`.

---

## Artifact inventory

| File | Purpose |
|---|---|
| `wf_me_01_pre_patch_20260420.json` | Frozen pre-patch workflow export (30 nodes, 45 connections). Matches live snapshot at patch time. |
| `wf_me_01_live_snapshot_20260420_pre_apply.json` | Independent live re-read immediately before patch application, used as the diff baseline. |
| `build_patch.mjs` | Deterministic Node.js ESM transform that turns the pre-patch JSON into the post-patch JSON. Re-runnable. |
| `wf_me_01_post_patch_20260420.json` | Post-patch workflow JSON — the intended PUT payload. 43 nodes, 5-rule switch, all 5 memory actions wired. |
| `apply_evidence_20260420.md` | Evidence log for the apply attempt (smoke test + deferral outcome). |

---

## What changed vs the pre-patch JSON

Structural diff (verified programmatically):

- Node count: **30 → 43** (+13 new).
- Switch `ME_Route_Memory_Action`: **2 rules → 5 rules** (`store_memory`, `search_memory`, `recall_memory`, `promote_memory`, `supersede_memory`). Default branch still routes to `ME_Return_Error`.
- Two existing Code nodes are repurposed (body rewritten, id preserved):
  - `ME_Memory_Store_Result` — now consumes the output of `ME_Memory_Store_DB`.
  - `ME_Memory_Search_Result` — now consumes the output of `ME_Memory_Search_DB`.
- 13 new nodes, all prefixed `me-phase5mem-*`:
  - `ME_Memory_Store_Prep` (Code), `ME_Memory_Store_DB` (Postgres)
  - `ME_Memory_Search_Prep` (Code), `ME_Memory_Search_DB` (Postgres)
  - `ME_Memory_Recall_Prep` (Code), `ME_Memory_Recall_DB` (Postgres), `ME_Memory_Recall_Result` (Code)
  - `ME_Memory_Promote_Prep` (Code), `ME_Memory_Promote_DB` (Postgres), `ME_Memory_Promote_Result` (Code)
  - `ME_Memory_Supersede_Prep` (Code), `ME_Memory_Supersede_DB` (Postgres), `ME_Memory_Supersede_Result` (Code)
- Connection rewiring:
  - `ME_Route_Memory_Action[0..4]` → each action's `*_Prep`.
  - `*_Prep` → `*_DB` → `*_Result` → `ME_Return_Result`.
  - Default branch of the switch (`[5]`) still goes to `ME_Return_Error`.

Chain shape per action (no in-line IF nodes): `ME_Route_Memory_Action → *_Prep (validate + build args, on invalid emit `_error`) → *_DB (Postgres, `continueOnFail:true`) → *_Result (re-emit `_error` or build `module_result`) → ME_Return_Result`.

---

## Apply procedure

The workflow runs in production and is active. Apply order mirrors `patch_plan.md` §14:

1. **Deactivate the workflow** (operator action in n8n UI).
   Reason: a live trigger on a mid-PUT workflow can lead to partial executions.
2. **PUT the full workflow JSON** using `wf_me_01_post_patch_20260420.json` as the body.
   Two supported routes:
   - **Route A — n8n REST PUT (preferred, byte-exact):**
     ```bash
     curl -sS -X PUT \
       -H "X-N8N-API-KEY: $N8N_API_KEY" \
       -H "Content-Type: application/json" \
       --data @wf_me_01_post_patch_20260420.json \
       https://<n8n-host>/api/v1/workflows/uq26nh1grIpnHju0
     ```
     Expected response: `200` with the new `versionId`.
   - **Route B — SDK via `update_workflow`:** requires translating the JSON into the n8n Workflow SDK TypeScript. This route is *not* the chosen one for Phase 6 because the JSON already encodes the entire intended state and byte-exact replay is safer than regenerating from SDK code.
3. **Verify** via `verify_workflow` with expected shape:
   ```json
   {
     "nodeCount": 43,
     "nodeFields": [
       { "nodeName": "ME_Route_Memory_Action", "path": "parameters.rules.values.length", "equals": 5 },
       { "nodeName": "ME_Memory_Store_DB", "path": "type", "equals": "n8n-nodes-base.postgres" },
       { "nodeName": "ME_Memory_Search_DB", "path": "parameters.operation", "equals": "executeQuery" },
       { "nodeName": "ME_Memory_Recall_DB", "path": "parameters.operation", "equals": "executeQuery" },
       { "nodeName": "ME_Memory_Promote_DB", "path": "parameters.operation", "equals": "executeQuery" },
       { "nodeName": "ME_Memory_Supersede_DB", "path": "parameters.operation", "equals": "executeQuery" }
     ]
   }
   ```
4. **Reactivate the workflow**.
5. **Record outcome** in `apply_evidence_20260420.md` (new versionId, success/fail, rollback if needed).

## Rollback

If verification fails, re-apply the pre-patch JSON:
```bash
curl -sS -X PUT \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  --data @wf_me_01_pre_patch_20260420.json \
  https://<n8n-host>/api/v1/workflows/uq26nh1grIpnHju0
```
No DB rollback is required — the `memory_items` table is additive and does not affect any existing workflow. If the patch is reverted, new rows in `memory_items` become unreferenced until the next apply.

## Write fence

Within `docs/architecture/memory/**` only. Under no circumstances does this patch touch `db/migrations/**`, any other workflow, or any file outside the memory workspace. The live PUT targets the single workflow id above.

## Idempotency

`build_patch.mjs` is deterministic: repeated runs against the same `wf_me_01_pre_patch_20260420.json` produce byte-identical `wf_me_01_post_patch_20260420.json`.

## Regeneration

```bash
node /sessions/amazing-festive-maxwell/mnt/Ucenicul/docs/architecture/memory/patches/build_patch.mjs
```
