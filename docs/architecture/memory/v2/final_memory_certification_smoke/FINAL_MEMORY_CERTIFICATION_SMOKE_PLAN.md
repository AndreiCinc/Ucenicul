# FINAL_MEMORY_CERTIFICATION_SMOKE_PLAN

Frozen: 2026-04-25 (Memory 100% Pack, Mission C — V2-039).
Scope: runtime + SQL verification of `memory_module v2` post-V2-037 / V2-038 against live `WF-ME-01` (`uq26nh1grIpnHju0`, versionId `9d1da628-f9fd-44dc-8f62-fda571a7bc23`, 49 nodes / 67 connections / `active=true`).
Posture: **no workflow mutation**; **no schema mutation**; **no index rebuild**; **no backfill**. Reuses existing live state as the corpus under test.

---

## Preconditions

- `memory_module v2` is FORMALLY CLOSED STABLE (V2-036).
- Mission A (V2-037) closed SUCCESS — recall summary fix landed, versionId advanced to `9d1da628-…`.
- Mission B (V2-038) closed SUCCESS — ivfflat retrain policy doc exists; no DB/workflow/index mutation.
- Active frontier = NONE.
- No unresolved critical blocker (BLOCKER-V2-F5-01 RESOLVED FOR F5 PURPOSES; sub-A / sub-B remain non-blocking infra follow-ups).

## Tenant / thread / execution_context constants

Reuse the v2 smoke fixtures:

- `tenant_id = aaaaaaaa-0000-0000-0000-000000000001`
- `thread_id = 77777777-0000-0000-0000-000000000007`
- `entity_id = eeeeeeee-0000-0000-0000-000000000001`
- `execution_context_id = d4f82a41-01cd-4fb7-9d70-573557348e74`
- Idempotency prefix: `fincert-` (mission-local namespace, collision-free with prior missions).

## Runtime matrix — 50 cases

Distribution:

- **Store (8)** — S-01..S-08
  - S-01 fact RO caller-default (tier=recent default, uc/ev false, cc=1)
  - S-02 observation EN long_term caller + user_confirmed=true
  - S-03 advice RO corroboration_count=3 → should persist cc=3
  - S-04 fact RO evidence_validated=true → should persist ev=true
  - S-05 subjective-guard RO (content="cred că ...") → should error-out with subjective deny
  - S-06 subjective-guard EN (content="I believe ...") → should error-out with subjective deny
  - S-07 fact RO idempotency-replay (re-submit S-01 envelope → first-write-wins: same row, no duplicate)
  - S-08 fact RO with all 4 caller promotion-signal fields (tier=recent, uc=false, ev=false, cc=2) to enable downstream probe
- **Search (8)** — SR-01..SR-08
  - SR-01 semantic top-k on a distinctive phrase that maps to S-01 / S-02 (expect ≥1 semantic match)
  - SR-02 lexical fallback — short rare-token query unlikely to match semantically
  - SR-03 zero-match — gibberish query under tenant
  - SR-04 tenant-scoped isolation — query under tenant A must not hit hypothetical tenant-B rows (covered by SQL invariants §SQL-tenant)
  - SR-05 embedding-failure degradation — simulate via `embedding_failed` envelope input or via known-sparse tenant (if unsafe to simulate, run once and note)
  - SR-06 result-envelope sanity — `used_embedding`, `embedding_attempted`, `semantic_match_count` present and consistent
  - SR-07 semantic+lexical hybrid on F6A/F6A-FOLLOWUP seed rows (e.g., "ivfflat index is partial on embedding IS NOT NULL." → expected TOP-1 on row `b8034d25`)
  - SR-08 regression probe vs historical baseline — repeat F2b regression probe query "Smoke V2 F1"
