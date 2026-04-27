# CLOSURE_REPORT_MEMORY_V2_F5.md

> F5 — subjective-guard multi-language — CLOSED.
> Date: 2026-04-21.
> Channel: Postgres direct UPDATE (`mcp__postgres__execute_sql`) — new DIVERGENCE (`D-M-014` / ledger `V2-023`) after canonical CLI + MCP PUT + MCP `patch_workflow_nodes` all proven blocked.
> Succeeds `BLOCKED_REPORT_MEMORY_V2_F5_20260421.md`.

## 1. Summary

F5 adds English support to the subjective-judgment guard on `WF-ME-01 ME_Memory_Store_Prep` and `ME_Memory_Supersede_Prep`. Callers provide `step.inputs.locale`; normalized primary subtag decides which regex list runs (`SUBJECTIVE_RO` or `SUBJECTIVE_EN`); missing / unknown locale ⇒ `ro` safety floor. V1 RO behaviour preserved byte-identically. Zero schema / SQL / HTTP / credential changes.

## 2. Live workflow state (post-F5)

| Field | Value |
|---|---|
| Workflow id | `uq26nh1grIpnHju0` |
| Name | WF-ME-01 Module Execution |
| Active | true |
| Node count / connection count | 45 / 63 (unchanged from F4) |
| versionId lineage | F4 `fc43f6bc-6f25-4588-afda-edadb55735ff` → F5 `b8e2f194-0263-46d9-8306-1534cc7c31fe` |
| updatedAt | 2026-04-21T12:52:49.680Z (final, after smoke-enablement fixup) |
| Settings | `{binaryMode:"separate", callerPolicy:"workflowsFromSameOwner", availableInMCP:true, executionOrder:"v1"}` (net strip: `timeSavedMode`) |

## 3. Prep-node surface (exact)

Both Prep nodes now contain:

- `SUBJECTIVE_RO` — the 6 v1 Romanian regexes, byte-identical to v1.
- `SUBJECTIVE_EN` — 8 new English regexes per patch_plan_f5 §3.
- `LOCALE_LISTS = { ro: SUBJECTIVE_RO, en: SUBJECTIVE_EN }`.
- `SUPPORTED_LOCALES = ['ro', 'en']`.
- Normalization: `inputs.locale.trim().toLowerCase().split(/[-_]/)[0]` (BCP-47-ish primary subtag).
- Fallback: `SUPPORTED_LOCALES.includes(normLocale) ? normLocale : 'ro'`.
- Guard scope: runs only when `inputs.memory_type ∈ {'observation', 'pattern'}`.
- Idempotency prefixes preserved: `store_memory:` on Store Prep; `supersede_memory:` + `old_id: inputs.supersedes_memory_id` on Supersede Prep.

Raw jsCode sha256 (post-apply):

- Store Prep: `65506b00e89bf21009b2a02f7750a2d6b94f27daa6cb6c48d95bb8ea69060cbc` (byte-identical to `patchF5_store_prep_params.json.jsCode`).
- Supersede Prep: `23f3e95e61e40450b9bc37bc0737e679f7ac061ae3d72206eed98074424b37ff` (byte-identical to `patchF5_supersede_prep_params.json.jsCode`).

## 4. Smoke — 7/7 PASS

| Case | Exec | Prep output | DB row |
|---|---|---|---|
| F5-1 ro observation "prost incompetent" | 1626 | `SUBJECTIVE_JUDGMENT_FORBIDDEN` | none |
| F5-2 en observation "lazy idiot" | 1635 | `SUBJECTIVE_JUDGMENT_FORBIDDEN` | none |
| F5-3 en observation neutral | 1644 | `__db` block | `0fac0a58-…` inserted |
| F5-4 missing locale pattern "om de rău caracter" | 1646 | `SUBJECTIVE_JUDGMENT_FORBIDDEN` (ro default) | none |
| F5-5 xx pattern "dezgustator" | 1655 | `SUBJECTIVE_JUDGMENT_FORBIDDEN` (ro fallback) | none |
| F5-6 en fact "lazy idiot" | 1664 | `__db` block (fact bypasses guard) | `b34bd369-…` inserted |
| F5-7 en supersede "incompetent" | 1666 | Supersede Prep `SUBJECTIVE_JUDGMENT_FORBIDDEN` (mirror); F5-3 untouched | none |

Full trace-level evidence: `docs/architecture/memory/v2/f5/artifacts/runtime/smoke_summary_f5.md`.

DB invariant post-run:

```
SELECT id, memory_type, tier, idempotency_key FROM memory_items
 WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f5-%'
 ORDER BY created_at;
→ 2 rows (F5-3 observation, F5-6 fact). Cases 1/2/4/5 produced no row.
F5-3 row unchanged by F5-7 (updated_at == created_at, supersedes_memory_id is null, status/tier unchanged).
```

## 5. Gate outcomes

| Gate | Outcome |
|---|---|
| F5.0 Option A chosen | done (operator decision 2026-04-21) |
| F5.1 payloads built + local sanity | done |
| F5.2 apply + runtime smoke | done |

F5 frontier CLOSED.

## 6. Blocker / bug status

