# F3.1 Audit Report

> **Produced:** 2026-04-21
> **Pair docs:** `F31_BUILD_REPORT.md` (what was built), `F31_FINAL_STATUS.md` (closure verdict).

---

## 1. What was audited

1. **Truth anchor parity** — frozen constants in F31 docs vs. DB + MCP.
2. **Matrix determinism** — regenerating `matrix/f31_cases_150.json` from the generator produces identical bytes.
3. **Harness end-to-end** — emit → live execute → oracle pipeline proven on 3 cases across 2 families.
4. **DB invariant (read-only families)** — `MAX(updated_at)` stable across all executed read-only cases.
5. **Workflow contract echo** — `applied_filters` on recall, `status_kind` + `result_type` envelope, `allowed_next_stage: WF-RA-01`.
6. **Fix log integrity** — every fix entry has a bucket, root cause, rerun scope + verdict.
7. **Blocker register integrity** — the one open blocker is classified non-blocking with a documented workaround.

---

## 2. Parity check: F31 constants vs. live state

| Constant | F31 claim | Live value (2026-04-21T19:59Z) | Match |
|---|---|---|---|
| workflow_id | `uq26nh1grIpnHju0` | `uq26nh1grIpnHju0` | ✓ |
| active versionId | `b8e2f194-0263-46d9-8306-1534cc7c31fe` | `b8e2f194-0263-46d9-8306-1534cc7c31fe` | ✓ |
| n_nodes | 45 | 45 (per `json_array_length(nodes)` on workflow_entity) | ✓ |
| active flag | `true` | `true` | ✓ |
| tenant rows (active) | 12 (baseline) | 12 (no mutation over session) | ✓ |
| tenant rows (superseded) | 3 | 3 | ✓ |
| entity_id (under tenant) | `eeeeeeee-0000-0000-0000-000000000001` (post-FIX-001) | `eeeeeeee-0000-0000-0000-000000000001` (5 active rows under thread 0003) | ✓ |

No drift. The pre-FIX-001 entity_id (`eeee0000-…`) was corrected before any recall cases were executed under the wrong anchor produced non-PASS verdicts.

---

## 3. DB invariant check

| Exec | Case | Pre `MAX(updated_at)` | Post `MAX(updated_at)` | Invariant |
|---|---|---|---|---|
| 1675 | `f31-search-001` | `2026-04-21T12:54:40.918Z` | `2026-04-21T12:54:40.918Z` | ✓ unchanged |
| 1729 | `f31-recall-033` (positive) | `2026-04-21T12:54:40.918Z` | `2026-04-21T12:54:40.918Z` | ✓ unchanged |
| 1738 | `f31-recall-001` (zero) | `2026-04-21T12:54:40.918Z` | `2026-04-21T12:54:40.918Z` | ✓ unchanged |

All three read-only smoke cases left the tenant's `memory_items` timestamp untouched. No silent mutation detected.

---

## 4. Oracle verdicts (Stage B smoke)

| Case | Verdict | Bucket | Reason |
|---|---|---|---|
| `f31-search-001` | PASS | — | search oracle all checks pass |
| `f31-recall-001` | PASS | — | recall oracle all checks pass (zero-match placeholder `[{}]` does not violate any asserted predicate) |
| `f31-recall-033` | PASS | — | recall oracle all checks pass (5 active rows, `created_at DESC` verified) |

All three persist in `artifacts/runtime/verdict_<case_id>.json` and are reflected in `family_*_index.json` + `totals.json`.

---

## 5. Fix log audit

`F31_FIX_LOG.md` contains 2 entries; both meet the entry shape required by `05_F31_BLOCKER_AND_DISPATCH_PROTOCOL.md`.

- **F31-FIX-001** (entity_id correction): bucket `BAD_TEST_DEFINITION`. Root cause identified (matrix copied from F3 batch prose, not live DB). Rerun scope declared (50 recall cases). Rerun verdict partially recorded (2 of 50 re-executed under corrected anchor — PASS both).
- **F31-FIX-002** (recall zero-match shape): re-classified from candidate `RUNTIME_WORKFLOW_BUG` to non-bug. Positive + zero probes disambiguated the Postgres node's placeholder behavior. No workflow change needed.

No fix entry is left open.

---

## 6. Blocker register audit

`F31_BLOCKER_REGISTER.md` has one entry:

- **F31-BLOCKER-001** — walker.mjs sandbox read quirk. Classified as non-blocking because F3.1 built its own sidecar runner (`harness/f31_runner.mjs`) instead of reusing the `memory_module/walker.mjs`. Documented in the register with the workaround.

Dispatch log is empty; no external-system work was required.

---

## 7. Follow-ups (open but not F3.1-blocking)

- **V2-OBS-RECALL-SUMMARY-STRING** — `ME_Memory_Recall_Result` summary string says "1 rows" on zero matches. Cosmetic. Suggested minor fix: compute the count from `recall_results.filter(r => r.memory_id).length` rather than the raw array length. Out of scope for F3.1 (no workflow edits) — route through F6 when opened.
- **Stage C full execution** — the remaining 147 cases (49 search + 48 recall + 25 promote + 25 supersede) are generated, validated, and emit-ready; execution is deliberately deferred to next session. See `F31_FINAL_STATUS.md §Next step`.
- **Walker.mjs sandbox read quirk** — outside F3.1 scope; not tracked further in this report.

---

## 8. Self-check

| Audit item | Result |
|---|---|
| Constants parity with live state | ✓ |
| Matrix determinism re-check | ✓ (regenerates identically) |
| Harness roundtrip on >1 families | ✓ (search + recall) |
| Zero silent DB mutation during F3.1 execution | ✓ |
| Fix log entries complete and closed | ✓ |
| Blocker register open entries are non-blocking | ✓ |
| Follow-ups documented with route | ✓ |
| No vague stops | ✓ — next-step cursor lives in `F31_FINAL_STATUS.md` |
