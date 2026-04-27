# F6A Blocker Register

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Opened: 2026-04-23
Status at open: OPEN, no active blocker.

Schema for each entry:
- ID — `F6A-B-NN` for active blockers; `F6A-X-NN` for deliberate exclusions (not blockers, but tracked here for auditability).
- Title
- Raised
- Phase
- Classification — ACTIVE_BLOCKER | RESOLVED | KNOWN_LIMITATION | DELIBERATE_EXCLUSION
- Impact on mission verdict
- Disposition

Update rule: append-only. Never rewrite an entry; add a `Resolution` subsection dated when a blocker is cleared.

---

## Active blockers

None at opening.

---

## Known deliberate exclusion — supersede-lane embedding producer

### F6A-X-01 — Supersede-lane embedding producer mirror

Raised: 2026-04-23 (by the mission brief itself)
Phase: 1 (scope freeze)
Classification: DELIBERATE_EXCLUSION

**Context.** The search lane (F2/F2b) has a two-node embedding producer (`ME_Memory_Search_Embed` + `ME_Memory_Search_Embed_Merge`). The store lane (F6A) adds the symmetric producer. The supersede lane — which currently writes replacement `memory_items` rows via its own INSERT — does **not** get the mirror in this mission.

**Why excluded.**

1. The mission id is literal: `F6A-STORE-PATH-EMBEDDING-PRODUCER`. Adding the supersede-lane mirror would break the literal scope.
2. The operator directive explicitly names the allowed diff surface: "Three-node surface inside `WF-ME-01`: `ME_Memory_Store_Embed`, `ME_Memory_Store_Embed_Merge`, `ME_Memory_Store_DB.parameters`." No supersede-lane node is named.
3. The supersede lane's row-writing node is behaviorally similar but not identical — it inherits predecessors' embedding via promote/supersede chains in some cases. Touching it requires its own design freeze (are we copying the predecessor's embedding, re-embedding from scratch, or both?). That design freeze belongs to a successor mission.
4. F6A's success criteria (13 items in `F6A_MISSION_BRIEF.md §Success criteria`) do not require the supersede-lane mirror. Semantic retrieval of store-path rows is the stated goal.

**Impact on F6A verdict.** None. F6A can close as SUCCESS with the supersede lane unchanged. Rows produced by `supersede_memory` will continue to land with `embedding = NULL` unless their predecessor had one, just as before F6A — and the semantic CTE will continue to skip them via the partial ivfflat's `WHERE embedding IS NOT NULL` predicate. This is the same baseline that existed pre-F6A; F6A does not regress it.

**Follow-up owner.** New mission id `F6E-SUPERSEDE-PATH-EMBEDDING-PRODUCER`, to be opened by the operator after F6A closes. It is not opened today.

**Tracked in.** Mission brief §Out of scope; handoff writeback at Phase 10 must add a pointer under `SESSION_HANDOFF_NEXT.md §G next candidates`.

Disposition: closed-as-excluded. No further action in F6A.

---

## Known deliberate exclusion — back-fill of existing NULL rows

### F6A-X-02 — Back-fill existing `memory_items.embedding IS NULL` rows

Raised: 2026-04-23
Phase: 1
Classification: DELIBERATE_EXCLUSION

**Context.** Every row in `memory_items` created between v2 rollout (pre-F2) and the F6A apply timestamp has `embedding IS NULL`. After F6A, newly stored rows will have embeddings; older rows will not. The semantic CTE's partial ivfflat index skips NULL-embedding rows, so older rows remain unreachable via semantic retrieval.

**Why excluded.**
1. Back-filling is a data-plane operation (read all rows, call OpenAI, UPDATE), not a workflow change. F6A is a workflow change.
2. Back-fill has non-trivial cost and ordering considerations that are not inside F6A's three-node surface.
3. Operator has not authorized back-fill.

**Impact on F6A verdict.** None. F6A's success criterion #9 is "at least one newly stored row found by semantic CTE post-patch that would have been unreachable pre-patch." It is stated in terms of newly stored rows, explicitly not historical rows.

**Follow-up owner.** Ops task; not a new frontier. To be scoped if/when the operator requests.

Disposition: closed-as-excluded.

---

## Known deliberate exclusion — ivfflat lists retraining

### F6A-X-03 — `ivfflat` index `lists` parameter retrain

Raised: 2026-04-23
Phase: 1
Classification: DELIBERATE_EXCLUSION

**Context.** The partial `ivfflat` cosine index on `memory_items.embedding` has a fixed `lists` parameter chosen at create-time (`migration.sql:224–228`). As the count of non-NULL embedding rows grows, the optimal `lists` value changes; an outdated `lists` degrades recall. F6A increases the rate at which non-NULL rows are inserted, so it accelerates the need for a retrain.

**Why excluded.**
1. Retrain is `DROP INDEX … ; CREATE INDEX …`, i.e., DDL. F6A is scoped to a workflow change.
2. The retrain threshold is a tuning decision; it has its own follow-up (candidate id `F6C-IVFFLAT-RETRAIN-POLICY`).
3. F6A does not immediately change the `lists`/row ratio enough to require action during this mission — E3 live cases in `F6A_TESTING_STRATEGY.md` insert a handful of rows, not a bulk.

**Impact on F6A verdict.** None.

**Follow-up owner.** Future mission `F6C-IVFFLAT-RETRAIN-POLICY`, not opened today.

Disposition: closed-as-excluded.

---

## Known deliberate exclusion — caller-supplied-embedding live proof

### F6A-X-04 — Live live-traffic proof of caller-supplied-embedding short-circuit

Raised: 2026-04-23
Phase: 2
Classification: DELIBERATE_EXCLUSION

**Context.** The Merge node in `F6A_DESIGN_FREEZE.md §Merge jsCode` short-circuits if the input already carries a pre-computed embedding (e.g., a caller-side cache). This branch is exercised in the local matrix (L1-case-5 and L4-case-3 per `F6A_TESTING_STRATEGY.md`) by injecting a hand-crafted payload. The live traffic path does not currently have a caller that supplies the embedding, so E-matrix cases that exercise this branch cannot be run against the live workflow.

**Why excluded.**
1. Same reason the F2 mission deferred live t3 (caller-supplied-embedding live proof): no live caller supplies embeddings today.
2. Inspection + local unit coverage is sufficient to prove correctness of the branch.

**Impact on F6A verdict.** None. Precedent set by F2 t3 deferral.

**Follow-up owner.** Whenever a caller begins supplying embeddings (e.g., a future batch-import tool), it becomes a smoke-test matrix item.

Disposition: closed-as-excluded.

---

## Known limitation — caller tier / user_confirmed / corroboration_count still hardcoded

### F6A-X-05 — Store-prep hardcoded input flags untouched

Raised: 2026-04-23
Phase: 1
Classification: KNOWN_LIMITATION (tracked in `V2-OBS-STORE-PREP-INPUT-PASSTHROUGH`)

**Context.** `ME_Memory_Store_Prep` currently hardcodes `tier`, `user_confirmed`, and `corroboration_count` inside its jsCode rather than reading them from the inbound payload. This has been open since V2-OBS.

**Why excluded.**
1. F6A does **not** modify `ME_Memory_Store_Prep` at all. The new Store_Embed node reads the text-to-embed from `$json.__db.content` — a field Store_Prep already emits in its existing output. Store_Prep's `passthrough` block is byte-identical pre and post F6A. Consequently F6A has no surface area through which it could change the tier / user_confirmed / corroboration_count flags.
2. Fixing those hardcoded flags is the job of the open follow-up `V2-OBS-STORE-PREP-INPUT-PASSTHROUGH`, not F6A.

**Impact on F6A verdict.** None. The hardcoded flags live on a different field set than `embedding` and do not affect embedding generation or the partial ivfflat index.

**Follow-up owner.** `V2-OBS-STORE-PREP-INPUT-PASSTHROUGH` (still open, unchanged by F6A).

Disposition: tracked, not addressed here.

---

## Schema note

The `memory_items.embedding` column is already declared `vector(1536)` nullable at `migration.sql:150`. The partial ivfflat cosine index is already in place at `migration.sql:224–228` with predicate `WHERE embedding IS NOT NULL AND status='active'`. F6A is therefore a pure workflow change — no DDL is required, no DB migration is run, no schema column is added. If at any phase it turns out a DDL is needed, that is an automatic halt trigger (out of scope).

---

## Operator-prompt escalation path

If a blocker arises (e.g., `verify_workflow` RED at Phase 6, or a real regression at Phase 8/9), the agent must:

1. Append a new `F6A-B-NN` entry here with classification `ACTIVE_BLOCKER`.
2. Update `F6A_STATE.json` status to `BLOCKED` and phase to the phase where the blocker was raised.
3. Write `F6A_FIX_LOG.md` with an incident record.
4. If Phase 6 post-apply verification failed, run Rollback Sub-phase 6.R (operator-owned) before proceeding further.
5. Hand control back to the operator with the blocker id in plain text.

The agent does **not** self-resolve ACTIVE_BLOCKER entries. The operator classifies them as either REAL_REGRESSION (→ close F6A as `F6A BLOCKED_WITH_EVIDENCE`) or TEST_RIG_ARTEFACT (→ amend and retry).