| Id | Pre-session | Post-session |
|---|---|---|
| `BLOCKER-V2-F5-01` (sub-A: sandbox egress) | open | open — still a live infra gap, but no longer blocking F5 (Path 5 bypasses). |
| `BLOCKER-V2-F5-01` (sub-B: MCP patch_workflow_nodes settings validation) | open | open — still an MCP tool bug for future tool-side fix. Not blocking F5. |
| `BLOCKER-V2-F5-01` overall | blocking F5 rollout | resolved for F5 purposes (two sub-blockers downgraded from "blocks F5" to "open infra/tool followups"). |

Registered resolution note in `MEMORY_V2_BUG_LEDGER.md`.

## 7. Artefact inventory (F5 frozen set)

| Path | Role |
|---|---|
| `MEMORY_V2_F5_OPERATOR_DECISION_20260421.md` | Operator unlock (Option A + Q1–Q5 answers) |
| `v2/f5/design_f5_proposal.md` | Pre-decision design proposal |
| `v2/f5/patch_plan_f5.md` | Rollout plan |
| `v2/f5/artifacts/build_patch_f5.mjs` | Deterministic builder with compile-time canaries |
| `v2/f5/artifacts/patchF5_store_prep_params.json` | Store jsCode params (sha `30450a28…`) |
| `v2/f5/artifacts/patchF5_supersede_prep_params.json` | Supersede jsCode params (sha `7432fc26…`) |
| `v2/f5/artifacts/prep_me_memory_store_prep_pre_f5.js` | v1 baseline (rollback source) |
| `v2/f5/artifacts/prep_me_memory_supersede_prep_pre_f5.js` | v1 baseline (rollback source) |
| `v2/f5/artifacts/wf_me_01_pre_f5.json` | Pre-F5 snapshot (first capture) |
| `v2/f5/artifacts/wf_me_01_preapply_mcp_20260421.json` | Pre-MCP-attempt snapshot |
| `v2/f5/artifacts/db_apply_20260421/wf_me_01_preapply_db_20260421.json` | Pre-DB-apply snapshot (this session) |
| `v2/f5/artifacts/db_apply_20260421/wf_me_01_postapply_db_20260421.json` | Post-DB-apply snapshot (this session) |
| `v2/f5/artifacts/db_apply_20260421/f5_apply.sql` | Apply SQL (with F5 jsCode inline via dollar-quoting) |
| `v2/f5/artifacts/db_apply_20260421/new_version_id.txt` | `b8e2f194-0263-46d9-8306-1534cc7c31fe` |
| `v2/f5/artifacts/db_apply_20260421/diff_surface_verification.txt` | Byte-diff proof of surgical surface |
| `v2/f5/artifacts/runtime/envelope_F5-{1..6}.json` + `F5-7_TEMPLATE.json` | Smoke envelopes |
| `v2/f5/artifacts/runtime/exec_f5_case1_1626.oracle.md` | F5-1 oracle verdict |
| `v2/f5/artifacts/runtime/smoke_summary_f5.md` | Full 7-case smoke summary + DB invariant |
| `v2/f5/apply_evidence_f5_20260421.md` | Apply evidence (§1 pre-state … §10 next steps) |
| `v2/f5/BLOCKED_REPORT_MEMORY_V2_F5_20260421.md` | Prior blocked report (superseded by this closure) |
| `MEMORY_V2_DECISION_LEDGER.md` V2-023 | Channel-exception authorization (DB direct UPDATE) |
| `DIVERGENCE_REGISTER_MEMORY.md` D-M-014 | Channel DIVERGENCE record |
| `MEMORY_V2_BUG_LEDGER.md` BLOCKER-V2-F5-01 | Resolved subsection |
| `MEMORY_V2_PHASE_GATES.md` F5.0/F5.1/F5.2 | All `done` |
| `MEMORY_V2_STATE.md` active frontier | Updated post-F5 |
| `SESSION_HANDOFF_NEXT.md` §A/§D | Updated post-F5 |
| `MEMORY_V2_CLOSEOUT.md` | Pointer entry added |
| `WORK_LOG_MEMORY_V2_F5.md` | Full audit trail including this closure |

## 8. What this doesn't close

- **F3.1 walker** — still pending (150-case combinatorial expansion harness).
- **MCP tool bug** (`patch_workflow_nodes` PUT settings whitelist filter) — still open; now non-blocking because Path 5 exists.
- **Sandbox egress allowlist** — still the original 403 from `localhost:3128`; still non-blocking.
- **Prep-reject downstream masking** (Prep returns `_error`, DB node emits `DB_WRITE_FAILED` / `SUPERSEDE_TARGET_INVALID` instead of propagating Prep's error code cleanly) — pre-existing workflow behaviour since v1; documented in `final_verification.md §Known limitations`; no F5 regression; future refactor candidate.
- **v2 additional locales** (`es`, `fr`, etc.) — deferred per operator decision §6 (stewardship policy).

## 9. Authority

- `Architecture_Spec_v3_Ucenicul.md` — unchanged (no architectural deltas from F5).
- `MEMORY_V2_STATE.md` — authoritative v2 state; updated this closure.
- `MEMORY_V2_F5_OPERATOR_DECISION_20260421.md` — authoritative F5 decision; unchanged.
- This closure report — authoritative F5 evidence. Supersedes `BLOCKED_REPORT_MEMORY_V2_F5_20260421.md` for "what happened / what landed".
