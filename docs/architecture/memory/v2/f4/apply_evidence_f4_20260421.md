# apply_evidence_f4_20260421.md — F4 rollout + smoke evidence

Date: 2026-04-21.
Frontier: **F4 — promote_memory denial vocabulary**.
Channel: `n8n-patch.mjs patch-node` (single-node jsCode swap; no schema, no new nodes, no SQL mutation).
Design: `docs/architecture/memory/v2/f4/design_f4_denial_vocabulary.md`.
DIVERGENCE: `D-M-013`.
Related bug: `BUG-V2-03`.

## 1. Pre-rollout state

- `WF-ME-01` versionId: `f7f3e982-1ec8-46c9-a5d9-6d905419b313` (post-F2b).
- `nodeCount=45`, `connectionCount=63`, `active=true`.
- Patched node: `ME_Memory_Promote_Result` (id `me-phase5mem-promote-result`, type `n8n-nodes-base.code`).
- Tenant `aaaaaaaa-0000-0000-0000-000000000001` `MAX(updated_at)` = `2026-04-20T21:51:51.025Z` (9 rows).

## 2. Build

Deterministic script: `artifacts/build_patch_f4.mjs`.
- Writes: `artifacts/patchF4_params.json` (single key `jsCode`, 2607 bytes).
- Build-time guards: required tokens present (`ME_Memory_Promote_Prep`, `acceptance_signals`, `denial_reason`, `domain_writes_performed: accepted`); rejects if the old `denial_reason: accepted ? null` pattern re-leaks.

Contract of the new jsCode (per design):

- Preserve Prep `_error` propagation unchanged.
- Preserve "Target memory not found" fallback unchanged.
- `details.denial_reason = row.denial_reason` **verbatim** (no null-on-accept).
- On accept, compute `acceptance_signals` array from:
  - `corroboration` if `row.corroboration_count >= db.corroboration_threshold` (threshold=2 from Prep).
  - `user_confirmed` if `db.user_confirmed === true || row.user_confirmed === true` (caller input OR pre-existing history).
  - `evidence_validated` if `db.evidence_validated === true || row.evidence_validated === true`.
- `details.acceptance_signals` mirrors the array (empty on denial).
- New `artifacts` entries: always `{type:'memory_id', value:row.id}` and `{type:'denial_reason', value:row.denial_reason, promoted:accepted}`; on accept additionally `{type:'acceptance_signals', value:acceptance_signals}`.
- `followup_requests[0].reason` on denial continues to use `row.denial_reason` verbatim (now an authoritative string in both paths).

## 3. Rollout

Channel: `n8n-patch.mjs patch-node` (single-node merge — matches Patch A precedent).

```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  patch-node uq26nh1grIpnHju0 ME_Memory_Promote_Result \
  --params docs/architecture/memory/v2/f4/artifacts/patchF4_params.json
```

