# F6A-FOLLOWUP-SUPERSEDE-EMBED — Pack Manifest & Read Status

Pack archive: `CLAUDE_AUTONOMOUS_IMPLEMENTATION_PACK_F6A_FOLLOWUP_SUPERSEDE_EMBED_V2_WITH_TESTS (1).zip`
Unpacked to: `/sessions/tender-amazing-franklin/f6a_followup_pack/`
Test artifacts mirrored into: `docs/architecture/memory/v2/f6a_followup_supersede_embed/tests/`
Inventory captured: 2026-04-24 (13 files total; no subfolders omitted).

## Authority priority (per operator prompt §1)

1. `OPERATOR_PROMPT_FOR_CLAUDE_F6A_FOLLOWUP_SUPERSEDE_EMBED.md`
2. `CLAUDE_AUTONOMOUS_IMPLEMENTATION_PACK_README_V2.md` (newer; supersedes V1 README)
3. `F6A_FOLLOWUP_SUPERSEDE_EMBED_GRANULAR_PHASE_PLAN.md`
4. `F6A_FOLLOWUP_SUPERSEDE_EMBED_TEST_PLAN.md`
5. `tests/**` — fixtures / harnesses
6. `docs/TEST_EXECUTION_REQUIREMENTS_ADDENDUM.md`, `tests/live/live_evidence_template.md` — evidence templates

## Files (all 13)

| # | Path (relative to pack root) | Status | Notes |
|---|---|---|---|
| 1 | `OPERATOR_PROMPT_FOR_CLAUDE_F6A_FOLLOWUP_SUPERSEDE_EMBED.md` | READ, USED_FOR_CONTEXT + USED_FOR_IMPLEMENTATION | Authoritative operator directive. Defines mission `F6A-FOLLOWUP-SUPERSEDE-EMBED`, sub-roles, preflight, scope, interdictions, stop conditions, required outputs. |
| 2 | `CLAUDE_AUTONOMOUS_IMPLEMENTATION_PACK_README.md` | READ, USED_FOR_CONTEXT | V1 README. Explicitly superseded by V2 README per pack convention; content preserved for audit. |
| 3 | `CLAUDE_AUTONOMOUS_IMPLEMENTATION_PACK_README_V2.md` | READ, USED_FOR_CONTEXT | V2 README. Canonical pack overview; lists test artifact paths; restates canonical channel (V2-028) and interdictions. |
| 4 | `F6A_FOLLOWUP_SUPERSEDE_EMBED_GRANULAR_PHASE_PLAN.md` | READ, USED_FOR_IMPLEMENTATION | Phase 0..10 task list with parallel workstreams A-D in Phase 2 + gate rules. Maps 1:1 to internal task IDs #10..#19. |
| 5 | `F6A_FOLLOWUP_SUPERSEDE_EMBED_TEST_PLAN.md` | READ, USED_FOR_TESTS | Test philosophy + expected patch surface + sections A (preflight PF-1..PF-7), B (merge MU-1..MU-9), C (diff WD-1..WD-14), D (integration LI-1..LI-8), E (live E1..E6), F (DB-1..DB-8), G (acceptance). |
| 6 | `docs/TEST_EXECUTION_REQUIREMENTS_ADDENDUM.md` | READ, USED_FOR_TESTS | Requires the concrete `tests/` artifacts be preserved and actually executed; mission cannot close SUCCESS without running these artifacts or stricter documented equivalents. |
| 7 | `tests/README_TESTS.md` | READ, USED_FOR_TESTS | Declares merge harness contract: candidate module must export default `mergeSupersedeEmbedding(prep, httpResp)`. |
| 8 | `tests/fixtures/merge_candidate_contract_example.mjs` | READ, USED_FOR_TESTS | Reference example of merge pure function (example only — real candidate must be derived from final Code node jsCode). |
| 9 | `tests/local/run_merge_unit_tests.mjs` | READ, USED_FOR_TESTS | Node harness with 9 unit cases (MU-1..MU-9). Imports candidate via CLI arg. |
| 10 | `tests/local/run_workflow_diff_tests.mjs` | READ, USED_FOR_TESTS | Node harness with 14 diff/surface checks (WD-1..WD-14). Expects `--pre` and `--post` workflow JSON paths. |
| 11 | `tests/live/e2e_matrix_f6a_followup_supersede_embed.json` | READ, USED_FOR_TESTS | 6 E2E cases (E1..E6). Declares `namespace_prefix=mem-smoke-f6a-followup-supersede-embed`, expected post-apply `nodeCount=49 / connectionCount=67`. |
| 12 | `tests/live/live_evidence_template.md` | READ, USED_FOR_TESTS | Evidence scaffold (baseline + exec IDs + DB invariants + verdict). |
| 13 | `tests/sql/select_invariants_f6a_followup_supersede_embed.sql` | READ, USED_FOR_TESTS | 6 SELECT-only probes. Placeholders `__MISSION_NAMESPACE__` and `__APPLY_TIMESTAMP_UTC__`. |

## Key contract facts extracted

- **Expected post-apply shape:** `nodeCount=49 (47+2)`, `connectionCount=67 (65+2 net)`, `active=true`.
- **New nodes:** `ME_Memory_Supersede_Embed` (HTTP, `openAiApi` credential, `text-embedding-3-small`) + `ME_Memory_Supersede_Embed_Merge` (Code, pure `{prep, httpResp}` → 14? slots).
- **Rewire:** remove edge `Supersede_Prep → Supersede_DB`; add `Supersede_Prep → Supersede_Embed → Supersede_Embed_Merge → Supersede_DB` (net +2 edges).
- **SQL change:** append `embedding` column to replacement-row INSERT projection; add CASE-guarded `$N::vector(1536)` to queryReplacement; non-error branch slot count +1; error/null branch null-count +1.
- **Idempotency namespace:** `mem-smoke-f6a-followup-supersede-embed-*`.
- **Apply channel:** strict V2-028 agent-run local `n8n-patch.mjs`. No Path 5. No MCP patch writes.

## Unreadable files

None.
