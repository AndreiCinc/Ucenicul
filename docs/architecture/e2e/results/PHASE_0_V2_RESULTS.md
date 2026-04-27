# PHASE 0 v2 — Re-run with Intent Mapping Results

Run tag: `p0_v2`
Date: 2026-04-25
Mission: E2E-INTENT-MAPPING-FIXTURE-ALIGNMENT-AND-PHASE1-CONTINUE
Cases: 5
PASS (chain reaches MO): **5 / 5**
PASS (SQL invariants): **0 / N** (product-gap blocked — see §3 / §6)
Verdict: `E2E_PHASE1_PARTIAL_WITH_PRODUCT_GAPS`

---

## 1. Mapping applied (per Option A)

`docs/architecture/e2e/harness/intent_mapping.mjs` — corridor + variant → system intent:

| corridor / variant | system intent | rationale |
|---|---|---|
| C1 baseline_ro | briefing | response-only question |
| C2 baseline_ro | save_suggestion (tried) → store_memory (corrected) | memory write |
| C5 baseline_ro | briefing | social ack |
| C9 thread_B_operational_continue_negative | search_memory (override) | "Ce știi despre Andrei?" is a recall query semantically |
| C11 first_delivery (not used in p0_v2) → save_suggestion | mapped to write-side intent |

The mapping module exposes `getSystemIntent(matrixCase)` and `expectsDomainWrite(matrixCase)`.

## 2. Fixtures seeded (`seed_fixtures.mjs`)

Single idempotent SQL batch produces:
- `tenants` rows (3 e2e lanes, ON CONFLICT DO NOTHING)
- `threads` rows per case (deterministic UUID, ON CONFLICT DO NOTHING)
- `messages` rows per case **with `intent` column pre-set** (ON CONFLICT DO NOTHING)

Before each phase, run:
```
node seed_fixtures.mjs --run-tag <tag> --phase <PHASE_NAME>  >  /tmp/seed.sql
mcp__postgres__execute_sql  with the contents of /tmp/seed.sql
```

## 3. Chain reach (5 / 5 — all reach MO)

| case_id | tr_exec | hops_str | RA agg_status | RA modules | MO terminal |
|---|---|---|---|---|---|
| C1-L1-V1  | 7374 | TR→EC→OR→PL→DI→ME→RA→SU→RC→MO | success | improvement_module | MISSING_DELIVERY_TARGET |
| C2-L1-V1  | 7378 | same                            | success | improvement_module | MISSING_DELIVERY_TARGET |
| C5-L1-V1  | 7392 | same                            | success | memory_module      | MISSING_DELIVERY_TARGET |
| C9-L1-V3  | 7396 | same                            | success | memory_module      | MISSING_DELIVERY_TARGET |
| C11-L1-V1 | 7410 | same                            | success | improvement_module | MISSING_DELIVERY_TARGET |

Chain **completes structurally** for all 5 cases. RA aggregation reports success.

## 4. SQL invariants — all return zero side-effects

```
C1-L1-V1.assert_no_memory_write_for_case               : c=0  (trivially-pass: nothing written anywhere)
C1-L1-V1.assert_one_outbound_for_case                  : c=0  (FAIL — but downgraded to KNOWN_FIXTURE_LIMITATION by oracle)
C2-L1-V1.assert_memory_row_exists                       : c=0  (FAIL — should have been ≥1 if write actually happened)
C5-L1-V1.tasks/reminders/memory_items                   : c=0  (trivially-pass)
C9-L1-V3.assert_new_thread_id                           : c=0  (FAIL — see §5)
C9-L1-V3.assert_no_cross_thread_execution_state_resume  : c=0  (trivially-pass)
C11-L1-V1.memory_count                                  : c=0
General sanity (e2e tenant default lane)                : tasks=0 reminders=0 memory_items=0 outbound=0
```

The chain wrote **0 rows** to any side-effect table for our e2e tenant. Yet `execution_contexts`
**did** receive 8 rows (one per fire) — but with chain-internal `idempotency_key='tr-to-ec:<tenant>:<message_id>:v1'`, **not** our request-level key `e2e:p0_v2:<case>`. That mismatch is why
`assert_new_thread_id` returned 0: the IN-clause filtered by `idempotency_key LIKE 'e2e:%'`
which never matches the chain-internal key.

## 5. Why side-effect tables are empty — root cause F9

OR's emitted handoff payload carries:

```json
"orchestrator_input": {
  "planning_mode": "plan_only",
  "module_execution_allowed": false,
  "response_generation_allowed": false,
  "domain_writes_allowed": false
}
```

These flags are **default `false`** in the canonical chain.  When ME's handlers run, they
build a `module_result` shape (so RA aggregates "success"), but **no actual DB write happens**.
That is why:

- `memory_items` count = 0 even after 5 fires that included `save_suggestion`/`store_memory`/`search_memory` intents
- `tasks`/`reminders` count = 0
- `outbound_delivery_ledger_claude_mcp` count = 0 (system-wide, ever — confirmed below)
- Phase 12.3 (the historical "TR→MO 4/4 green") **also wrote nothing**:

```
phase12_3 window 2026-04-20T16:30:00Z..16:35:00Z:
  tasks=0  reminders=0  memory_items=0  outbound_ledger=0
```

Phase 12.3 PASS was a **planning-success PASS**, not a side-effect PASS.  This was not
explicitly called out in the prior reconciliation.

