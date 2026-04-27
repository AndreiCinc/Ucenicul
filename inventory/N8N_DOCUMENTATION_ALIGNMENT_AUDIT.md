# N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md — Ucenicul

> Strict read-only audit of alignment between the **n8n workflow state** (what is actually wired up on the n8n server) and the **repo documentation** (what `workflows/`, `docs/architecture/`, and related canonical docs describe).
>
> **Pass date:** 2026-04-19.
> **Authority note.** This audit is subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md` and is a read-only companion to `inventory/ABSOLUTE_CLOSEOUT_REPORT.md`. It does **not** modify n8n and does **not** modify any document in the repo.
> **Honesty statement.** Several authoritative documents (see Section I) were mount-locked (visible via `stat`, unreadable via `open`/`cat`/Read tool) in this session. Where a claim would depend on their content, this audit explicitly says so rather than fabricating.

---

## A. Executive summary

The repository's documentation layer and the live n8n server are **both healthy individually** but are **not aligned in detail**. The target architecture declared in the repo (thread-first, plan-first, modular: TR → EC → OR → PL → DI → ME → RA → SU → RC → MO) is very close to what is actually wired up in n8n (10 workflows matching that target are populated and active). The divergence is on three axes:

1. **Coverage gap in repo docs.** The repo has 8 `workflows/WF-*-01_<Name>/` folders. n8n has 10 target-architecture workflows plus 4 non-target workflows (legacy monolith, morning briefing, message receiver, deprecated stub). Two target workflows are not represented at all in `workflows/` (WF-RC-01 Response Composer, WF-MO-01 Message Out). The active legacy monolith `brain_main_inbound_mvp_v6_preprocessor_fixed` has **no dedicated folder or spec** in the repo, only a paragraph in `README.md`.
2. **Scaffold-vs-populated drift.** Every existing `workflows/WF-*-01_<Name>/` folder in the repo is in "scaffold" status per `workflows/README.md` (only a `README.md` stub; empty `workflow/`, `sql/`, `scripts/`, `tests/`, `docs/`, `reports/`, `assets/` subfolders). The matching n8n workflows are populated (10–76 nodes each) and active. This is an acknowledged gap (see `ABSOLUTE_CLOSEOUT_REPORT.md` Section 5 item 1), but the audit records it as current drift.
3. **One naming/role drift.** Repo folder `WF-SU-01_Sub_Workflow` vs n8n workflow `WF-SU-01 State / Persistence Updater`. Same code, different declared role.

Minor n8n-side issues: `WF-EC-01`'s n8n description (`"adauga timestamp"`) is misleading relative to its actual behavior (Execution Context init with idempotency upsert); the DEPRECATED stub is correctly named; `WF-01: Message Receiver` is inactive and not documented.

**Verdict.** Canonical baseline (as declared in `FINAL_CANONICAL_BASELINE.md` on 2026-04-19) holds: the repo is internally consistent. But the repo's scaffold state for workflows lags the n8n server by ~3 days of design work on n8n (2026-04-16 → 2026-04-18). When the repo's WF-* folders are populated, they should reflect the n8n state (or, where the n8n state contradicts the target architecture, the contradiction should be resolved by one side or the other — see Section H).

## B. Methodology (read-only, six FAZAs)

1. **FAZA 0 — Discover real n8n state.** Via `mcp__f2e8be41-.../search_workflows` plus per-workflow `mcp__n8n__get_workflow`. Fetched 14 workflows; parsed all into compact skeletons (saved at `/sessions/epic-wizardly-fermat/n8n_real_state_skeleton.md` as a scratch aid; not a repo artifact).
2. **FAZA 1 — Discover documented state.** Read every repo doc reachable in this session (see Section I for the list, and for the list of files that were mount-locked and therefore not inspected).
3. **FAZA 2 — Build mapping table.** Every n8n workflow mapped to its repo counterpart (folder / spec). See Section C.
4. **FAZA 3 — Per-workflow comparison.** Each mapping classified into one of: `FULL_ALIGN`, `PARTIAL_ALIGN`, `DRIFT_CONTENT`, `DRIFT_NAMING`, `DOC_ONLY`, `N8N_ONLY`, `NOT_INSPECTABLE`. See Section D.
5. **FAZA 4 — Recency analysis.** For each drift, declared `N8N_NEWER`, `DOCS_NEWER`, `BOTH_STALE`, or `INCONCLUSIVE` based on n8n `updatedAt` vs repo `stat` mtime. See Section G.
6. **FAZA 5 — Write audit.** This file. No other file written by this FAZA.

Strict rules observed:

- **No modifications** to any n8n workflow.
- **No modifications** to any repo file (except creating this audit and the scratch scaffold files under `/sessions/epic-wizardly-fermat/` which live outside the repo workspace).
- **Historical skill docs** were not used as evidence. The old `.claude/pipelines/ucenicul-pipeline/` content was not consulted as authority; it was noted only to explain why WF-* folders exist at all.
- **"Aligned"** was never called on a name-only match with divergent content.
- **Monolith-vs-modular** drift is called out explicitly (see Sections D.1 and E).

## C. Mapping table — n8n ↔ repo

Columns: n8n name / n8n id / n8n active / n8n updatedAt / nodeCount / repo folder / repo doc(s) / mapping classification.

| # | n8n name | n8n id | act | updatedAt | nodes | repo folder | classification |
|---|---|---|---|---|---|---|---|
| 1 | brain_main_inbound_mvp_v6_preprocessor_fixed | DO0uAOBZOVHVumOW | yes | 2026-04-14T17:40:14Z | 76 | (none — only a paragraph in `README.md` §"Current Implementation Status") | **N8N_ONLY (monolith-vs-modular)** |
| 2 | WF-00 Morning Briefing | cD8aHWo34XWEixcy | yes | 2026-04-16 | 13 | (none — no folder, no spec) | **N8N_ONLY** |
| 3 | WF-01: Message Receiver | 0SsP6OLY4LbOPmzG | **no** | 2026-04-18 | 13 | (none) | **N8N_ONLY (inactive)** |
| 4 | WF-TR-01 Thread Resolver | wI8hpSROxQI0zC9f | yes | 2026-04-18T12:20:40Z | 20 | `workflows/WF-TR-01_Thread_Resolver/` (scaffold) | **PARTIAL_ALIGN (scaffold-vs-populated)** |
| 5 | WF-EC-01 | v9jih4jqeXpOJOiH | yes | 2026-04-18T21:08:18Z | 10 | `workflows/WF-EC-01_Execution_Context/` (scaffold) | **PARTIAL_ALIGN (scaffold-vs-populated; n8n description misleading)** |
| 6 | WF-OR-01 | KhGmNpi0ZDmrnz8W | yes | 2026-04-18 | 10 | `workflows/WF-OR-01_Orchestrator/` (scaffold) | **PARTIAL_ALIGN (scaffold-vs-populated)** |
| 7 | WF-PL-01 | RwToPLa1ErHl2tUi | yes | 2026-04-18 | 13 | `workflows/WF-PL-01_Plan_Generation/` (scaffold) | **PARTIAL_ALIGN (scaffold-vs-populated)** |
| 8 | WF-DI-01 | abqYINcXr3JAhGGk | yes | 2026-04-18 | 13 | `workflows/WF-DI-01_Dispatcher/` (scaffold) | **PARTIAL_ALIGN (scaffold-vs-populated)** |
| 9 | WF-ME-01 Module Execution | uq26nh1grIpnHju0 | yes | 2026-04-18T12:20:34Z | 18 | `workflows/WF-ME-01_Module_Execution/` (scaffold) | **PARTIAL_ALIGN (scaffold-vs-populated; only `task` module branch populated in n8n)** |
| 10 | WF-RA-01 Result Aggregator | 5RcNLtxNjAHJsZPE | yes | 2026-04-18 | 14 | `workflows/WF-RA-01_Result_Aggregator/` (scaffold) | **PARTIAL_ALIGN (scaffold-vs-populated)** |
| 11 | WF-SU-01 State / Persistence Updater | ENiYNfL3ul8AmmCB | yes | 2026-04-18T12:44:00Z | 17 | `workflows/WF-SU-01_Sub_Workflow/` (scaffold) | **DRIFT_NAMING + PARTIAL_ALIGN** — repo name "Sub_Workflow" does not reflect n8n role "State / Persistence Updater". |
| 12 | WF-RC-01 Response Composer | TClXgmO8H8zsSwMb | yes | 2026-04-18 | 16 | (none) | **N8N_ONLY** — missing repo folder. |
| 13 | WF-MO-01 Message Out / Output Gateway | OooZdC0DgsDR6gm0 | yes | 2026-04-18T11:20:33Z | 18 | (none) | **N8N_ONLY** — missing repo folder. |
| 14 | DEPRECATED__WF-MO-01_langchain_stub | rooFWDryqC0YDyVa | **no** | 2026-04-18 | 4 | (none; flagged DEPRECATED in n8n name) | **N8N_ONLY (explicitly deprecated)** — no action required. |

Repo-side entries not present in n8n: none identified. Every `workflows/WF-*-01_<Name>/` folder has a real n8n counterpart. The `_ARCHIVED_Executor_Closer_stub/` folder is already explicitly labeled non-workflow (`OBSOLETE`) and is not expected to have an n8n counterpart.

## D. Per-workflow verdict cards

Each card: header / alignment verdict / recency verdict / what docs say / what n8n has / key mismatches / limitations.

### D.1 brain_main_inbound_mvp_v6_preprocessor_fixed (legacy monolith)

- **Alignment:** N8N_ONLY / monolith-vs-modular drift.
- **Recency:** n8n `updatedAt` 2026-04-14 (oldest among active workflows); `README.md` acknowledges the monolith but gives no folder or spec. **N8N_NEWER** on content; docs are a mere orientation paragraph.
- **What docs say.** `README.md` §"Current Implementation Status" states "The current implementation is a transitional monolith ... receives messages via Telegram webhook, classifies a single intent per message, routes to one branch per intent via switch node, executes domain logic inline in branches, composes partial responses per branch. This is NOT the target architecture."
- **What n8n has.** A 76-node workflow that matches the monolith description: Telegram Trigger → Normalize → Privacy Gate → Resolve Organization → Load Context → Build Brain Input → Brain LLM Decision → Parse Brain Contract → Insert Inbound Message → Route by Intent (switch) → branches for Create/Update/Delete Task, Create/Update/Delete Reminder, Search Memory, Save Improvement, General Response, Clarify → Privacy Gate Outbound → Insert Outbound → Final Output. 34 code nodes, 14 Postgres, 2 switches.
- **Mismatches.** (a) No dedicated folder for the monolith; (b) No spec of which intents the monolith currently handles; (c) README paragraph describes it at a level that would not let an engineer reconstruct the wiring; (d) There is no stated deprecation plan inside the repo's monolith orientation that ties to the modular WF-* workflows being activated (the Migration Plan presumably covers this but was mount-locked, see Section I).
- **Limitations.** `docs/migration/Migration_Plan_Ucenicul.md` was not inspectable in this session. If it contains a cutover plan from monolith to modular, the `N8N_ONLY` verdict is correct on coverage but the severity might be lower than it appears.

### D.2 WF-00 Morning Briefing

- **Alignment:** N8N_ONLY.
- **Recency:** n8n `updatedAt` 2026-04-16. Docs silent.
- **What docs say.** Nothing. No repo folder, no cron/schedule documentation found.
- **What n8n has.** Cron trigger `0 4 * * *` → Postgres queries (tasks, reminders, memories for active org) → OpenAI LLM generation → Telegram send → log outbound. 13 nodes.
- **Mismatches.** Entire workflow is undocumented.
- **Limitations.** None — the audit is confident this workflow has no repo representation.

### D.3 WF-01: Message Receiver (INACTIVE)

- **Alignment:** N8N_ONLY (inactive).
- **Recency:** n8n `updatedAt` 2026-04-18. Docs silent.
- **What docs say.** Nothing.
- **What n8n has.** Telegram Trigger → Extract → if `/start` → WF-02 Onboarding OR Get Organization → Command Router switch (`/start`, `/airbnb`, `/curatenie`, `/spatii`) → Switch Active Tenant → Build Context → Call Brain (WF-03). 13 nodes. **Inactive.**
- **Mismatches.** Inactive workflow not documented; references WF-02, WF-03 that are not present in the server listing. Could be remnants of an earlier message-pipeline design.
- **Limitations.** Cannot determine from this audit whether WF-01 is intended to become part of the target architecture or whether it's a dead branch.

### D.4 WF-TR-01 Thread Resolver

- **Alignment:** PARTIAL_ALIGN (scaffold-vs-populated).
- **Recency:** n8n `updatedAt` 2026-04-18T12:20:40Z; repo folder scaffolded 2026-04-19 12:13 (today). **N8N_NEWER in content** (repo folder is newer as a date but is empty).
- **What docs say.** `workflows/README.md` lists WF-TR-01 as "Thread Resolver", skeleton `standard`, populated `scaffold`. The authoritative content presumably lives in `docs/architecture/Thread_Resolution_Spec.md` (mount-locked, not inspected).
- **What n8n has.** 20 nodes. TR_Trigger (manual) + Telegram Trigger → Validate Input → Route Valid → Select Content Class → Check Explicit Refs → Shortcircuit switch → Load Reply Context / Load Candidate Threads / Load Entity Hints → Score Candidates → Apply Decision Policy → Build Result / Error → Write Audit → Return. 10 code, 5 Postgres, 3 switches, 1 telegramTrigger, 1 manual.
- **Mismatches.** Repo `workflow/`, `docs/`, `sql/`, `scripts/`, `tests/`, `reports/` subfolders for WF-TR-01 are empty; no blueprint JSON, no node map, no contract doc captured from the n8n state.
- **Limitations.** `Thread_Resolution_Spec.md` content was not inspectable this session. If it fully describes the algorithm that n8n implements, the coverage gap is presentation-only (the algorithm is documented but the workflow blueprint is not).

### D.5 WF-EC-01 Execution Context

- **Alignment:** PARTIAL_ALIGN + n8n description is misleading.
- **Recency:** n8n `updatedAt` 2026-04-18T21:08:18Z (most recently edited of all workflows); repo folder scaffolded 2026-04-19. **N8N_NEWER on content.**
- **What docs say.** `workflows/README.md` lists WF-EC-01 as "Execution Context", scaffold status.
- **What n8n has.** 10 nodes. EC_Input (executeWorkflowTrigger) + manual + disabled chat → EC_Validate_Input (UUID validation + idempotency_key derivation) → EC_Route_Valid → EC_Build_Init_Payload (`status=initialized`, `pending_steps=[]`, `completed_steps=[]`, `expires_at=now+15min`) → EC_Upsert_Context (`INSERT INTO execution_contexts ... ON CONFLICT (idempotency_key) DO NOTHING`) → EC_Load_Existing_Context → EC_Return_Result / EC_Return_Error. The workflow is a clean Execution Context init with idempotency guard.
- **Mismatches.** (a) n8n workflow **meta description** reads `"Workflow pornit de Manual Trigger sau Chat Trigger care trimit datele spre un nod Code JavaScript ce adauga un timestamp pe fiecare item."` — that description is **stale / misleading** (it describes an earlier probe, not the current EC init). The workflow's actual behavior is correct; the description is the problem. (b) Repo folder scaffold carries no content.
- **Limitations.** None on the n8n side; the scaffold-emptiness is acknowledged.

### D.6 WF-OR-01 Orchestrator

- **Alignment:** PARTIAL_ALIGN (scaffold-vs-populated).
- **Recency:** n8n `updatedAt` 2026-04-18; repo scaffolded 2026-04-19. **N8N_NEWER on content.**
- **What docs say.** `workflows/README.md` calls it "Orchestrator / Planner", scaffold. Any deeper content would live in `docs/architecture/` (mount-locked).
- **What n8n has.** 10 nodes. Manual + Chat triggers → OR_Validate_EC_Result (accepts wrapped OR flat EC shape) → OR_Route_Valid → OR_Extract_Handoff_Input → OR_Load_Execution_Context (Postgres) → OR_Verify_Context_Match → OR_Build_Handoff_Payload → OR_Return_Result / OR_Return_Error. Emits `allowed_next_stage='WF-PL-01'`, `planning_mode='plan_only'`.
- **Mismatches.** Repo table calls it "Orchestrator / Planner" — n8n only does orchestration handoff to WF-PL-01; plan generation is a separate workflow (WF-PL-01). The "/ Planner" suffix in the repo role label is misleading. Minor.
- **Limitations.** Authoritative role description (Architecture Spec) not inspectable.

### D.7 WF-PL-01 Plan Generation

- **Alignment:** PARTIAL_ALIGN (scaffold-vs-populated).
- **Recency:** n8n `updatedAt` 2026-04-18; repo scaffolded 2026-04-19. **N8N_NEWER on content.**
- **What docs say.** `workflows/README.md` lists "Plan Generation", scaffold.
- **What n8n has.** 13 nodes. Validate OR handoff → Extract planning input → Load execution context → Verify → Load `module_registry` (5 modules: `task`, `reminder`, `memory`, `improvement`, `watcher_basic`) → Build planner input → Generate plan with steps → Return. Emits `allowed_next_stage='WF-DI-01'`.
- **Mismatches.** Key observation: the n8n planner loads a `module_registry` DB table with **5 modules** (`task`, `reminder`, `memory`, `improvement`, `watcher_basic`). `docs/architecture/Module_Registry_Ucenicul.md` and `docs/architecture/Module_Spec_*.md` are the repo's module registry, and per file listing the repo only has `Module_Spec_Task.md`, `Module_Spec_Reminder.md`, `Module_Spec_Memory.md`, `Module_Spec_Response.md`, `Module_Spec_Watcher.md` — so `Module_Spec_Response` is present in docs but not in the n8n registry, and `Module_Spec_Improvement` is **missing** from the doc set despite being in the n8n registry. This is a **drift** between the doc module set and the n8n module registry.
- **Limitations.** Registry doc content not inspectable; the mismatch is structural/name-only evidence, not content-level.

### D.8 WF-DI-01 Dispatcher

- **Alignment:** PARTIAL_ALIGN (scaffold-vs-populated).
- **Recency:** n8n `updatedAt` 2026-04-18; repo scaffolded 2026-04-19. **N8N_NEWER on content.**
- **What docs say.** `workflows/README.md` "Dispatcher", scaffold.
- **What n8n has.** 13 nodes. Validate plan → Verify context → Load module registry → Build ready steps (parallel / sequential groups) → Build dispatch payload. Emits `allowed_next_stage='WF-ME-01'`.
- **Mismatches.** None beyond scaffold-emptiness.
- **Limitations.** None additional.

### D.9 WF-ME-01 Module Execution

- **Alignment:** PARTIAL_ALIGN (scaffold-vs-populated; **only `task` module branch implemented in n8n**).
- **Recency:** n8n `updatedAt` 2026-04-18T12:20:34Z; repo scaffolded 2026-04-19. **N8N_NEWER on content.**
- **What docs say.** `workflows/README.md` "Module Execution", scaffold. The 5 module specs (`task`, `reminder`, `memory`, `response`, `watcher`) presumably describe the contract each module should satisfy when executed.
- **What n8n has.** 18 nodes. ME_Input + Manual + Chat triggers → Validate Dispatcher Result → Route Valid → Load Execution Context → Check Context Match → Route Context OK → Load Task Candidates → **Route Module Name (switch)** → **Route Task Action (switch)** → Task Create / List / Update / Complete / Delete Result → Return Result / Error. **Only the `task` module branch is populated; the other module branches from the dispatcher (reminder, memory, improvement, watcher_basic) are not wired.**
- **Mismatches.** (a) Scaffold-vs-populated on the task branch. (b) Content-level drift: the repo lists 5 module specs but only 1 is implemented in n8n. This may be intentional (implementation-in-progress) but is not documented as such in the workflows/README or the PROJECT_MASTER.md status column.
- **Limitations.** Module Spec docs not inspectable to confirm whether "implementation completeness per module" is tracked there.

### D.10 WF-RA-01 Result Aggregator

- **Alignment:** PARTIAL_ALIGN (scaffold-vs-populated).
- **Recency:** n8n `updatedAt` 2026-04-18; repo scaffolded 2026-04-19. **N8N_NEWER on content.**
- **What docs say.** `workflows/README.md` "Result Aggregator", scaffold.
- **What n8n has.** 14 nodes. RA_Input (executeWorkflowTrigger) → Validate module_batch → Route → Load EC → Verify context → Build input → Aggregate (rollup success / partial / failed / no_action) → Build downstream envelope → Return. Emits `allowed_next_stage='WF-SU-01'`.
- **Mismatches.** None beyond scaffold-emptiness.
- **Limitations.** None additional.

### D.11 WF-SU-01 State / Persistence Updater  (naming drift)

- **Alignment:** DRIFT_NAMING + PARTIAL_ALIGN.
- **Recency:** n8n `updatedAt` 2026-04-18T12:44:00Z; repo scaffolded 2026-04-19. **N8N_NEWER on content**; **DOCS_NEWER on folder mtime only** (the scaffold was created 2026-04-19, after the last n8n edit) — but that is a naming / placeholder update, not substantive role alignment.
- **What docs say.** `workflows/README.md` lists WF-SU-01 as "Sub-workflow" (generic). The repo folder path is `workflows/WF-SU-01_Sub_Workflow/`.
- **What n8n has.** Workflow name `WF-SU-01 State / Persistence Updater`. 17 nodes. SU_Input + manual → Validate Aggregated Input → Route Valid → Load EC / Aggregated Result Context / Write Permissions → Verify Lineage & Replay → Route Context Ready → Build State Update Plan → Apply Execution State Update / Operational Writes / Persist Memory Candidates → Build Downstream Envelope → Return Result / Error / Context Error. Write classes explicitly named in nodes: `execution_state_update`, `thread_state_update`, `memory_candidate_persistence`, `audit_persistence`, `domain_event_write`.
- **Mismatches.** (a) **Naming/role drift.** "Sub-workflow" is a generic placeholder; n8n has a specific, substantive role: state/persistence update with ~5 write classes. Renaming the repo folder to `WF-SU-01_State_Persistence_Updater/` would eliminate this drift without touching any other code. (b) Scaffold-vs-populated.
- **Limitations.** None additional.

### D.12 WF-RC-01 Response Composer  (missing in repo docs)

- **Alignment:** N8N_ONLY.
- **Recency:** n8n `updatedAt` 2026-04-18. Repo: no folder, no spec of this WF code.
- **What docs say.** `README.md` target-architecture diagram names "Response Composer" as one of the target stages: `Message In -> Thread Resolver -> Execution Context -> Orchestrator Planner -> Dispatcher -> Modules -> Result Aggregator -> Response Composer -> Message Out`. The module registry lists `Module_Spec_Response.md` (mount-locked, not inspected). But there is **no `workflows/WF-RC-01_Response_Composer/` folder** at the same level as the other WF-*/ folders. `workflows/README.md` does not include WF-RC-01 in its "Active workflow folders" table.
- **What n8n has.** 16 nodes. Validate `state_update_input` → Route → Load EC + Thread Context → Verify lineage → Build composition input → Compose response (Romanian/English locale with labels) → Build output envelope (SHA256 digest) → Return. Has **disabled MO-01 handoff nodes**. Emits `allowed_next_stage='MESSAGE_OUT'`.
- **Mismatches.** Major coverage gap: a target-architecture workflow that exists in n8n is entirely absent from the `workflows/` folder set. The `Module_Spec_Response.md` spec may cover the "what" but the workflow-level artifact skeleton is missing.
- **Limitations.** Cannot compare against spec content (not inspectable).

### D.13 WF-MO-01 Message Out / Output Gateway  (missing in repo docs)

- **Alignment:** N8N_ONLY.
- **Recency:** n8n `updatedAt` 2026-04-18T11:20:33Z. Repo: no folder, no spec.
- **What docs say.** `README.md` target-architecture diagram names "Message Out" as the final target stage. No workflow folder at `workflows/WF-MO-01_Message_Out/`. Not in `workflows/README.md` table.
- **What n8n has.** 18 nodes. MO_Input + Manual Trigger → Validate Composed Response → Route Valid → Load EC / Thread / Channel Delivery Context → Replay Guard Probe → Verify Lineage & Replay → Route Context Ready → Build Delivery Request → Route Channel (switch) → `MO_Send_Channel_PLACEHOLDER` (Telegram) → Log Outbound Message → Build Delivery Result → Return Result / Error / Context Error.
- **Mismatches.** Same as D.12 — major coverage gap. Note in particular that the n8n workflow uses a `PLACEHOLDER` Telegram sender, indicating the channel-abstraction work is mid-flight on the n8n side; this is not surfaced anywhere in the repo.
- **Limitations.** None additional.

### D.14 DEPRECATED__WF-MO-01_langchain_stub

- **Alignment:** N8N_ONLY (explicitly deprecated by n8n name).
- **Recency:** n8n `updatedAt` 2026-04-18. Inactive. No repo presence.
- **What docs say.** Nothing, which is consistent with it being an already-deprecated stub.
- **What n8n has.** 4 nodes: Manual + Chat triggers → AI Agent (langchain) + OpenAI `gpt-5-mini`. Inactive.
- **Mismatches.** None actionable — the `DEPRECATED__` prefix is the correct way to flag this at the n8n layer, analogous to the `_ARCHIVED_Executor_Closer_stub` label in the repo.
- **Limitations.** None.

### D.15 Repo-only entity — `_ARCHIVED_Executor_Closer_stub/`

- **Alignment:** DOC_ONLY, intentional. Not a workflow.
- **Recency:** Renamed and documented 2026-04-19 closeout pass.
- **What docs say.** `workflows/_ARCHIVED_Executor_Closer_stub/README.md` (inspected) explicitly labels it obsolete and points to `WF-EC-01_Execution_Context/` as the canonical successor. Excluded from the `workflows/README.md` index.
- **What n8n has.** Nothing with a similar name. No alignment needed.
- **Mismatches.** None — this is a controlled vestige of a prior naming mismatch.

## E. Drift catalog (all categories in one place)

| # | Category | Items | Severity |
|---|---|---|---|
| 1 | **Monolith-vs-modular** | `brain_main_inbound_mvp_v6_preprocessor_fixed` (76 nodes, active, legacy intent-first) coexists with the 10 modular WF-*-01 target-architecture workflows. No repo spec describes the cutover plan visibly, though `docs/migration/Migration_Plan_Ucenicul.md` (mount-locked) is the expected home of that plan. | **HIGH** (content, architectural) |
| 2 | **N8N_ONLY for target stages** | `WF-RC-01 Response Composer`, `WF-MO-01 Message Out / Output Gateway` — both target stages per the README diagram but neither has a `workflows/WF-*-01_<Name>/` folder. | **HIGH** (coverage) |
| 3 | **N8N_ONLY for non-target workflows** | `WF-00 Morning Briefing` (active, scheduled), `WF-01 Message Receiver` (inactive), `DEPRECATED__WF-MO-01_langchain_stub` (inactive, correctly named). | **MEDIUM** (WF-00 is active and undocumented); **LOW** for the inactives. |
| 4 | **DRIFT_NAMING** | `WF-SU-01_Sub_Workflow/` (repo) vs `WF-SU-01 State / Persistence Updater` (n8n). Same code, different declared role. | **MEDIUM** (confusing, trivial to fix). |
| 5 | **Scaffold-vs-populated** | All 8 existing repo `WF-*-01_<Name>/` folders are scaffold; their n8n counterparts are populated (10–20 nodes each). | **MEDIUM-HIGH** (cumulative coverage drift; acknowledged at baseline as post-baseline work). |
| 6 | **Module registry drift** | n8n `module_registry` contains 5 modules: `task`, `reminder`, `memory`, `improvement`, `watcher_basic`. Repo has `Module_Spec_Task.md`, `Module_Spec_Reminder.md`, `Module_Spec_Memory.md`, `Module_Spec_Response.md`, `Module_Spec_Watcher.md`. Differences: **`improvement`** is in n8n but has no `Module_Spec_Improvement.md`; **`response`** has a spec but is not in the n8n module registry (it is its own workflow WF-RC-01 at the stage level). | **MEDIUM** (module contract coverage). |
| 7 | **Module execution completeness** | `WF-ME-01` in n8n only implements the `task` module branch (`create/list/update/complete/delete`). Branches for reminder/memory/improvement/watcher_basic are not wired despite being in the planner's registry. | **MEDIUM** (implementation-in-progress, undocumented as such). |
| 8 | **Misleading n8n meta.description** | `WF-EC-01` description (`"adauga timestamp"`) does not match its actual behavior (Execution Context init + idempotency upsert). | **LOW** (cosmetic; read-only audit does not fix). |
| 9 | **Disabled handoff nodes** | `WF-RC-01` has disabled MO-01 handoff nodes. This signals the RC→MO transition is not live yet (the composer emits `MESSAGE_OUT` intent but does not invoke `WF-MO-01`). Not mentioned anywhere in the repo. | **MEDIUM** (runtime-wiring note, content-level). |
| 10 | **`PLACEHOLDER` Telegram node** | `WF-MO-01` node named `MO_Send_Channel_PLACEHOLDER` — channel abstraction is not finalized. Not mentioned anywhere in the repo. | **LOW-MEDIUM** (known-incomplete, undocumented). |

## F. Scores

All scores are out of 10. Rationale follows each.

| Dimension | Score | Rationale |
|---|---|---|
| **Alignment** (docs vs n8n at the content level, for the parts of the system both claim to cover) | **4 / 10** | The target architecture is coherently described in the repo and is clearly the aim of the n8n modular workflows. However, on every workflow where both sides exist (the 8 WF-*-01 scaffolds in the repo), the repo carries no blueprint / node map / contract doc; the only substance is in n8n. The name mismatch on WF-SU-01 and the module-registry mismatch on `improvement` vs `response` bring this further down. One naming-vs-content coincidence (WF-OR-01 "Orchestrator / Planner" vs n8n "Orchestrator handoff only") is also counted. |
| **Coverage** (percentage of n8n workflows that have a corresponding repo folder + spec) | **5 / 10** | 8 of 10 target-architecture workflows have a repo folder (WF-RC-01 and WF-MO-01 are missing). 0 of 4 non-target workflows are documented (brain_main monolith, WF-00 Morning Briefing, WF-01 Message Receiver, DEPRECATED stub). Weighted for severity (monolith is active and important; DEPRECATED stub is fine to omit), coverage lands at 5/10. |
| **Recency** (who is newer on the documentation↔reality boundary) | **3 / 10** | Across essentially all comparisons, the n8n state is newer than the repo doc content: the architecture specs were last modified 2026-04-15, the modular n8n workflows were last modified 2026-04-18 (a 3-day gap during which significant wiring happened on n8n), and the repo's workflow folders were scaffolded only today (2026-04-19) but carry no substantive content. The repo caught up on structure but not on content. The one case where the repo is "newer" is the scaffold-timestamps (2026-04-19), but that is a naming/placeholder update, not content. Net: docs lag n8n on content. |

> **Honesty note on scoring.** Four canonical docs (`Architecture_Spec_v3_Ucenicul.md`, `n8n_Workflow_Mapping.md`, `Module_Registry_Ucenicul.md`, `Migration_Plan_Ucenicul.md`) were mount-locked and not inspected this session. If those docs already contain the workflow-level detail that the `workflows/WF-*-01_*/` scaffold folders are missing, then Alignment could rise to ~6/10 and Coverage to ~7/10. But this audit does not make that assumption and does not adjust scores on the hope of it.

## G. Recency verdict per workflow

Legend: `N8N_NEWER` (n8n was edited more recently and / or has substantively more content than the doc for this workflow); `DOCS_NEWER` (the doc side was edited more recently than n8n); `BOTH_STALE` (neither side has been touched in the freshness window); `INCONCLUSIVE` (cannot compare — one side has no artifact, or content is not inspectable).

| Workflow | n8n updatedAt | Repo mtime | Verdict |
|---|---|---|---|
| brain_main (monolith) | 2026-04-14 | README.md orient-paragraph (no folder) | **N8N_NEWER** on content; docs are a sentence. |
| WF-00 Morning Briefing | 2026-04-16 | (no repo artifact) | **INCONCLUSIVE** (no repo side); effectively N8N_ONLY. |
| WF-01 Message Receiver | 2026-04-18 | (no repo artifact) | **INCONCLUSIVE**; N8N_ONLY. |
| WF-TR-01 Thread Resolver | 2026-04-18 | scaffold 2026-04-19 | Folder scaffold is newer by date, but **N8N_NEWER** on substance. |
| WF-EC-01 | 2026-04-18 (most recent of all) | scaffold 2026-04-19 | Folder scaffold newer by date, **N8N_NEWER** on substance. |
| WF-OR-01 | 2026-04-18 | scaffold 2026-04-19 | **N8N_NEWER** on substance. |
| WF-PL-01 | 2026-04-18 | scaffold 2026-04-19 | **N8N_NEWER** on substance. |
| WF-DI-01 | 2026-04-18 | scaffold 2026-04-19 | **N8N_NEWER** on substance. |
| WF-ME-01 | 2026-04-18 | scaffold 2026-04-19 | **N8N_NEWER** on substance. |
| WF-RA-01 | 2026-04-18 | scaffold 2026-04-19 | **N8N_NEWER** on substance. |
| WF-SU-01 | 2026-04-18 | scaffold 2026-04-19 | **N8N_NEWER** on substance (also naming drift). |
| WF-RC-01 | 2026-04-18 | (no repo artifact) | **INCONCLUSIVE**; N8N_ONLY. |
| WF-MO-01 | 2026-04-18 | (no repo artifact) | **INCONCLUSIVE**; N8N_ONLY. |
| DEPRECATED stub | 2026-04-18 | n/a | **N/A** (correctly deprecated). |
| `_ARCHIVED_Executor_Closer_stub/` (repo) | n/a | 2026-04-19 | **DOCS_ONLY** (no n8n match expected). |

Overall recency verdict: **n8n leads the repo on content by ~3 days**, and the repo led on naming-structure by ~1 day (the 2026-04-19 closeout pass). No case where the repo content supersedes n8n.

## H. Recommendations (read-only; no changes performed)

These are **observations**, not actions. Nothing in this audit has been executed.

1. **Populate the 8 existing WF-* scaffolds with the n8n state.** For each of `WF-TR-01, WF-EC-01, WF-OR-01, WF-PL-01, WF-DI-01, WF-ME-01, WF-RA-01, WF-SU-01`: export the live n8n JSON into `workflow/`, generate a node map into `docs/`, carry the contract (input envelope, output envelope, allowed_next_stage) into `docs/`, and note open gaps (e.g. WF-ME-01's unimplemented module branches). Prefer blueprints that track n8n `updatedAt` so diff-detection is possible in future passes.
2. **Create `workflows/WF-RC-01_Response_Composer/` and `workflows/WF-MO-01_Message_Out/` folders** with the standard skeleton, then populate from the n8n state. Update `workflows/README.md` to include them in the active index.
3. **Rename `workflows/WF-SU-01_Sub_Workflow/` to `workflows/WF-SU-01_State_Persistence_Updater/`** (or a similar substantive name) and update the `workflows/README.md` row accordingly. This eliminates the naming drift without touching content.
4. **Add a brief monolith orientation under `docs/archive/` or `docs/product/`** that records what `brain_main_inbound_mvp_v6_preprocessor_fixed` does, why it is still active, and how the migration plan cuts it over to the modular pipeline. Link from `README.md` §"Current Implementation Status". If `docs/migration/Migration_Plan_Ucenicul.md` already covers this, add a pointer from README to that section.
5. **Reconcile the module registry.** Either add `Module_Spec_Improvement.md` to match the n8n `improvement` module, or remove `improvement` from the n8n planner registry. Similarly, clarify in `Module_Registry_Ucenicul.md` whether `response` is treated as a module (spec exists) or as a stage workflow (WF-RC-01 exists) — at present both framings coexist.
6. **Document WF-00 Morning Briefing.** It is active and scheduled; operationally important; entirely undocumented.
7. **Document (or decide to delete) WF-01 Message Receiver.** Inactive and contains references to missing WF-02 / WF-03.
8. **Fix misleading n8n descriptions.** `WF-EC-01`'s `meta.description` should be rewritten to describe Execution Context init rather than the stale timestamp-probe text.
9. **Surface known-incomplete markers.** `WF-MO-01`'s `MO_Send_Channel_PLACEHOLDER` and `WF-RC-01`'s disabled MO-01 handoff should be tracked (e.g. in `PROJECT_MASTER.md`'s status column, or a `known_gaps.md` under `inventory/`). As of now they are only discoverable by reading the n8n JSON.

All eight items above are **post-baseline work** consistent with `ABSOLUTE_CLOSEOUT_REPORT.md` Section 5 item 1 ("Populate scaffolded workflows/WF-*/ folders with real workflow JSON, SQL, scripts, tests, docs").

## I. Limitations — what this audit could NOT inspect, and why

The following canonical documents were **visible via `stat`** but unreadable via `open()`, `cat`, the Read tool, and Python file I/O. This is the same mount quirk noted in `RECONCILIATION_STATE_FINAL.json` ("mount-locked for rewrite; visible via stat, but open/read/write fail with ENOENT"). They were not inspected in this session, and therefore no content-level comparison against them is claimed in this audit.

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (stat size 36189)
2. `docs/architecture/n8n_Workflow_Mapping.md` (stat size 9849) — the **most important missing doc** for this audit
3. `docs/architecture/Module_Registry_Ucenicul.md` (stat size 7433)
4. `docs/architecture/Module_Spec_Task.md`, `Module_Spec_Reminder.md`, `Module_Spec_Memory.md`, `Module_Spec_Response.md`, `Module_Spec_Watcher.md`
5. `docs/architecture/Thread_Resolution_Spec.md` (stat size 13305)
6. `docs/architecture/Memory_Model_Spec.md` (stat size 5029)
7. `docs/migration/Migration_Plan_Ucenicul.md`
8. `docs/operations/Documentation_Verification_Checklist_Ucenicul.md`
9. All `workflows/WF-*-01_<Name>/README.md` (×8 — each 740–747 bytes per stat)

Documents successfully inspected in this session:

1. `README.md`
2. `PROJECT_MASTER.md`
3. `CLAUDE.md` (partial via previous session transcript cache)
4. `workflows/README.md`
5. `db/README.md`
6. `DECISIONS.md`
7. `PROGRESS_LOG.md`
8. `workflows/_ARCHIVED_Executor_Closer_stub/README.md` and `/docs/README.md`
9. Context-layer docs added in the 2026-04-19 closeout: `FINAL_CANONICAL_BASELINE.md`, `AI_CONTEXT_LOADING_RULES.md`, `inventory/ABSOLUTE_CLOSEOUT_REPORT.md`, `inventory/RECONCILIATION_STATE_FINAL.json`

Implication for confidence:

- **Coverage verdict is robust** — you can tell what folders exist or don't without reading their content.
- **Naming drift verdict is robust** — based on folder names and table labels that were inspectable.
- **Monolith-vs-modular drift verdict is robust** — observable from n8n alone and from the `README.md` paragraph.
- **Alignment-on-content verdict is LIMITED** — if `n8n_Workflow_Mapping.md` already captures the wiring accurately, the substantive alignment would be higher than this audit scores. The scores in Section F are calibrated conservatively on what was inspectable, and Section F's honesty note explicitly flags the re-score envelope.
- **Migration-plan-awareness verdict is LIMITED** — the existence or absence of an explicit cutover plan for the monolith cannot be confirmed this session.

A follow-up pass, once the mount permits reads, should compare `docs/architecture/n8n_Workflow_Mapping.md` node-for-node against the 10 modular n8n workflows captured in Section C.

## J. Tooling evidence

- **n8n server listing.** `mcp__f2e8be41-...__search_workflows` returned 14 workflows (listed in Section C).
- **Per-workflow fetches.** `mcp__n8n__get_workflow` for each workflow id. Several were too large for inline return and overflowed to persisted files under `/sessions/epic-wizardly-fermat/mnt/.claude/projects/.../tool-results/`. All five overflows were parsed into compact skeletons by a local Python script (`/sessions/epic-wizardly-fermat/parse_overflow.py`), producing the `name / id / active / createdAt / updatedAt / nodeCount / connectionCount / node-types / node-list` records used in Section C and Section D. Overflow file sizes:
  - `brain_main_inbound_mvp_v6_preprocessor_fixed` — 347951 bytes
  - `WF-MO-01` — 89845 bytes
  - `WF-ME-01` — 73576 bytes
  - `WF-TR-01` — 105016 bytes
  - `WF-SU-01` — 61664 bytes
- **Repo listing.** `ls -la` and `find` on `/sessions/epic-wizardly-fermat/mnt/Ucenicul/`, with read attempts via the Read tool, `cat`, and Python `open()` for each canonical doc path. Results summarized in Section I.
- **No modifications.** Zero write attempts to n8n. Zero edits to any repo file besides the creation of this audit file at `inventory/N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md`.

## K. Next-session handoff

When a future session revisits this audit:

1. **Re-verify mount.** Attempt to Read `docs/architecture/n8n_Workflow_Mapping.md`. If reads succeed now, rerun Section D against its content.
2. **Refresh n8n state.** Fetch the 14 workflows again. Diff `updatedAt`s against this audit's Section C to catch new edits since 2026-04-19.
3. **Prefer one of two remediation lanes.** Either (a) back-fill the repo to reflect the live n8n state (recommended path per Section H items 1–3), or (b) if the repo documentation is intended as a forward-looking spec, explicitly mark the `workflows/WF-*-01_<Name>/` folders as "target-spec, live workflow differs" and point to the n8n as the implementation-of-record.
4. **Re-score.** Rerun Section F after the mount is readable and after any population work lands. Scores will rise on Alignment and Coverage with very little effort on the Section F envelope described in the honesty note.
5. **This audit is point-in-time.** It does not re-open the 2026-04-19 baseline acceptance; it records a post-baseline alignment state that does not block any other work.

---

> **Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-19. Read-only audit; no n8n or repo mutations were performed.
