# TEST_PREP_GLOBAL_QUEUE

Run ID: `run_2026-04-19_autonomous` (continuation pass — test-readiness)
Scope: ordered queue of workflows for the next testing stage.
Ordering rationale: TEST_READY first (ordered by evidence strength + upstream dependency position); TEST_READY_WITH_LIMITS next (ordered by test-author payoff).

---

## 1. Queue order

### Tier A — TEST_READY (ready to author and run full off-node + live suites)

| # | WF | Verdict | Tier | Evidence strength | Upstream ready? | Downstream ready? |
|---:|---|---|---|---|---|---|
| 1 | WF-ME-01 | TEST_READY | CRITICAL | 650/650 harness, V1–V5 live PASS, V6 zero drift, closure 10/10 | DI ready | RA ready |
| 2 | WF-RA-01 | TEST_READY | STANDARD | 10/10 closure, V1–V6 live PASS (exec 734–738) | ME ready | SU ready |
| 3 | WF-PL-01 | TEST_READY | STANDARD | exec 711–714, V1/V4/V5/V6 PASS, 650 off-node | OR (limits) | DI ready |
| 4 | WF-DI-01 | TEST_READY | STANDARD | V1–V6 live PASS (exec 716–720), 650 off-node, zero DB drift | PL ready | ME ready |
| 5 | WF-EC-01 | TEST_READY | STANDARD | 484-line closure, 936-line test_families, exec 765–773 | TR (limits) | OR (limits) |
| 6 | WF-SU-01 | TEST_READY | CRITICAL | Live exec 744–747, verifier delivery, pindata fixtures | RA ready | RC (limits) |

### Tier B — TEST_READY_WITH_LIMITS (author and run with documented gaps)

| # | WF | Verdict | Tier | Limit summary |
|---:|---|---|---|---|
| 7 | WF-MO-01 | TEST_READY_WITH_LIMITS | STANDARD | Pre-live; no top-level closure (bundle only); `MO_Send_Channel_PLACEHOLDER` requires live provider binding |
| 8 | WF-RC-01 | TEST_READY_WITH_LIMITS | STANDARD | Pre-live (score 9.7); reports misfiled in docs/ (canonical content); no live V1–V6 |
| 9 | WF-OR-01 | TEST_READY_WITH_LIMITS | STANDARD | Pre-live; empty reports/; no closure; 650 off-node tests exist |
| 10 | WF-TR-01 | TEST_READY_WITH_LIMITS | STANDARD | Pre-live; no test_families.py (fixture-driven only); no tr_logic.py; messages.thread_id migration pending |

---

## 2. Execution strategy

### 2.1 Tier A — full suite authoring (parallel-safe)

For each WF in Tier A, the next pass should:
1. **Off-node suite**: compile and execute the existing `tests/test_families.py` against the WF's logic module. Capture per-family pass/fail counts and a results digest. For ME, RA, DI, PL, OR this is 13 × 50 = 650 tests each; for EC it is 10 × 30 = 300 tests.
2. **Live re-verification**: re-import the canonical JSON and replay V1–V6 (or per-WF vector set). Record new execution IDs alongside the historical ones in `reports/LIVE_EXECUTIONS__<WF>.md` (authoring this file is deferred per triage).
3. **Downstream handoff contract test**: execute the cross-workflow handoff at each boundary (PL→DI, DI→ME, ME→RA, RA→SU). Assert envelope shape and invariants per `WF-<upstream>_DOWNSTREAM_HANDOFF.md`.
4. **DB drift verification**: run pre/post probes on owned tables per `sql/20_read_path_probe.sql` / `sql/21_write_path_probe.sql` where present.

### 2.2 Tier B — constrained authoring

For each WF in Tier B:
1. **Off-node suite**: as Tier A (where `test_families.py` exists).
2. **TR special case**: author a test_families.py skeleton from `tests/fixtures/` contents; derive 16 vectors (TC-01..TC-16) as first-class tests. Apply the `messages.thread_id` migration before running reply-linkage tests (TC-02, TC-12, TC-15).
3. **Live import + V1–V6 establishment**: import the canonical JSON; exercise shell integrity (V1), invalid input (V2), happy path (V3), error paths (V4/V5), DB drift (V6). Record execution IDs.
4. **MO special case**: `MO_Send_Channel_PLACEHOLDER` must be bound to a real provider node (or a stub) before V3 happy-path can be asserted end-to-end.
5. **RC special case**: normalize misfiled `docs/*.md` → `reports/*.md` (gated by delete/move in this sandbox; deferred to cleanup pass).

---

## 3. Dependency graph for test execution

Chain order: `TR → EC → OR → PL → DI → ME → RA → SU → RC → MO`

For any end-to-end integration test, earlier stages must be test-ready before later stages. All 10 are test-ready, but Tier B stages have pre-live / closure gaps:

- **End-to-end readiness TODAY**: EC→OR→PL→DI→ME→RA→SU chain is verifiable end-to-end (EC live, OR pre-live, PL/DI/ME/RA/SU closed-live).
- **OR bottleneck**: OR has no closure report and no live proof — end-to-end paths through OR should be treated as TEST_READY_WITH_LIMITS.
- **TR, RC, MO bottlenecks**: all pre-live. End-to-end execution will require live import of these before full E2E coverage.

---

## 4. Parallelism guidance

- Tier A WFs can have their off-node suites authored and executed **in parallel** (each is independent at the unit level).
- Live re-verification should be **sequential per chain position** to avoid cross-workflow execution context collisions.
- DB drift probes should be **sequential** on shared tables (e.g., `execution_contexts` is touched by multiple WFs).

---

## 5. Explicit out-of-scope for next pass

- Physical file deletes / moves (delete gated in sandbox).
- Blueprint slimming / renames (duplicate-full blueprints in OR, PL, DI, RC remain; do not test against them).
- Extraction of live proof from embedded STATE into standalone `LIVE_EXECUTIONS__<WF>.md` files (non-test-blocking).
- desktop.ini file removal.

---

## 6. Next pass success criteria

1. Each Tier A WF has fresh off-node test results in `tests/results/` with timestamp ≥ the start of the next pass.
2. Each Tier A WF has fresh live execution IDs recorded (in STATE or a new LIVE_EXECUTIONS file).
3. Each Tier B WF has either (a) advanced to closed-live with a new execution ID set, or (b) has documented why it could not advance (e.g., pending migration, pending provider binding).
4. At least one end-to-end integration test run against the full chain (expected start: Tier A inner segment PL→DI→ME→RA→SU).
5. No fabricated evidence; all test results traceable to their fixture + workflow version.