## 6. Implications for the matrix

The matrix's invariants — `assert_memory_row_exists`, `assert_one_outbound_for_case`,
`assert_supersede_backlink`, `assert_no_cross_thread_execution_state_resume`, `assert_idempotency_unique`,
`assert_no_domain_write_on_ambiguous`, etc. — almost all assume the chain writes side-effects.

In the current chain configuration these invariants either:
- Trivially pass (nothing was written, so "no-write" assertions succeed)
- Trivially fail (no row to find, so "row exists" assertions fail)

Either way, the matrix is **not actually testing what it's authored to test**.  The P0
corridors (C9 cross-thread leak, C10 tenant leak, C11 idempotency) all hinge on side-effects
that don't happen.

## 7. Walker hardening — F11

Two fires in flight simultaneously cause the timestamp-proximity walker to attribute
DI→ME→RA→SU→RC→MO of the SECOND fire to the FIRST fire (executions of the same workflow
within the 90s window).  Verified empirically:

- C1 (TR 7374) and C2 (TR 7378) both walked to DI:7382, ME:7383, RA:7384, SU:7385, RC:7386, MO:7387
  — same shared downstream chain.
- C5 (TR 7392) and C9 (TR 7396) both walked to DI:7400 onward.
- C11 (TR 7410) fired with delay → got distinct downstream 7414-7419.

**Fix**: fire cases sequentially (await chain completion before next fire).  Implemented
informally in §3 by spacing.  For batch runs the runner needs a "sequential fire" mode that
the agent loop honours.  Documented in `e2e_runner.mjs` README.

## 8. Idempotency-key scoping — F10

Chain stages don't preserve our request-level `idempotency_key`.  Each stage derives its own:
`tr-to-ec:<tenant>:<message_id>:v1`, then EC→OR has its own, etc.  Our SQL invariants
(in `e2e_sql_invariants.mjs`) scope by `LIKE 'e2e:%'` which never matches.

**Fix needed in invariants**: use `metadata->>'e2e_run_tag'` (if propagated) OR
`tenant_id + thread_id + created_at >= fire_iso` triple as the canonical scoping key.
Marked as harness backlog item.

## 9. Open product blockers (operator decision)

- `B-DOMAIN-WRITES-DEFAULT` (F9): the chain runs `domain_writes_allowed=false` by default.
  The matrix cannot meaningfully test side-effects until either:
  - the chain default is flipped to `true` for these e2e tenants, OR
  - we can pass a "live execution mode" flag in the envelope (need to discover where this is
    accepted), OR
  - the matrix is revised to test plan-shape correctness rather than DB side-effects.
- `B-IDEMPOTENCY-KEY-PROPAGATION`: chain doesn't preserve request idempotency_key into
  side-effect rows.  Even with `domain_writes_allowed=true`, our invariants need a different
  scoping strategy (see §8).
- `B-INTENT-WRITE-VOCAB`: matrix `memory_write` does not map cleanly.  `save_suggestion`
  goes to `improvement_module` (separate table), `store_memory` may or may not be a valid
  preprocessor-emitted intent (untested).  Need product clarification on what `messages.intent`
  values actually trigger memory writes through the canonical chain.
- `B-E2E-DELIVERY-TARGET` (F6, prior): MO `MISSING_DELIVERY_TARGET` for e2e tenants is
  accepted as fixture limitation (operator decision in current mission).

## 10. What was achieved this session

| Step | Status |
|---|---|
| Build `intent_mapping.mjs` (per-corridor + per-variant) | ✅ |
| Build `seed_fixtures.mjs` (idempotent batch) | ✅ |
| Update SQL invariants for real schema (+ outbound ledger) | ✅ |
| Update oracle to recognise MISSING_DELIVERY_TARGET as fixture-limited | ✅ |
| Re-run Phase 0 (5 cases, all reach MO) | ✅ |
| Run SQL invariants → uncover plan-only finding | ✅ |
| Discover that Phase 12.3 also wrote nothing | ✅ |
| Phase 1 P0 batch run | ❌ blocked on F9 |
| Update reconciliation | ✅ (this file + reconciliation) |

## 11. Counts

- Cases prepared: 5
- Cases fired: 6 (5 in `p0_v2` + 1 retry of C2 in `p0_v3` with `intent='store_memory'`)
- Chain-reach-MO: 5 / 5 in p0_v2
- Workflow mutations: **0**
- Duplicate / parallel folders: **0**
- DB writes (additive, e2e lanes only): tenants 3 (already existed), threads 5 (new in p0_v2), messages 5 (new)
- TR exec IDs: 7374, 7378, 7392, 7396, 7410, 7424
- SQL invariant green-on-merit: **0** (all blocked by F9)
- SQL invariant green-trivially (no-write asserts): **2** (C1.no_memory, C5.no_domain_write — both pass because chain writes nothing)
- KNOWN_FIXTURE_LIMITATION (MO outbound): 1 (recognised by oracle)

## 12. Verdict line

**`E2E_PHASE1_PARTIAL_WITH_PRODUCT_GAPS`**

Chain handling is structurally green for all 5 Phase 0 cases.  The matrix's P0 corridors
cannot be evaluated meaningfully without resolving `B-DOMAIN-WRITES-DEFAULT` (F9) — the
canonical chain currently runs in plan-only mode and produces no side-effects.  This is a
**product/architecture decision**, not a harness defect.