- **Recall (8)** — R-01..R-08 (also re-verifies V2-037 post-apply behaviour)
  - R-01 zero-match by bogus category → `Memory recall completed (0 rows).`
  - R-02 one-row by category `db_infra` → `Memory recall completed (1 row).` (singular)
  - R-03 multi-row by category `mixed_flow` → `Memory recall completed (N rows).` (plural, N≥2)
  - R-04 five-row by category `observation` → `Memory recall completed (5 rows).`
  - R-05 filter intersection — thread + entity + category
  - R-06 no-filters recall → tenant-scoped
  - R-07 no DB side effects (SQL invariant SQL-NOWRITE-RECALL confirms)
  - R-08 recall error path (omit required field) → prep `_error` short-circuits; summary/envelope well-formed
- **Promote (8)** — P-01..P-08
  - P-01 accept via caller `user_confirmed=true` on S-08's row → recent → long_term; `acceptance_signals=['user_confirmed']`
  - P-02 accept via caller `evidence_validated=true` on a fresh S-09 row
  - P-03 accept via row-persisted `evidence_validated` (use a tenant row where row.ev=true, caller both false) → `acceptance_signals=['evidence_validated']`
  - P-04 accept via row-persisted `corroboration_count ≥ 2` (store_memory seed with corro=2, then promote with both flags false)
  - P-05 deny `acceptance_criteria_not_met` — cc=1, uc=false, ev=false, row.ev=false
  - P-06 deny `not_in_recent_tier` — target already long_term
  - P-07 idempotent replay of P-01 — already promoted → `not_in_recent_tier`, no side-effect
  - P-08 invalid target — bogus UUID → `INVALID_PROMOTION_TARGET`
- **Supersede (8)** — SU-01..SU-08
  - SU-01 happy replacement — old → superseded, new → active with `supersedes_memory_id` backlink and 1536-d embedding
  - SU-02 idempotent replay of SU-01 — ON CONFLICT DO NOTHING, `rows_for_key=1`
  - SU-03 invalid target — bogus UUID → `SUPERSEDE_TARGET_INVALID`, no row created
  - SU-04 subjective-guard RO on replacement content → short-circuit, no insert, no supersede
  - SU-05 old-row status preserved until new-row commit; no torn states
  - SU-06 new-row backlink = old-row id (SQL invariant SQL-SU-BACKLINK)
  - SU-07 new-row has embedding IS NOT NULL with dim=1536 (SQL invariant SQL-SU-EMBED)
  - SU-08 non-target existing rows unchanged (SQL invariant SQL-SU-NONTGT)
- **Cross-lane / envelope / RA (10)** — X-01..X-10
  - X-01 `module_result` shape — `status_kind`, `result_type`, `execution_context_id`, `thread_id`, `tenant_id`, `module_result.{module_name,step_id,result_type,status,summary,actions_executed,artifacts,confidence,needs_followup,followup_requests}`, `module_execution_started`, `domain_writes_performed`, `response_generation_allowed` all present
  - X-02 `domain_writes_performed` true on store/promote/supersede, false on recall/search
  - X-03 `aggregation_input` envelope from `ME_Build_RA_Envelope` success branch emits `domain_writes_performed: false` unconditionally (V2-OBS / V2-027 invariant)
  - X-04 error envelope — invalid action → error envelope well-formed; RA gate passes with `module_execution_completed=false, domain_writes_performed=false`
  - X-05 `active=true` workflow availability — pre-smoke `verify_workflow` confirms
  - X-06 settings unchanged throughout the smoke — post-smoke re-verify
  - X-07 chat-trigger wrapper shape — `chatInput` JSON-stringified envelope accepted
  - X-08 dispatch → RA sub-call reaches `ME_Dispatch_To_RA_01_SUBCALL` with `rollup_status=success` (visible in runData)
  - X-09 non-target lanes unchanged — no unexpected diff on non-target nodes across the smoke (byte-identity holds)
  - X-10 final all-actions sanity — a last store+recall pair confirms the chain end-to-end