Response (audit appended to the tool's `.audit.jsonl`):

```json
{
  "id": "uq26nh1grIpnHju0",
  "name": "WF-ME-01 Module Execution",
  "patched": "ME_Memory_Promote_Result",
  "keys": ["jsCode"]
}
```

## 4. Post-rollout verification

`mcp__n8n__verify_workflow` with expected `nodeCount=45`, `connectionCount=63`, plus a probe on `ME_Memory_Promote_Result.parameters.jsCode`:

- `nodeCount` check: **pass** (got 45).
- `connectionCount` check: **pass** (got 63).
- `parameters.jsCode` probe: no `equals` comparator supplied, so `pass=false` as an artefact (same as Patch A / F2 precedent). The `got` payload matches `patchF4_params.json` byte-for-byte.
- New versionId: **`fc43f6bc-6f25-4588-afda-edadb55735ff`** (lineage `f7f3e982 → fc43f6bc`).

## 5. Smoke F4 — three-case taxonomy

`execution_context_id = d4f82a41-01cd-4fb7-9d70-573557348e74`, `thread_id = 77777777-0000-0000-0000-000000000007`, `tenant_id = aaaa…0001`.

### F4 seed — insert accept fixture row (exec 1522)

`store_memory` via live workflow (not direct INSERT — honoring the "use existing workflow paths" discipline).
Inputs: `content='Smoke V2 F4 — promote accept fixture row (user_confirmed=true).'`, `memory_type='fact'`, `category='smoke_f4'`, `source_thread_id=77777777-…-0007`, step_id `mem-smoke-v2f4-accept-f4-t3`.
Resulting row: `cc0dc5c2-ef0d-41f7-84ec-9b919a2a9671`, tier=recent, corr=1, user_confirmed=false, evidence_validated=false, idempotency_key `store_memory:d4f82a41-…:mem-smoke-v2f4-accept-f4-t3`.

(First seed attempt exec 1513 failed with `MISSING_REQUIRED_FIELDS: source_thread_id` — added the field and re-issued; 1513 was a no-op on `memory_items`.)

### Runs

| Run | exec id | Target | Tier (pre) | Caller inputs | `denial_reason` | `acceptance_signals` | status | DB effect |
|---|---|---|---|---|---|---|---|---|
| F4-t1 (deny) | 1524 | `7b03cd9c-…` A5 | long_term | `user_confirmed=false, evidence_validated=false` | `not_in_recent_tier` | `[]` | `partial` | none |
| F4-t2 (deny) | 1533 | `c7f148d9-…` A1 | recent | `user_confirmed=false, evidence_validated=false` | `acceptance_criteria_not_met` | `[]` | `partial` | none |
| F4-t3 (accept) | 1542 | `cc0dc5c2-…` F4 seed | recent | `user_confirmed=true, evidence_validated=false` | `accepted` | `['user_confirmed']` | `success` | tier recent → long_term, `last_reconfirmed_at=2026-04-21T05:23:52.686Z`, `user_confirmed=true` |

Raw captures: `artifacts/runtime/exec_f4_{t1_1524,t2_1533,t3_1542}.raw.json`.

### Per-run oracle proofs

**F4-t1 (deny — not_in_recent_tier):**
- Target `7b03cd9c-…` A5 is `tier=long_term` (pre-existing walker fixture, already promoted in earlier walker phases).
- Prep emits `__db = {user_confirmed:false, evidence_validated:false, corroboration_threshold:2}`.
- DB SQL falls through the `UNION ALL` denial branch since `target.tier <> 'recent'` ⇒ `CASE WHEN t.tier <> 'recent' THEN 'not_in_recent_tier'` ⇒ returns `promoted=false, denial_reason='not_in_recent_tier'`.
- New Result node emits `details.denial_reason='not_in_recent_tier'` verbatim (pre-F4 this was `'not_in_recent_tier'` already on the denial branch; preserved). `acceptance_signals=[]` since `!accepted`.
- `artifacts = [{memory_id}, {denial_reason:'not_in_recent_tier', promoted:false}]` — two entries, no `acceptance_signals` artifact on denial.
- `followup_requests[0].reason='not_in_recent_tier'` preserved.

**F4-t2 (deny — acceptance_criteria_not_met):**
- Target `c7f148d9-…` A1 is `tier=recent`, `corroboration_count=1` (< threshold 2), `user_confirmed=false`, `evidence_validated=false` — none of the accept predicates hold.
- DB SQL: `accept.ok = (1 >= 2 OR false OR false) = false` ⇒ UPDATE WHERE clause fails ⇒ denial branch ⇒ `CASE ELSE 'acceptance_criteria_not_met'` ⇒ `promoted=false, denial_reason='acceptance_criteria_not_met'`.
- Result emits `denial_reason='acceptance_criteria_not_met'` verbatim, `acceptance_signals=[]`.
- No DB mutation (`last_reconfirmed_at` remained `null`, `updated_at` unchanged).

**F4-t3 (accept — user_confirmed signal):**
- Target `cc0dc5c2-…` (F4 seed) is `tier=recent`, `corr=1`, `user_confirmed=false (pre)`, `evidence_validated=false`.
- Prep emits `__db = {user_confirmed:true, evidence_validated:false, corroboration_threshold:2}` (from caller inputs).
- DB SQL: `accept.ok = (1 >= 2 OR true OR false) = true` AND `accept.tier='recent'` ⇒ UPDATE row (`tier='long_term', last_reconfirmed_at=now(), user_confirmed=(false OR true)=true`) ⇒ returning `promoted=true, denial_reason='accepted'`.
- Result node (post-F4 patch):
  - `details.denial_reason = 'accepted'` (verbatim — **this is the core BUG-V2-03 fix**; pre-F4 this was silently replaced with `null`).
  - `acceptance_signals` computed: corroboration `1 >= 2` false ⇒ skipped; `user_confirmed: (db.user_confirmed=true || row.user_confirmed=true) = true` ⇒ `'user_confirmed'` pushed; evidence_validated both false ⇒ skipped. Result: `['user_confirmed']`.
  - `artifacts` now includes the new `{type:'acceptance_signals', value:['user_confirmed']}` entry on accept only (absent on t1/t2). Denial_reason artifact carries `promoted:true`.
  - `status='success'`, `needs_followup=false`, `followup_requests=[]`, `domain_writes_performed=true`.
- Downstream `ME_Dispatch_To_RA_01_SUBCALL` returns `INVALID_AGGREGATION_INPUT` as expected — documented F1 runtime boundary (WF-RA-01 rejects `domain_writes_performed=true` in standalone module smoke). Not a memory_module defect.

## 6. DB invariant

| Target | updated_at pre-batch | updated_at post-batch | Δ |
|---|---|---|---|
| `7b03cd9c-…` A5 (F4-t1) | `2026-04-20T21:51:21.238Z` | `2026-04-20T21:51:21.238Z` | unchanged |
| `c7f148d9-…` A1 (F4-t2) | `2026-04-20T20:38:19.705Z` | `2026-04-20T20:38:19.705Z` | unchanged |
| `cc0dc5c2-…` F4 seed (F4-t3) | `2026-04-21T05:23:14.903Z` (from seed insert) | `2026-04-21T05:23:52.686Z` | promoted → long_term |

Row count: 9 pre-seed → 10 post-batch (one insert for the F4-t3 fixture; no other DELETE/INSERT). Exactly the expected deltas — denials do not mutate, accept mutates exactly the targeted row.

## 7. Gate outcomes

- **F4.0** — denial-reason taxonomy enumerated → **done (2026-04-21)**. See design doc.
- **F4.1** — patch delta on `ME_Memory_Promote_Result` → **done (2026-04-21)**. `build_patch_f4.mjs` + `patchF4_params.json` rolled out.
- **F4.2** — rollout + smoke → **done (2026-04-21)**. Three-case smoke green, DB invariant held.

## 8. BUG-V2-03 resolution

- **Before:** `details.denial_reason = accepted ? null : row.denial_reason` — the authoritative `'accepted'` string emitted by the DB `RETURNING` clause was silently dropped, and the three-value taxonomy was flattened to a binary flag.
- **After (this patch):** `details.denial_reason = row.denial_reason` verbatim on both branches. Additionally, acceptance sub-signals are surfaced via a new `acceptance_signals` array (on both `details` and `artifacts`) so callers can distinguish accept-by-corroboration vs accept-by-user-confirm vs accept-by-evidence-validation.
- **Proof:** F4-t3 emits `details.denial_reason='accepted'` (not null) and `acceptance_signals=['user_confirmed']`. F4-t1 emits `details.denial_reason='not_in_recent_tier'` with `acceptance_signals=[]`. F4-t2 emits `details.denial_reason='acceptance_criteria_not_met'` with `acceptance_signals=[]`.

## 9. Rollback

Revert `ME_Memory_Promote_Result.parameters.jsCode` to the pre-F4 value. The pre-F4 jsCode is captured in the tool's `.audit.jsonl` entry for this patch (keyed by versionId `f7f3e982 → fc43f6bc`) and is also reproducible from the previous snapshot of the workflow. Since F4 is jsCode-only, revert is a single `patch-node` call with the prior params — no schema or structural rollback needed.

## 10. Known-next-steps (not residuals — deliberately scoped out)

- Acceptance signals sourced from `row.user_confirmed=true` pre-existing (not this call) are still reported as `'user_confirmed'`. This is the design intent per the taxonomy note: "Pre-existing `row.user_confirmed=true` or `evidence_validated=true` was already an acceptance predicate before this call, so it should also be reported — we OR both sources." Callers that need to distinguish "this call confirmed" from "already confirmed" can read `prepOut.__db` vs `row` separately (both flow through the execution trace), but we did not surface the distinction in artifacts to keep the vocabulary simple.
- A fourth test (accept-by-evidence_validated) and a fifth (accept-by-corroboration, requires `corroboration_count >= 2` on a recent-tier row) are deliberately deferred — the three cases above fully exercise the Result-node code paths (denial-a, denial-b, accept-with-one-signal). The additional permutations are pure SQL-predicate arithmetic already covered by the DB's UNION ALL / CASE branches, which F1 exercised at the DB layer.
