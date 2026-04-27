# PROJECT_E2E_CORRIDOR_INVENTORY

Frozen: 2026-04-25.
Authority: subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md` + `docs/architecture/n8n_Workflow_Mapping.md` + `docs/architecture/Module_Registry_Ucenicul.md`.
Status: inventory-only. **No workflow mutation**; **no test harness created**; **no test fixture written**. This document prepares the base for the next mission `PROJECT-E2E-RICH-TEST-MATRIX`.

## Baseline

- Chain under test: `TR → EC → OR → PL → DI → ME → RA → SU → RC → MO`.
- `WF-ME-01` final versionId: `9d1da628-f9fd-44dc-8f62-fda571a7bc23` (49 nodes / 67 connections / `active=true`).
- `memory_module v2` FORMALLY CLOSED STABLE; `MEMORY_100_FOR_CURRENT_STAGE = TRUE` (V2-039).
- Memory is no longer on the critical path. E2E product corridors are.
- Each workflow has its own contract doc under `workflows/WF-XX-01_*/docs/WF-XX-01_CONTRACTS.md` + `..._DOWNSTREAM_HANDOFF.md`; this inventory does not rewrite them, only references what a corridor exercises.

## Terminology

- **Corridor** — a real user journey from inbound message through the full chain to user-facing output (and durable state writes).
- **Workflow** — one of the 10 canonical n8n workflows in the chain.
- **Boundary** — the input/output contract between two adjacent workflows.
- **Side-effect** — any durable DB write (threads / execution_contexts / memory_items / tasks / reminders / outbound_messages / audit logs).

---

# 1. Product corridor inventory

Twelve corridors identified. Each is **real**: a user can actually drive the system along that path today. No speculative future flows.

## C1 — Simple one-shot question (no memory)

- **User intent.** "Cât e 2+2?" / "Care e capitala Franței?" / any factual question that does not reference the user's own data.
- **Workflow path.** TR (new thread) → EC (new exec_context) → OR (classify) → PL (plan with response-only step or minimal module chain) → DI (no domain module needed, or `response_module` only) → RA (batch of 1) → SU (minimal execution_state update; no memory candidate, no domain event) → RC (compose final text) → MO (send).
- **Module/action.** None, or `response_module.compose_response` only.
- **State used.** New thread row; new execution_context row; nothing from memory.
- **Memory used.** None.
- **DB side-effects.** 1 threads row, 1 execution_contexts row, 1 outbound_messages row, minimal audit log. No memory_items write.
- **Expected user-facing behavior.** One coherent answer in the user's channel locale; no hallucinated context; no "I remember that …" opening.
- **Primary risk.** Response Composer leaking fabricated memory references; unnecessary memory writes ("zgomot").
- **Why test E2E.** Happy-path smoke that proves the chain runs end-to-end without invented state.

## C2 — Memory write (explicit fact / preference)

- **User intent.** "Ține minte că prefer întâlniri la ora 09:00." / "Remember that my business tax id is RO12345678."
- **Workflow path.** TR → EC → OR (intent = memory write) → PL (plan includes `memory_module.store_memory` step) → DI → ME.store → RA → SU (memory_candidate_persistence) → RC (confirmation) → MO.
- **Module/action.** `memory_module.store_memory`.
- **State used.** Thread + execution_context. Entity resolution if the message mentions a known entity.
- **Memory used.** Writes `memory_items` row (`embedding vector(1536)` via F6A); passes caller fields `tier` / `user_confirmed` / `corroboration_count` / `evidence_validated` through Store_Prep (V2-031 + V2-033).
- **DB side-effects.** 1 new `memory_items` row with embedding; subjective-guard (F5) rejects pejoratives; `domain_writes_performed=true` at module layer, normalised to `false` at RA envelope (V2-OBS-RA / V2-027).
- **Expected user-facing behavior.** Natural confirmation ("Notat. Voi reține că …"); not a raw dump; RC in the right locale.
- **Primary risk.** Writing noise that wasn't actually a fact; wrong `memory_type` / `category`; duplicate on retry.
- **Why test E2E.** The write lane is the most user-impactful side-effect producer; V2-037 fixed one of its UX artefacts (recall summary) but end-to-end composition is the product-quality gate.

## C3 — Memory recall (the user asks about themselves)

- **User intent.** "Ce știi despre preferințele mele de orar?" / "Îmi amintești CUI-ul meu?"
- **Workflow path.** TR → EC → OR → PL (plan includes `memory_module.recall_memory` or `search_memory`) → DI → ME.recall / ME.search → RA → SU (no memory write; execution_state only) → RC (compose answer from the returned results) → MO.
- **Module/action.** `memory_module.recall_memory` or `memory_module.search_memory`.
- **State used.** Thread + execution_context + the memory rows returned by recall/search.
- **Memory used.** Reads `memory_items`; semantic (F2 + F6A embeddings) or lexical (F2b hybrid CTE) path depending on query shape; filtered to tenant (mandatory).
- **DB side-effects.** **None** (recall + search are pure-read; V2-037 invariant SQL-NW-01/02 confirmed).
- **Expected user-facing behavior.** Answer composed strictly from returned rows; if zero rows, RC says so honestly (no hallucination); one-row recall says "1 row" not "1 rows" (V2-037).
- **Primary risk.** Hallucinated recall (RC invents content not in returned rows); wrong tenant read; `"1 rows"` cosmetic regression.
- **Why test E2E.** Recall is the most common read path and the most hallucination-prone composition step.

## C4 — Memory update / supersede (user corrects prior info)

- **User intent.** "Nu mai prefer 09:00, acum prefer 11:00." / "Corectez CUI-ul, e RO87654321."
- **Workflow path.** TR → EC → OR (intent = memory update) → PL (plan includes `memory_module.supersede_memory` targeting the existing row) → DI → ME.supersede → RA → SU (persist supersede) → RC (acknowledge change) → MO.
- **Module/action.** `memory_module.supersede_memory`.
- **State used.** Existing `memory_items` row under this tenant + the new replacement payload.
- **Memory used.** Old row flips `status='superseded'`; new row lands with `embedding vector(1536)` (F6A-FOLLOWUP) + `supersedes_memory_id` backlink.
- **DB side-effects.** 1 UPDATE (old row) + 1 INSERT (new row) per supersede; idempotent replay produces no duplicate (`ON CONFLICT DO NOTHING` + UNION ALL fallback).
- **Expected user-facing behavior.** Natural acknowledgement; optionally explains the change ("Am actualizat preferința de la 09:00 la 11:00.").
- **Primary risk.** Supersede targets the wrong row (disambiguation failure); new row lands without embedding (ineligible for semantic recall); subjective-guard on replacement bypassed when memory_type=observation.
- **Why test E2E.** The only lane that both writes and invalidates prior memory; correctness cannot be inferred from single-step smoke.

## C5 — Cerere fără memorie (no-memory corridor)

- **User intent.** "Bună, cum ești azi?" / "Mulțumesc!" / "Scuze, greșeala mea."
- **Workflow path.** TR → EC → OR (classifies as social / filler / acknowledgement) → PL (plan with only response_module, or even a no-op plan) → DI → RA → SU → RC → MO.
- **Module/action.** `response_module.compose_response` only.
- **State used.** Minimal; thread continuity may matter for tone.
- **Memory used.** None; the planner must explicitly decide "do not store".
- **DB side-effects.** Zero memory_items. Thread row + execution_context row + outbound_messages row.
- **Expected user-facing behavior.** Conversational reply matching tone; no "Notat." confirmation; no silent store.
- **Primary risk.** Accidentally storing small-talk as a memory ("zgomot de memorie"); writing "Andrei a zis mulțumesc" as a fact.
- **Why test E2E.** Memory write is an opt-in decision, not a default; this corridor stress-tests the "don't store" branch.

## C6 — Planning / composition (multi-step deliverable)

- **User intent.** "Planifică-mi ziua de mâine în jurul întâlnirii cu X." / "Compune un răspuns pentru clientul Y pe baza preferințelor lui."
- **Workflow path.** TR → EC → OR → PL (multi-step plan; may include `recall_memory` step feeding a `task_module` + `response_module` chain) → DI (resolves dependency order) → ME.recall → ME.task.create (possibly) → RA (multi-result) → SU (tasks_db writes, execution_state) → RC → MO.
- **Module/action.** `memory_module.recall_memory` + `task_module.create_task` + `response_module.compose_response` composed.
- **State used.** Thread + execution_context + recalled memory + entities.
- **Memory used.** Read only; may propose a new memory via `watcher_module_basic` (proposals → SU `memory_candidate_persistence` → deferred to next promote cycle).
- **DB side-effects.** 1+ tasks/reminders rows; possible 1 memory candidate proposal; outbound_messages.
- **Expected user-facing behavior.** Structured deliverable (plan / draft reply) composed by RC, not by the planner or the task module.
- **Primary risk.** Response Composer producing raw JSON instead of natural text; planner overreaching (creating N tasks when the user asked for one); dependency-order violation in DI.
- **Why test E2E.** Multi-step plans are where dispatcher dependency-order invariants and RC aggregation rules are load-bearing.

## C7 — Ambiguous / incomplete request

- **User intent.** "Fă chestia aia pentru mine." / "Trimite-i lui."
- **Workflow path.** TR → EC → OR → PL (planner detects insufficient inputs; emits clarification-request step or fail-safe plan) → DI → RA → SU → RC (asks a clarifying question) → MO.
- **Module/action.** `response_module.compose_response` with clarification; no domain module executes.
- **State used.** Thread; `execution_contexts.current_goal` may be left null.
- **Memory used.** None by default; planner MUST NOT invent entity from stale memory to fill the gap.
- **DB side-effects.** Thread row + execution_context row + outbound_messages. No memory_items write. No tasks.
- **Expected user-facing behavior.** A short clarifying question, not a guess; tone matches thread history.
- **Primary risk.** Planner fills the gap from stale memory or from another thread → false-confident action; RC composes a committal reply to an uncommitted plan.
- **Why test E2E.** Fail-safe behavior is the difference between a trustworthy assistant and a confabulator.

## C8 — Thread continuity (follow-up in existing thread)

- **User intent.** Message 1: "Am o întâlnire cu X la 10." → Message 2: "Mută-o la 11." (same thread, same channel, within TR windowing).
- **Workflow path.** TR (attaches to existing thread by reply-to or windowing) → EC (new execution_context on existing thread) → OR (uses thread history) → PL (plan references the prior meeting entity) → DI → ME (task update, possibly memory update) → RA → SU → RC → MO.
- **Module/action.** `task_module.update_task_status` / `task_module.update_task` (per `decisions/ADR-REMINDER-AS-TASK-LAYER.md`, reminder-like updates also route through `task_module` in the current stage), plus optional `memory_module.supersede_memory` if the preference was stored.
- **State used.** Prior thread's messages / execution_contexts / operational rows.
- **Memory used.** Optional; thread context is primary.
- **DB side-effects.** 1 UPDATE (task/reminder), maybe 1 memory supersede. No duplicate thread row; no new memory row unless explicitly warranted.
- **Expected user-facing behavior.** Response references the prior message ("Mutată de la 10 la 11"); does not re-ask for context the thread already contains.
- **Primary risk.** TR opens a new thread instead of attaching (thread mix-up); planner re-plans from scratch, forgetting the prior goal; RC omits the prior anchor.
- **Why test E2E.** Thread continuity is the single most perceptible UX signal for conversational quality.

## C9 — Cross-thread durable memory vs. session state

- **User intent.** Thread A: "Ține minte că Andrei preferă dimineața." (durable memory). Thread B (new thread): "Ce știi despre Andrei?" / or Thread B: "Continuă de unde am rămas."
- **Workflow path.**
  - *Case B1 (durable memory query):* TR (new thread, same tenant) → EC → OR → PL (recall_memory by entity) → DI → ME.recall → RA → SU → RC → MO.
  - *Case B2 (operational state resumption):* same chain, but OR/PL MUST detect that the operational state is not safely transferable and emit a clarification step.
- **Module/action.** `memory_module.recall_memory` (B1) or clarification via `response_module` (B2).
- **State used.** Durable `memory_items` rows under the tenant (can cross threads); thread-A execution_context must NOT be attached to thread B.
- **Memory used.** Read-only; durable memory crosses threads because it is tenant-scoped, but operational state (current plan, pending steps) does not.
- **DB side-effects.** None for B1 (read-only). None for B2 (clarification only).
- **Expected user-facing behavior.**
  - B1: "Andrei preferă dimineața." composed from the durable memory.
  - B2: "Despre ce plan anume? Nu văd contextul precedent pe acest fir." (clarification, not silent continuation).
- **Primary risk.** Silent cross-thread state transfer (user pattern shifts and plan re-use fires incorrectly); leaking memory owned by a different user within the same tenant; RC composing as if the previous plan is still active.
- **Why test E2E.** This is the single most subtle corridor — the distinction between durable memory (OK cross-thread) and operational state (NOT OK cross-thread without explicit opt-in) is what the product's trust model depends on.

## C10 — Tenant / user isolation

- **User intent.** Same semantic message from Tenant A user X and Tenant B user Y ("Ține minte că preferul dimineața."); plus cross-user within Tenant A ("Ce știi despre mine?" vs "Ce știi despre colegul meu?").
- **Workflow path.** Each tenant/user runs its own TR → EC → ... → MO chain under its own `tenant_id` + (where relevant) author entity.
- **Module/action.** Whatever the intent triggers; isolation is an infrastructure invariant, not a module feature.
- **State used.** Separate `threads`, `execution_contexts`, `memory_items` per tenant.
- **Memory used.** `memory_items` reads MUST be filtered by `tenant_id`; ivfflat index is global but query-level tenant filter is mandatory.
- **DB side-effects.** Per-tenant only; zero cross-tenant bleed.
- **Expected user-facing behavior.** Tenant A's user X never sees rows belonging to Tenant B; within Tenant A, entity scoping may further restrict what one user sees about another.
- **Primary risk.** Cross-tenant leak via missing WHERE clause or planner reading wrong tenant context; same-tenant cross-user leak via entity mis-resolution; memory ivfflat retrieval returning rows from a different tenant because of a forgotten tenant predicate.
- **Why test E2E.** Isolation is the one invariant where a single silent failure is catastrophic — can only be validated end-to-end with real tenant separation.

## C11 — Idempotency / retry (duplicate inbound / webhook replay)

- **User intent.** Network resends the same inbound webhook; user double-taps send; Telegram retries delivery; channel bridge replays a stale message.
- **Workflow path.** TR (detects idempotency key and attaches rather than creates); EC (idempotent insert: first-write-wins; ON CONFLICT DO NOTHING); OR/PL/DI/ME/RA/SU/RC/MO each must respect their own idempotency key (SU's replay-guard; MO's outbound `replay_guard_probe`).
- **Module/action.** Any. The module doesn't matter; the invariant is that replays produce no duplicate side-effect.
- **State used.** Thread + execution_context keyed on `idempotency_key` (TR/EC).
- **Memory used.** `memory_items.idempotency_key_ukey` unique index enforces "exactly one row per key" on store; supersede relies on UNION ALL fallback.
- **DB side-effects.** First delivery: full side-effect set. Replay: 0 new rows anywhere; at most "no-op" audit row. Outbound: MO's replay guard rejects duplicate send.
- **Expected user-facing behavior.** User receives exactly one response for one logical message, even if the transport sent it 3 times.
- **Primary risk.** Duplicate memory row; duplicate task; duplicate outbound message; MO sending the same reply twice; EC creating two execution_contexts for the same trigger.
- **Why test E2E.** Every workflow has its own idempotency story; the only way to prove the composition is idempotent is to replay the full chain.

## C12 — Large composition (realistic long message)

- **User intent.** A multi-paragraph message mixing a fact to remember ("preferă dimineața"), a task ("programează o întâlnire marți la 10"), a clarification ("dacă Andrei e liber, altfel miercuri"), a correction ("ignor ce ziceam ieri despre marți seara"), small talk ("sper că ești bine"), and a question ("ce știi despre Andrei?").
- **Workflow path.** Full chain with a multi-step plan: `recall_memory` (entity Andrei) + `store_memory` (preferință nouă) + `supersede_memory` (corecție) + `task_module.create_task` (întâlnire) + `response_module` (answer + confirmation). `watcher_module_basic` may emit proposals for further memories. SU writes across ≥3 classes. RC composes one coherent reply.
- **Module/action.** Memory (store+supersede+recall) + task + response + watcher, composed into one plan.
- **State used.** Everything: threads, execution_contexts, entities, memory_items, tasks.
- **Memory used.** Read + write + supersede + proposal — all four modes in one turn.
- **DB side-effects.** ≥5 DB rows touched: 1 new memory, 1 supersede pair, 1 task row, 1 execution_context, 1 outbound_messages + audit.
- **Expected user-facing behavior.** **One** coherent user-facing message that explicitly (or implicitly) confirms the fact, schedules the task, acknowledges the correction, answers the question, and handles the social fragment naturally.
- **Primary risk.** Planner over-decomposes (10 steps for what should be 5), or under-decomposes (one step for everything); RC drops components (user sees task but not memory confirmation); dispatcher violates dependency order (supersede fires before the recall that would have found the target); long-input degradation (OR / PL token budget exhaustion).
- **Why test E2E.** Real users write like this; this corridor is what "product quality" ultimately means.

---

# 2. Mandatory corridors — cross-reference to A–L

The pack names A–L as mandatory. Mapping to the 12 corridors above:

| Pack letter | Pack corridor | Inventory corridor |
|---|---|---|
| A | New message / simple request | C1 |
| B | Memory write | C2 |
| C | Memory recall | C3 |
| D | Memory update / supersede | C4 |
| E | No-memory | C5 |
| F | Planning / composition | C6 |
| G | Ambiguous request | C7 |
| H | Thread continuity | C8 |
| I | Cross-thread memory vs session state | C9 |
| J | Tenant / user isolation | C10 |
| K | Idempotency / retry | C11 |
| L | Large composition | C12 |

Every mandatory corridor is included.

---

# 3. Complexity ladder

Each of the 12 corridors will be exercised across 5 complexity levels in the next mission.

| Level | Shape | Example (applied to C2 memory write) |
|---|---|---|
| L1 | Single-clause sentence | "Ține minte 09:00." |
| L2 | 2–3 natural sentences | "Ține minte că prefer dimineața. De obicei 09:00." |
| L3 | Compound message with multiple details | "Andrei, colegul nostru, preferă întâlnirile dimineața, ideal 09:00–10:30, dar nu miercuri." |
| L4 | Long realistic message with multiple intents | Paragraph-length; ≥2 facts + 1 task + social filler. |
| L5 | Difficult — contradiction, uncertainty, thread reference, multi-entity, restrictions | "Ignor ce spuneam ieri, azi e 11:00, dar numai dacă X e liber; dacă nu, revenim la plan B — și ține minte că Y nu mai lucrează cu noi." |

Notes per level:

- **L1.** Smoke. One assertion per corridor. Proves the chain runs and the intent is correctly classified.
- **L2.** Still single-intent but with context. Tests TR windowing + OR classification stability.
- **L3.** Multi-detail single-intent. Tests entity extraction + `__db.category` derivation + embedding producer on a non-trivial string.
- **L4.** Multi-intent, natural prose. Tests planner decomposition + DI dependency order + RC aggregation.
- **L5.** Hard negative-space tests. Contradiction → clarification; thread reference → thread-continuity path; multi-entity → isolation under scrutiny; "ignor ce spuneam" → supersede trigger detection.

The next mission defines **which levels apply to which corridor** (not every corridor needs L5 meaningfully; e.g. C10 isolation is mostly L1–L3 replicated across tenants rather than L5 single-message).

---

# 4. Boundary expectations (per corridor × workflow)

The pack asks for per-corridor boundary notes. Rather than repeat every corridor × workflow cell, the table below lists the **expected boundary behavior per workflow**, then each corridor above cross-references which boundaries are load-bearing. This avoids a 120-row matrix in this inventory (which is not the test matrix itself — that is the next mission).

## Workflow boundary expectations (product contract, not implementation)

| WF | Input boundary | Expected behavior | Output boundary | DB/state side-effect |
|---|---|---|---|---|
| **TR** | Inbound message (webhook/chat) | Resolve to existing thread (attach), reopen closed thread, or create new. Idempotent: same `idempotency_key` attaches, never creates. Tenant-scoped. | `ThreadResolutionResult` with `thread_id` + attach/create/reopen decision + audit stamp. | 1 thread row (create) / 0 rows (attach) / 1 thread row status change (reopen). Append to `messages` per `MIGRATION_messages_for_WF-TR-01.sql`. |
| **EC** | TR result | Create or replay `execution_contexts` row keyed on `(tenant_id, trigger_message_id)`. Idempotent: replay returns the existing row. TTL set; status=initialized. | `ExecutionContextResult` → OR. | 1 `execution_contexts` row (first write) / 0 rows (idempotent replay). |
| **OR** | EC result | Classify inbound (intent; single-intent or multi-intent flag); verify tenant+thread+exec_ctx alignment; hand off to PL with consolidated context. | `orchestrator_input_handoff` → PL. | 0 writes; read-only across threads, entities, recent memory. |
| **PL** | OR handoff | Produce a canonical plan: `steps[]` with `step_id`, `module_name`, `inputs`, `depends_on`, `execution_mode`, `failure_policy`, `replan_if`. Flags: `dispatch_allowed=true`, `module_execution_started=false`, `response_generation_allowed=false`, `domain_writes_performed=false`. For no-op corridors, plan may contain only a `response_module` step. | `plan` envelope → DI. | 0 writes at plan time. (SU later writes plan digest into audit/state.) |
| **DI** | PL plan | Validate each step's `module_name` is in Module Registry; resolve `depends_on` dependency order; build per-step dispatch envelope; invoke ME sub-workflows in legal order. | `dispatch_result` per step → ME; fan-in to RA. | 0 writes at dispatcher layer. |
| **ME** | Dispatch envelope | Execute the named module (memory / task / reminder / improvement / watcher / response per registry). `WF-ME-01` internally routes to the correct action. Returns `module_result` with `summary`, `actions_executed`, `artifacts`, `observations`, `proposals`. | `module_result` → fan-in → RA. | Memory: write/read per action (F6A/F6A-FOLLOWUP embeddings; V2-031/V2-033 passthroughs). Task/Reminder: write to domain DB. Watcher: no write, proposals only. |
| **RA** | `module_batch` envelope | Validate batch integrity (all `expected_step_ids` present); compute rollup status (success / partial / error); normalise `aggregation_input.domain_writes_performed = false` unconditionally on success branch (V2-OBS / V2-027 invariant). | `aggregated_result` → SU. | 0 writes. |
| **SU** | Aggregated result | Apply durable writes across 5 classes: `execution_state_update`, `thread_state_update`, `memory_candidate_persistence`, `audit_persistence`, `domain_event_write`. Verify lineage + replay-guard. | `state_update_result` with `response_generation_allowed=true`, `allowed_next_stage=WF-RC-01` → RC. | Execution state, thread state, memory candidates (promotion proposals), audit rows, domain events. |
| **RC** | SU state-update envelope | Verify lineage against `execution_contexts` + `threads`; compose final user-facing text in channel locale (`ro` or `en`); emit `composed_response` with SHA256-derived idempotency key. No domain-module invocation. | `composed_response` → MO (if `dispatch_to_mo_01=true`). | 0 writes; audit only. |
| **MO** | RC composed response | Verify lineage; run replay-guard probe against `outbound_messages` (reject duplicates); dispatch via channel provider (Telegram concrete; WhatsApp/Web stubbed); log `outbound_messages`; return `delivery_result`. | `delivery_result` (terminal). | 1 `outbound_messages` row per successful send; 0 on replay. |

## Per-corridor load-bearing boundaries

For each corridor, list the boundaries that meaningfully gate correctness (not every corridor stresses every boundary):

- **C1 simple question.** TR (new thread correct), PL (plan minimal, no invented memory step), RC (no hallucinated memory reference), MO (single delivery).
- **C2 memory write.** OR (intent classified as write), PL (plan includes `store_memory`), ME (store lane + F5 subjective guard + F6A embedding producer + V2-031/V2-033 passthroughs), SU (memory_candidate_persistence writes correctly), RC (natural confirmation wording), MO.
- **C3 memory recall.** PL (plan includes recall/search), ME (recall lane pure-read; summary is `0 rows` / `1 row` / `N rows` per V2-037), RA (no false domain_writes_performed), RC (composes only from returned rows; zero hallucination).
- **C4 supersede.** PL (plan picks supersede not store), ME (supersede lane: old→superseded, new active with `supersedes_memory_id` backlink + 1536-d embedding per F6A-FOLLOWUP; F5 guard on replacement content when `memory_type=observation`).
- **C5 no-memory.** OR + PL (correctly classify as no-write), ME (not invoked for memory), SU (zero memory candidates), RC (conversational, no confirmation).
- **C6 planning.** PL (multi-step), DI (dependency order), ME (multiple module invocations, possibly parallel), RA (multi-module batch), RC (aggregates all module summaries into one response).
- **C7 ambiguous.** OR + PL (emit clarification plan; do NOT fill from stale memory); RC (single clarifying question, not a committal reply).
- **C8 thread continuity.** TR (attach not create), OR (uses thread history), PL (plan references prior goal), RC (reply mentions prior anchor).
- **C9 cross-thread.** TR (NEW thread, same tenant), PL/OR (durable memory recall yes; operational state resumption no without clarification).
- **C10 isolation.** Every workflow's WHERE tenant_id filter; memory recall semantic + lexical both tenant-scoped; no cross-tenant rows in any returned set.
- **C11 idempotency.** TR (idempotent thread resolve), EC (idempotent context), ME (idempotency_key on all writes; F6A-FOLLOWUP UNION ALL fallback), SU (replay-guard on state writes), MO (replay-guard on outbound).
- **C12 large.** Every boundary simultaneously; this is the integration sanity corridor.

---

# 5. Risk map

14 risks, each mapped to the corridor(s) that cover it, the test type needed in the next mission, and criticality.

| # | Risk | Covering corridors | Test type needed | Criticality |
|---|---|---|---|---|
| R1 | Thread mix-up (TR attaches wrong thread, or creates new when it should attach, or vice versa) | C1, C8, C9, C11 | Live TR smoke with controlled message inputs + idempotency replay + multi-message thread windowing | **High** |
| R2 | Cross-thread state leakage (operational state silently continued across threads) | C9 | Paired-thread live test: Thread A active plan, Thread B "continue"; expected clarification, not silent resume | **High** |
| R3 | Tenant leakage (memory / thread / task read across tenants) | C10 (+ every write corridor under 2 tenants) | Two-tenant live matrix: same input shape, different tenants; SQL invariants assert zero rows cross-visible | **High** |
| R4 | Memory over-write (supersede targets wrong row) | C4, C8 | Seed 2+ similar rows per entity; issue an ambiguous supersede; expect clarification OR correct target selection proven by `supersedes_memory_id` backlink | **High** |
| R5 | Memory write that shouldn't have happened (noise) | C1, C5, C7 | Negative oracle: after a no-memory message, `memory_items` row count in the tenant is unchanged | **Medium** |
| R6 | Hallucinated recall (RC invents content not in returned rows) | C3, C9 | Diff-surface oracle: RC output tokens must be traceable to returned `recall_results` entries (string-inclusion or semantic-align test) | **High** |
| R7 | Duplicate side effects on retry | C11 (+ all write corridors replayed) | Replay the full envelope 3×; SQL invariants: exactly 1 row per idempotency_key across `memory_items` / `tasks` / `reminders` / `outbound_messages` | **High** |
| R8 | Ambiguous reference silently resolved from stale memory | C7, C9 | Adversarial: prior-thread memory about "X"; new-thread ambiguous "cu el"; expect clarification, not silent fill | **High** |
| R9 | Planner overreach (creates more tasks / writes than the user asked for) | C6, C12 | Compare plan step count vs. user-intent oracle; assert `|steps|` within expected bounds per corridor | **Medium** |
| R10 | Response Composer drops information | C6, C12 | Oracle: each module_result summary must be represented (or explicitly suppressed with a reason) in RC final text | **Medium** |
| R11 | State persistence wrong class (write goes to wrong SU class) | C4, C12 | SU-layer assertions: memory candidate writes in `memory_candidate_persistence`, not `audit_persistence`; domain events only when domain module wrote | **Medium** |
| R12 | Output gateway duplicate send (MO replay) | C11 | Replay test: inbound with identical `idempotency_key` → exactly 1 outbound row + 1 user-facing message | **High** |
| R13 | Error handling / fallback (transient ME failure, timeout, embedding HTTP failure) | C2, C3, C6, C12 | Inject `embedding_failed` / `module_error` / timeout; expect graceful degradation (memory row with `embedding=NULL` per F6A CASE-guard; RC still composes a reply) | **Medium** |
| R14 | Long-input degradation (token budget, planner truncation, RC context loss) | C12 | L4/L5 messages at 500–3000 tokens; measure plan completeness + RC fidelity | **Medium** |

Criticality legend: **High** = would break product trust or isolation on first occurrence; **Medium** = would surface as quality complaint, not a safety breach.

---

# 6. Recommendation for next mission

## Mission name

`PROJECT-E2E-RICH-TEST-MATRIX`

## Proposed test count

Not 50, not 500, not 5000. A concrete, load-bearing target: **~240 live E2E cases** = **12 corridors × 5 complexity levels × average 4 variants/level**. Variants include: single-tenant baseline, two-tenant isolation pair, idempotent replay, and at least one negative-oracle variant per corridor where the shape admits it.

Split:

- **Phase 1 — foundation (70 cases):** all 12 corridors at L1 + L2; proves the chain end-to-end at simple and natural cardinality. Any failure here is a blocker.
- **Phase 2 — composition (80 cases):** all 12 corridors at L3 + L4; proves planner decomposition + RC aggregation + multi-module dispatch.
- **Phase 3 — hard cases (60 cases):** selected corridors at L5 (C4 supersede, C7 ambiguous, C9 cross-thread, C11 idempotency, C12 large); adversarial inputs with contradictions, thread references, multi-entity.
- **Phase 4 — isolation + retry matrix (30 cases):** C10 and C11 replicated across 2 tenants × 2 users with deliberate retries.

Exact counts will be refined in the next mission's design freeze. 240 is a planning figure, not a floor.

## Critical corridors (top 3 — start here)

In order:

1. **C11 — Idempotency / retry.** Without this green, every other corridor's side-effect oracle is uninterpretable. Run first.
2. **C10 — Tenant isolation.** The single most catastrophic failure mode; needs its own two-tenant harness and per-tenant SQL invariants. Run second.
3. **C9 — Cross-thread memory vs. session state.** The most subtle trust signal; breaks are silent. Run third.

C1 (simple question) and C2 (memory write) are obviously load-bearing but lower-risk — they go in Phase 1 as the chain happy-path.

## Input types / fixtures to prepare

- **Locale coverage.** RO and EN minimum per corridor where locale is meaningful; C2/C4 need the F5 subjective-guard RO+EN fixtures (pejorative triggers from SUBJECTIVE_RO/EN; neutral facts that must pass).
- **Length coverage.** L1 = 10–20 tokens; L4 = 200–500 tokens; L5 = 500–1500 tokens realistic prose.
- **Entity coverage.** Each corridor needs at least one case with a named entity and one anonymous case.
- **Temporal coverage.** Each corridor needs one same-day and one delayed-retry variant where idempotency matters.
- **Channel coverage.** Telegram-shape inbound at minimum; WhatsApp/Web envelope shape where distinct.
- **Pejorative stress fixtures.** RO and EN pejorative lists from the live Store_Prep jsCode (captured verbatim; no fabrication).
- **Negative fixtures.** Gibberish zero-match for recall; bogus UUIDs for promote/supersede; incomplete envelopes for error-path.

## Harness / artefacts to create

Create these in the next mission under `docs/architecture/e2e/harness/` (not this one):

- `e2e_matrix.json` — the frozen (12 × 5 × ~4) case matrix.
- `e2e_runner.mjs` — Node driver that builds envelopes, invokes `mcp__f2e8be41__execute_workflow` (or direct chat-trigger REST), pulls raw exec JSON via REST (model from V2-039 smoke).
- `e2e_oracle.mjs` — per-corridor oracle functions (shape checks, tenant-scope SQL, idempotency SQL, content-grounding check for C3).
- `e2e_sql_invariants.sql` — library of SQL probes for row counts, tenant isolation, idempotency, tier transitions, supersede backlinks.
- Per-corridor fixture folders: `fixtures/C01_simple/L{1..5}.json`, `fixtures/C02_memory_write/...`, etc.
- Results folder with raw exec JSON per case: `artifacts/runtime/`.
- Reconciliation per phase: `RECONCILIATION_PHASE_1.md`, etc.

## Explicit non-goals for the next mission

- No workflow mutation. Every E2E test runs against the current live `9d1da628-…` versionId (or later, if any intervening scoped mission lands — not this one).
- No new memory frontier. Memory module is certified.
- No schema change. All SQL is SELECT-only for oracles.
- No test-count padding. Natural cardinality per the `DOC_WRITEBACK_POLICY.md §6 Test-count rule`.

---

## Readiness marker

`READY_FOR_PROJECT_E2E_RICH_TEST_MATRIX = TRUE`