Every runtime case is driven via `mcp__f2e8be41__execute_workflow` (chat-mode) with the V2-037 smoke-envelope builder. Raw execution JSON captured at `artifacts/runtime/exec_<id>.raw.json` via `curl GET /api/v1/executions/<id>?includeData=true`.

Oracle: per-case expected `status`, `summary`, `module_result.status`, `acceptance_signals` where applicable, `domain_writes_performed`, `recall_results` / `search_results` normalised counts, and `denial_reason` verbatim.

## SQL matrix — 50 invariants

Executed via `mcp__postgres__execute_sql` (SELECT-only). Grouped as:

- **SQL-ROW (10)** — row counts per mission namespace; exactly one row per idempotency key where applicable; no duplicate idempotency keys; pre-mission NULL-embedding count unchanged.
- **SQL-EMBED (10)** — embedding dim=1536 on all new store/supersede rows in mission namespace; embedding IS NOT NULL; ivfflat definition unchanged.
- **SQL-TENANT (5)** — tenant isolation: smoke rows only under tenant `aaaa…0001`; no cross-tenant leakage.
- **SQL-TIER (5)** — promote accept cases flip recent → long_term; deny cases preserve tier; supersede old-row tier preserved; no orphaned tier transitions.
- **SQL-SUPERSEDE (5)** — old-row status=`superseded`, new-row status=`active`, `supersedes_memory_id` backlink matches old-row id, no duplicate active per `idempotency_key`, no cross-supersede contamination.
- **SQL-SIGNAL (5)** — `evidence_validated` persisted when caller/row carries true; `corroboration_count` persisted per caller input (≥1 CHECK respected); `user_confirmed` persisted.
- **SQL-NOWRITE (5)** — recall and search invocations in mission namespace produce zero new rows.
- **SQL-INDEX (3)** — index inventory on `memory_items` matches frozen list (9 indexes); ivfflat config verbatim; no new indexes.
- **SQL-SCHEMA (2)** — `memory_items` column count and types unchanged.

Total: 10+10+5+5+5+5+5+3+2 = **50**.

## Diff / identity checks

- Pre-smoke: capture live workflow snapshot via local `n8n-patch.mjs get` OR rely on the pack's latest `snapshots/uq26nh1grIpnHju0_after_*.json` (currently the V2-037 post-apply snapshot).
- Post-smoke: fetch workflow again and byte-diff; assert no mutation during Mission C.
- Assert `versionId=9d1da628-…`, `nodeCount=49`, `connectionCount=67`, `active=true` throughout.

## Acceptance

- Runtime matrix: 50/50 cases meet their per-case oracle. Up to 1 rare-embedding variance (e.g. OBS-E6.5 rank inversion on short rare-token queries) is tolerated **only if** it is an already-classified observation, not a new defect.
- SQL invariants: 50/50 checks GREEN.
- Non-target lanes: byte-identity held (V2-037 post-apply jsCode sha256 on `ME_Memory_Recall_Result` unchanged; all other nodes unchanged).
- No workflow mutation during Mission C.
- No DB schema / index mutation during Mission C.

Final verdict: **`MEMORY_100_FOR_CURRENT_STAGE = TRUE`** if all above pass.

## Failure mode

- Any load-bearing failure → stop with `MEMORY_CERTIFICATION_BLOCKED`; do not patch opportunistically; record failure in `FINAL_MEMORY_CERTIFICATION_RECONCILIATION.md`; open a follow-up micro-mission only if scope is clear.

## Output files

- `FINAL_MEMORY_CERTIFICATION_SMOKE_PLAN.md` (this file)
- `FINAL_MEMORY_CERTIFICATION_SMOKE_RESULTS.md`
- `FINAL_MEMORY_CERTIFICATION_SQL_RESULTS.md`
- `FINAL_MEMORY_CERTIFICATION_RECONCILIATION.md`
- `artifacts/runtime/exec_<id>.raw.json` (50 files)
- `artifacts/sql/*.txt` (50 result captures)
- `tests/final_memory_certification_matrix.json` (per-case inputs + expected)
