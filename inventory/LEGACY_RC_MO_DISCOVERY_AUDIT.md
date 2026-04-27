# LEGACY RC/MO DISCOVERY AUDIT

> **Audit type:** STRICT READ-ONLY DISCOVERY + EXTRACTION.
> **Scope:** Everything in this repository (current state, including archive subtrees) plus the live n8n MCP, that pertains to **WF-RC-01**, **WF-MO-01**, **Response Composer**, **Message Out**, **Output Gateway**, the deprecated MO-01 langchain stub, or any indirect/aliased references to those concepts.
> **Mode:** No modifications to n8n workflows, no modifications to repo documentation, no creation of new workflow folders. Inspection only.
> **Pass date:** 2026-04-19.
> **Companion artifacts:** [`LEGACY_RC_MO_EVIDENCE_INDEX.json`](./LEGACY_RC_MO_EVIDENCE_INDEX.json), [`LEGACY_RC_MO_PROMOTION_PLAN.md`](./LEGACY_RC_MO_PROMOTION_PLAN.md).

---

## A. Executive summary

Both **WF-RC-01 (Response Composer)** and **WF-MO-01 (Message Out / Output Gateway)** are **live in n8n** with substantive node graphs (16 and 18 nodes respectively, both `active`, both updated 2026-04-18). Neither has a corresponding `workflows/WF-*-01_<Name>/` folder in the repo. The repository's readable surface contains only **pointer-level** references to these two stages — the most substantive readable mention is the target-architecture pipeline diagram in `README.md`, which names both stages but defines neither.

The one place a substantive RC-01 contract is most likely to live (`docs/architecture/Module_Spec_Response.md`) and the one place substantive node-level wiring for both stages is most likely to live (`docs/architecture/n8n_Workflow_Mapping.md`) are both **mount-locked in this session — visible by path/stat, unreadable**. This audit explicitly does not assume those documents are empty; it merely records that their content could not be inspected.

There is no archive subtree containing prior-version RC/MO drafts that this session could read. The likely-relevant archive paths (`archive/README.md`, `docs/archive/README.md` — readable; deeper subtrees like `docs/archive/legacy_docs/`, `archive/superseded/`, `archive/pipeline_legacy/` — not present or empty per directory enumeration) yielded nothing.

The DEPRECATED `WF-MO-01 langchain stub` (n8n ID `rooFWDryqC0YDyVa`, 4 nodes, `inactive`, name explicitly prefixed `DEPRECATED__`) is **history-only** and should never be promoted into the new layer; it is recorded here purely so future agents do not re-discover it as a candidate.

**Per-workflow verdict (full table in Section J):**

| Workflow | Documented in old corpus | Represented in new workflow layer | Represented in live n8n | Ready for promotion |
|---|---|---|---|---|
| WF-RC-01 Response Composer | **PARTIAL** (pointers + 1 pipeline-diagram name) | **NO** | **YES** | **PARTIAL** — promotion possible from live n8n + (likely) Module_Spec_Response.md if/when readable |
| WF-MO-01 Message Out / Output Gateway | **PARTIAL** (1 pipeline-diagram name only) | **NO** | **YES** | **PARTIAL** — promotion possible from live n8n; no readable old-corpus contract |
| DEPRECATED__WF-MO-01_langchain_stub | NO | NO | YES (inactive, deprecated) | **NO — history only** |

---

## B. Search methodology

The discovery scan was applied across two read surfaces:

**Surface 1 — Repo (file tree).** All `.md`, `.json`, `.yml`, `.yaml`, `.txt` files under `/sessions/epic-wizardly-fermat/mnt/Ucenicul/`. Every file was first probed for read access (the OneDrive-style mount in this session blocks ~62% of the doc files from being opened — see Section H). For each readable file, the discovery used the following grep pattern families.

Pattern A — explicit canonical codes:
`WF-RC-01`, `WF-MO-01`, `WF-RC`, `WF-MO`.

Pattern B — explicit aliases:
`Response Composer`, `Response_Composer`, `Message Out`, `Message_Out`, `Output Gateway`, `Output_Gateway`, `RC-01`, `MO-01`, `RC_`, `MO_`, `composer`, `gateway`.

Pattern C — indirect/semantic anchors derived from the live n8n node names:
`SHA256`, `digest`, `envelope`, `composition`, `aggregated_result`, `state_update_input`, `MESSAGE_OUT`, `Validate Composed`, `replay guard`, `lineage`, `channel delivery`, `Romanian`, `locale labels`, `outbound`, `deliver`, `compose`.

Pattern D — module-layer aliases:
`response_module`, `Module_Spec_Response`, `n8n_Workflow_Mapping`, `response composition`.

All searches were case-insensitive. Results were collected with surrounding context lines (`-C 2`) to permit semantic validation in Section D.

**Surface 2 — Live n8n MCP.** The 14 n8n workflows fetched in the FAZA-0 of the previous (Task B) audit were re-used as the source of truth for the live RC/MO layouts. The 16-node WF-RC-01 (`TClXgmO8H8zsSwMb`) and the 18-node WF-MO-01 (`OooZdC0DgsDR6gm0`), plus the 4-node DEPRECATED stub (`rooFWDryqC0YDyVa`), were re-confirmed by name and metadata; node-level details were carried forward from the parsed compact form in `n8n_real_state_skeleton.md`.

---

## C. Inventory of files inspected

The repo contains **84 text-doc files** in scope. Of these, **32 were readable** in this session and **52 were mount-locked** (visible via `stat`/`ls`, unreadable via `Read`, `cat`, Python `open()`).

**Readable files relevant to RC/MO (full corpus searched, hits below are the only ones surfaced by Patterns A–D):**

| # | File | Hits | Hit type |
|---|---|---|---|
| 1 | `README.md` | line ~32-34 | pipeline-stage diagram (names "Response Composer", "Message Out") |
| 2 | `AI_CONTEXT_LOADING_RULES.md` | line ~40 | task-type example ("write response composer") |
| 3 | `CANONICAL_ENTRYPOINTS.md` | lines ~47, 61, 62, 124 | pointer to `Module_Spec_Response.md` and `n8n_Workflow_Mapping.md` |
| 4 | `CLAUDE.md` | lines ~29, 42, 48 | declares `n8n_Workflow_Mapping.md` as truth source for n8n execution layout; declares Response composition out-of-scope for `brain_contract.json` |
| 5 | `HOT_CONTEXT_FILES.md` | lines ~46, 50, 60, 117, 123 | HOT-context entries pointing to `Module_Spec_Response.md` and `n8n_Workflow_Mapping.md` |
| 6 | `FINAL_CANONICAL_BASELINE.md` | lines ~93, 97 | rolls `Module_Spec_Response.md` and `n8n_Workflow_Mapping.md` into the canonical baseline |
| 7 | `db/README.md` | lines ~19, 20, 104, 234 | `direction = inbound/outbound`, `channel`, `source_channels`, `response_module` row consuming `aggregated_results, threads` |
| 8 | `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK.md` | lines ~54, 58, 77, 81, 302 | confirms filing of `Module_Spec_Response.md` and `n8n_Workflow_Mapping.md` under `docs/architecture/` |
| 9 | `inventory/N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md` | sections D.12, D.13, D.14, E (rows 2, 9, 10), I, plus several row-summaries | this session's prior derivative audit; treated as a summary, not as a primary legacy source |

**Readable files searched but with no RC/MO hits (representative):** `PROJECT_MASTER.md`, `PROGRESS_LOG.md`, `DECISIONS.md`, `COLD_CONTEXT_FILES.md`, `Ucenicul/OBSOLETE.md`, `docs/README.md`, `docs/archive/README.md`, `docs/audits/README.md`, `docs/product/README.md`, `inventory/README.md` (locked anyway), `inventory/ABSOLUTE_CLOSEOUT_REPORT.md`, `inventory/DOCS_LEGEND.md`, `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md`, `inventory/DOCUMENT_STRUCTURE_FIXES_DELTA.md`, `inventory/RECONCILIATION_STATE_FINAL.json`, `workflows/_ARCHIVED_Executor_Closer_stub/README.md`, all 8 active `workflows/WF-*-01_*/README.md` (locked), `.claude/pipelines/LAYOUT.md`, `.claude/README.md`, `.claude/_removed_test.txt`, `src/README.md`, `testing/README.md`, `scripts/README.md` (locked), `db/{docs,migrations,queries,schema}/README.md` (locked), `archive/README.md` (locked).

**Mount-locked files with potential RC/MO content (per Section H):** `docs/architecture/{Architecture_Spec_v3_Ucenicul, n8n_Workflow_Mapping, Module_Registry_Ucenicul, Module_Spec_Response, Module_Spec_{Memory,Reminder,Task,Watcher}, Thread_Resolution_Spec, Memory_Model_Spec}.md`; `docs/migration/Migration_Plan_Ucenicul.md`; `docs/operations/Documentation_Verification_Checklist_Ucenicul.md`; all 8 `workflows/WF-*-01_*/README.md`; many `inventory/*.json` and `inventory/{FINAL_CLOSURE_DELTA, FINAL_POLISH_DELTA, final_reorganization_report, README}.md`; `archive/README.md` and the various `db/*/README.md`.

---

## D. Hit-by-hit analysis (semantic validation)

Each readable hit is graded as **DIRECT** (substantive content about RC/MO), **POINTER** (names a canonical doc that contains the content), or **INCIDENTAL** (uses RC/MO as an example/label without describing it).

### D.1 `README.md` — target-architecture diagram
- **Type:** DIRECT but stage-naming-only.
- **Verbatim (compressed):** "Message In → Thread Resolver → Execution Context → Orchestrator Planner → Dispatcher → Modules → Result Aggregator → **Response Composer** → **Message Out**".
- **What it establishes:** Both stages are first-class members of the target pipeline, in this exact order, immediately after Result Aggregator.
- **What it does NOT establish:** Any contract, input/output envelope, locale rules, channel routing, error semantics, idempotency model, or relation to `state_update_input` (which is the actual input the live RC-01 validates).

### D.2 `AI_CONTEXT_LOADING_RULES.md` — task-type example
- **Type:** INCIDENTAL.
- **Verbatim:** `"Implement task_module", "write response composer", etc.`
- **What it establishes:** Use of "response composer" as a recognizable task label.
- **What it does NOT establish:** Anything about WF-RC-01's actual responsibilities. It's a string used to illustrate context-loading rules, not a description of the workflow.

### D.3 `CANONICAL_ENTRYPOINTS.md` — pointer table rows
- **Type:** POINTER.
- **Verbatim (key row):** "How does the response module work? | `docs/architecture/Module_Spec_Response.md`".
- **Other rows pointed at `n8n_Workflow_Mapping.md`:** "How do n8n workflows wire together at execution time?" and "What is the PostgreSQL query policy inside n8n?" (Section 5).
- **What it establishes:** The repo's canonical-entrypoint convention treats `Module_Spec_Response.md` as the authority on the response module and `n8n_Workflow_Mapping.md` as the authority on n8n wiring. Both target docs are mount-locked.

### D.4 `CLAUDE.md` — authority + scope rows
- **Type:** POINTER + scope-statement.
- **Verbatim (compressed):** authority table assigns "n8n execution layout" → `docs/architecture/n8n_Workflow_Mapping.md`; "PostgreSQL query policy" → `n8n_Workflow_Mapping.md` Section 5; "Response composition" listed under domains explicitly **out of scope** for `brain_contract.json`.
- **What it establishes:** The architecture authority chain treats wiring as `n8n_Workflow_Mapping.md`'s job and treats response composition as a separate domain (consistent with Module_Spec_Response.md being the spec).
- **What it does NOT establish:** Any RC/MO content. It is solely an authority/scope assertion.

### D.5 `HOT_CONTEXT_FILES.md` — load-on-demand pointers
- **Type:** POINTER.
- **Verbatim (key rows):**
  - `docs/architecture/Module_Spec_Response.md | Response composition work`
  - `docs/architecture/n8n_Workflow_Mapping.md | Any n8n workflow wiring or query policy work`
  - `docs/architecture/n8n_Workflow_Mapping.md | Always co-loaded with workflow work`
- **What it establishes:** Same pointers as D.3/D.4. Confirms HOT-context governance.

### D.6 `FINAL_CANONICAL_BASELINE.md` — baseline roll
- **Type:** POINTER (administrative).
- **What it establishes:** Both `Module_Spec_Response.md` and `n8n_Workflow_Mapping.md` are part of the canonical Level-2 doc set frozen at 2026-04-19 closeout. So at baseline, the response-module contract was treated as a canonical artifact even though the workflow folder was not created.

### D.7 `db/README.md` — schema rows
- **Type:** DIRECT but schema-level only.
- **Verbatim (key rows):**
  - `direction | VARCHAR | inbound / outbound`
  - `channel | VARCHAR | Source channel (telegram, etc.)`
  - `source_channels | VARCHAR[] | Channels this thread spans`
  - `response_module | aggregated_results, threads | Module results (aggregated) | Detokenization at outbound boundary in Phase 2`
- **What it establishes:**
  - `messages.direction` carries inbound/outbound discrimination — the column MO-01 must write to.
  - `messages.channel` and `threads.source_channels` carry channel identity — what MO-01's "Route Channel" switch must use.
  - `response_module` consumes `aggregated_results` + `threads` (which matches the live RC-01 nodes "Aggregated Result Context" + "Load Thread Context").
  - Detokenization is deferred to **Phase 2** at the **outbound boundary**. This is the only place in the readable corpus that explicitly mentions an outbound-boundary policy. "Outbound boundary" plausibly means MO-01 but is not explicitly tied to it.
- **What it does NOT establish:** Node-level wiring for either stage; locale rules; envelope format; replay-guard logic; idempotency keys for outbound writes.

### D.8 `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK.md` — filing audit
- **Type:** POINTER (administrative).
- **What it establishes:** That `Module_Spec_Response.md` and `n8n_Workflow_Mapping.md` are filed correctly (`docs/architecture/`) and classified ("architecture (module contract)" and "architecture (Level 2, execution layout)"). Administrative.

### D.9 `inventory/N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md` — prior derivative
- **Type:** Self-reference (intra-session).
- **What it establishes:** Previous audit documented WF-RC-01 / WF-MO-01 as `N8N_ONLY` and recorded their live n8n layouts. Useful as a summary; not a primary legacy source. Cited in this audit but not used to establish facts that don't have an upstream source.

### D.10 Live n8n — WF-RC-01 (`TClXgmO8H8zsSwMb`)
- **Type:** DIRECT (primary source for current behavior).
- **State:** 16 nodes, `active`, `updatedAt = 2026-04-18`. Triggers: executeWorkflowTrigger + manual + (disabled) chat.
- **Flow (compressed):**
  - Validate `state_update_input` (UUID + envelope shape).
  - Route Valid → Load EC + Load Thread Context → Verify Lineage & Replay (lineage check + replay-guard probe).
  - Build Composition Input (extract relevant fields from EC + thread context + aggregated_result).
  - Compose Response (Romanian/English locale with labels — i18n at composition time).
  - Build Output Envelope (with **SHA256 digest** of the rendered payload — content-addressing for idempotency / dedup).
  - Return Result / Error / Context Error.
- **Notable wiring detail:** `WF-RC-01` contains **disabled MO-01 handoff nodes**. The composer emits `allowed_next_stage='MESSAGE_OUT'` but does not directly invoke `WF-MO-01` in the live runtime. RC→MO transition is intent-only, not yet executed.

### D.11 Live n8n — WF-MO-01 (`OooZdC0DgsDR6gm0`)
- **Type:** DIRECT.
- **State:** 18 nodes, `active`, `updatedAt = 2026-04-18T11:20:33Z`. Triggers: MO_Input (executeWorkflowTrigger) + Manual Trigger.
- **Flow (compressed):**
  - Validate Composed Response (envelope shape).
  - Route Valid → Load EC + Load Thread + Load Channel Delivery Context (per-channel delivery state).
  - Replay Guard Probe → Verify Lineage & Replay (paired with EC).
  - Route Context Ready → Build Delivery Request.
  - Route Channel (switch on channel id) → `MO_Send_Channel_PLACEHOLDER` (currently a Telegram sender; placeholder name signals channel abstraction is mid-flight).
  - Log Outbound Message (writes to messages with direction=outbound, channel, etc. — anchors back to D.7).
  - Build Delivery Result → Return Result / Error / Context Error.
- **Notable wiring detail:** Single `PLACEHOLDER` node carries both the Telegram-only implementation and the future channel-abstraction work.

### D.12 Live n8n — DEPRECATED langchain stub (`rooFWDryqC0YDyVa`)
- **Type:** DIRECT but explicitly history-only.
- **State:** 4 nodes, `inactive`, `updatedAt = 2026-04-18`. Manual + Chat triggers → AI Agent (langchain) + OpenAI gpt-5-mini.
- **Notable:** name is prefixed `DEPRECATED__`. Self-flagged. Not part of the runtime path. Should not be promoted into the new layer.

---

## E. Aliases and naming map

The audit normalizes the following aliases to two canonical workflow codes plus one history-only entry:

| Alias / mention | Canonical | Notes |
|---|---|---|
| `WF-RC-01` | **WF-RC-01** | Direct code. |
| `WF-RC-01 Response Composer` | **WF-RC-01** | n8n display name. |
| `Response Composer` | **WF-RC-01** | English alias used in README pipeline diagram. |
| `response composer` | **WF-RC-01** | Lowercase task-type example in `AI_CONTEXT_LOADING_RULES.md`. |
| `response module` | **WF-RC-01** | Module-layer framing in `CANONICAL_ENTRYPOINTS.md`. |
| `response_module` | **WF-RC-01** | Snake_case module name in `db/README.md`. |
| `Module_Spec_Response.md` | **WF-RC-01** | Canonical Level-2 spec target (mount-locked). |
| `Response composition` | **WF-RC-01** | Domain label in `CLAUDE.md` and `HOT_CONTEXT_FILES.md`. |
| `WF-MO-01` | **WF-MO-01** | Direct code. |
| `WF-MO-01 Message Out / Output Gateway` | **WF-MO-01** | n8n display name (carries both aliases in the same string). |
| `Message Out` | **WF-MO-01** | English alias in README pipeline diagram. |
| `Output Gateway` | **WF-MO-01** | Alternate English alias. |
| `outbound boundary` | **WF-MO-01** (likely) | Phrase in `db/README.md` row for `response_module`. Not explicitly tied to MO-01 in the readable corpus, but the only sensible referent. |
| `MO_Send_Channel_PLACEHOLDER` | **WF-MO-01** | Placeholder node name inside the live MO-01 graph. |
| `MESSAGE_OUT` | **WF-MO-01** | `allowed_next_stage` value emitted by RC-01. |
| `DEPRECATED__WF-MO-01_langchain_stub` | **DEPRECATED stub** | History-only. Do not promote. |

There is no readable evidence of any other alias (e.g. "Composer" or "Sender" or "Dispatch" or "Egress") being used to refer to either stage.

---

## F. Indirect / aliased mentions and ambiguities

Beyond the explicit aliases in Section E, the discovery surfaced a small number of indirect anchors that probably refer to RC/MO but are not tagged as such in the readable corpus:

- **"outbound boundary" (`db/README.md` row 234).** Most likely refers to MO-01, where outbound writes happen. Not tagged.
- **"detokenization at outbound boundary in Phase 2" (same row).** A policy commitment with no specified workflow owner. The audit reads this as MO-01's job (or an MO-01 helper) but the doc is silent on that.
- **`source_channels` on threads / `channel` on messages (`db/README.md` rows ~19, 104).** Schema-level support for the MO-01 channel-routing switch.
- **`response_module` consumes `aggregated_results, threads` (`db/README.md` row 234).** Schema-level definition of RC-01's input shape (matches the live n8n flow).
- **"composition" / "envelope" / "digest" (live n8n only).** Not present in any readable repo doc.

There were **no readable documents** containing the strings `state_update_input`, `MESSAGE_OUT`, `Replay Guard`, `Replay Guard Probe`, `Validate Composed`, `MO_Send_Channel`, `lineage`, `channel delivery`, `Romanian`, or `locale labels`. These strings exist only in the live n8n graph nodes.

---

## G. Mapping legacy evidence ↔ live n8n

| Legacy evidence (readable) | Maps to live n8n element |
|---|---|
| `README.md` "Response Composer" stage label | `WF-RC-01` (entire workflow) |
| `README.md` "Message Out" stage label | `WF-MO-01` (entire workflow) |
| `db/README.md` `response_module` row → `aggregated_results, threads` | `WF-RC-01` Load EC / Load Thread Context / Build Composition Input |
| `db/README.md` `direction`, `channel`, `source_channels` | `WF-MO-01` Log Outbound Message + Route Channel |
| `db/README.md` "Detokenization at outbound boundary in Phase 2" | likely a future feature inside `WF-MO-01` (or a pre-MO-01 helper); not yet present in either live workflow |
| `CANONICAL_ENTRYPOINTS.md` / `HOT_CONTEXT_FILES.md` pointer to `Module_Spec_Response.md` | `WF-RC-01` (contract, not wiring) |
| `CANONICAL_ENTRYPOINTS.md` / `CLAUDE.md` / `HOT_CONTEXT_FILES.md` pointer to `n8n_Workflow_Mapping.md` | both `WF-RC-01` and `WF-MO-01` (wiring); also covers PostgreSQL query policy used in both |
| `AI_CONTEXT_LOADING_RULES.md` "write response composer" example | `WF-RC-01` (pure label, no mapping payload) |

The reverse — going live → legacy — yields only:
- `WF-RC-01.allowed_next_stage='MESSAGE_OUT'` ↔ `README.md` "Message Out" label (no envelope contract in the readable corpus).
- `WF-RC-01.Compose Response (Romanian/English locale with labels)` ↔ no readable legacy source for locale policy.
- `WF-RC-01.Build Output Envelope (SHA256 digest)` ↔ no readable legacy source for digest policy.
- `WF-RC-01.Disabled MO-01 handoff nodes` ↔ no readable legacy source acknowledging this incomplete state.
- `WF-MO-01.MO_Send_Channel_PLACEHOLDER` ↔ no readable legacy source for the channel abstraction plan.
- `WF-MO-01.Replay Guard Probe` ↔ no readable legacy source for replay semantics.
- `WF-MO-01.Lineage & Replay` ↔ no readable legacy source for lineage rules.

Every one of these "no readable legacy source" gaps could plausibly be filled by `Module_Spec_Response.md`, `n8n_Workflow_Mapping.md`, or `Architecture_Spec_v3_Ucenicul.md` — all mount-locked.

---

## H. Mount-locked files (visible by path/stat, unreadable in this session)

Per the strict rule "do not treat absence-of-folder as absence-of-documentation", every mount-locked file with a plausible RC/MO bearing is enumerated here. None of these were inspected; all are recorded as **potential evidence not inspected**.

**Highest-likelihood RC/MO containers (ranked):**

1. `docs/architecture/Module_Spec_Response.md` — by name, the canonical "what" of response composition. Pointed to by 4 readable docs.
2. `docs/architecture/n8n_Workflow_Mapping.md` (~9849 bytes) — by name, the canonical "how" of n8n wiring AND the PostgreSQL query policy. Pointed to by 5 readable docs.
3. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (~36189 bytes) — by name, the Level-1 authority. Almost certainly defines both stages at envelope/conceptual level.
4. `docs/architecture/Module_Registry_Ucenicul.md` (~7433 bytes) — should disambiguate the "module vs stage" framing for the response role.
5. `docs/migration/Migration_Plan_Ucenicul.md` — should contain the cutover plan from `brain_main_inbound_mvp_v6_preprocessor_fixed` to RC-01/MO-01, plus the disposition of the DEPRECATED langchain stub.
6. `docs/operations/Documentation_Verification_Checklist_Ucenicul.md` — may contain RC/MO-specific verification gates.

**Possibly relevant containers:**

7. `docs/architecture/Thread_Resolution_Spec.md` — both RC-01 and MO-01 load thread context; Thread spec may name them as downstream consumers.
8. `docs/architecture/Memory_Model_Spec.md` — low-probability; memory may interact with composition.
9. `docs/architecture/Module_Spec_{Memory,Reminder,Task,Watcher}.md` — define the per-module results that aggregate into RC-01's input.
10. `workflows/WF-DI-01_Dispatcher/README.md`, `workflows/WF-EC-01_Execution_Context/README.md`, `workflows/WF-ME-01_Module_Execution/README.md`, `workflows/WF-OR-01_Orchestrator/README.md`, `workflows/WF-PL-01_Plan_Generation/README.md`, `workflows/WF-RA-01_Result_Aggregator/README.md`, `workflows/WF-SU-01_Sub_Workflow/README.md`, `workflows/WF-TR-01_Thread_Resolver/README.md` — each scaffold README may document its handoff to RC-01 and/or MO-01. WF-RA-01 and WF-SU-01 are the most relevant (they are the direct upstream of RC-01).

**Probably-not-relevant containers (listed for completeness):**

11. `archive/README.md`, `db/{docs,migrations,queries,schema}/README.md`, `scripts/README.md`, `inventory/README.md`, most `inventory/*.json` (manifests).

**Manifests / closure deltas that could indirectly answer "why are these workflow folders missing":**

12. `inventory/workflow_manifest.json` — by name, may explicitly enumerate which workflow folders exist and which were intentionally omitted.
13. `inventory/FINAL_CLOSURE_DELTA.md`, `inventory/FINAL_POLISH_DELTA.md`, `inventory/final_reorganization_report.md` — may record when WF-RC-01/WF-MO-01 were considered for inclusion and why they were not created.

The audit explicitly states: **none of these were inspected this session**. Whether the absence of the workflow folders was a deliberate baseline decision (recorded somewhere in these manifests) or an oversight cannot be determined from the readable surface.

---

## I. Limitations and confidence statement

- **Discovery completeness:** HIGH for the readable surface (all 32 readable doc files were grep'd with Patterns A–D). LOW for the mount-locked surface (52 files visible-but-unreadable). The audit does not assume mount-locked files are empty.
- **Legacy-corpus extraction:** PARTIAL. The substantive "what" of RC-01 is most likely in the mount-locked `Module_Spec_Response.md`. Substantive node-level wiring for both is most likely in the mount-locked `n8n_Workflow_Mapping.md`. Neither could be inspected.
- **Live-n8n extraction:** HIGH. The live n8n state was previously fetched in detail (Task B) and re-confirmed by name/metadata for this audit; the parsed compact form in `n8n_real_state_skeleton.md` is the working source for D.10–D.12.
- **Naming-map confidence:** HIGH for the explicit aliases in Section E. MEDIUM for "outbound boundary" → MO-01 (no explicit anchor in the readable corpus).
- **Promotion-readiness verdict:** Robust on the live-n8n side (live state can be exported into a new folder verbatim). Conservative on the legacy side (no readable legacy doc provides a complete contract; locked docs may change the picture).
- **History-only verdict for the langchain stub:** HIGH (self-flagged in n8n name).

---

## J. Per-workflow final verdict

Each workflow is assessed on four axes per the user's request format:

### J.1 WF-RC-01 Response Composer

- **Documented in old corpus:** **PARTIAL.**
  - DIRECT, stage-naming-only: `README.md` pipeline diagram.
  - POINTER to canonical content: `CANONICAL_ENTRYPOINTS.md`, `HOT_CONTEXT_FILES.md`, `FINAL_CANONICAL_BASELINE.md`, `CLAUDE.md` all point at `Module_Spec_Response.md` (mount-locked).
  - SCHEMA-LEVEL INPUTS: `db/README.md` documents `response_module` consuming `aggregated_results, threads`.
  - INCIDENTAL: `AI_CONTEXT_LOADING_RULES.md` task-type example.
  - Substantive contract not found in readable corpus; `Module_Spec_Response.md` is mount-locked and almost certainly contains it.
- **Represented in new workflow layer:** **NO.**
  - No `workflows/WF-RC-01_Response_Composer/` folder. Not in the active index in `workflows/README.md`.
- **Represented in live n8n:** **YES.**
  - 16 nodes, active, updated 2026-04-18. Disabled MO-01 handoff nodes. Emits `MESSAGE_OUT` intent.
- **Ready for promotion:** **PARTIAL.**
  - Workflow folder can be created from the standard skeleton and immediately populated by exporting the live n8n JSON. Contract content (locale rules, envelope shape, digest policy) cannot be confidently sourced from readable docs. If `Module_Spec_Response.md` becomes readable, promotion confidence rises to HIGH; if not, the folder can still be populated from live n8n alone with an explicit "n8n is the implementation-of-record" marker.
  - Known-incomplete marker to surface during promotion: **disabled MO-01 handoff nodes** (currently undocumented in any readable repo file).

### J.2 WF-MO-01 Message Out / Output Gateway

- **Documented in old corpus:** **PARTIAL** (lighter than RC-01).
  - DIRECT, stage-naming-only: `README.md` pipeline diagram ("Message Out").
  - SCHEMA-LEVEL ANCHORS: `db/README.md` rows for `direction = inbound/outbound`, `channel`, `source_channels`, and the "Detokenization at outbound boundary in Phase 2" policy.
  - POINTER to wiring: `n8n_Workflow_Mapping.md` (mount-locked) is the only candidate doc that would carry MO-01 node-level detail.
  - No `Module_Spec_Output_Gateway.md` exists (or is at least visible as a stat entry). MO-01 has no module-spec analog in the readable corpus.
  - No readable legacy doc names "Output Gateway" except via the n8n display string surfaced in the previous audit.
- **Represented in new workflow layer:** **NO.**
  - No `workflows/WF-MO-01_Message_Out/` folder. Not in the active index.
- **Represented in live n8n:** **YES.**
  - 18 nodes, active, updated 2026-04-18T11:20:33Z. Channel routing currently `PLACEHOLDER` (Telegram only).
- **Ready for promotion:** **PARTIAL.**
  - Workflow folder can be created and populated from live n8n JSON. There is no readable legacy contract to merge with the live state; the contract must be derived from live n8n + (likely) `n8n_Workflow_Mapping.md` if/when readable + (likely) `Architecture_Spec_v3_Ucenicul.md` if/when readable.
  - Known-incomplete markers to surface during promotion: **`MO_Send_Channel_PLACEHOLDER`** (channel abstraction not finalized); replay-guard semantics undocumented; "outbound boundary detokenization" deferred to Phase 2 with no implementation in the live workflow.

### J.3 DEPRECATED__WF-MO-01_langchain_stub

- **Documented in old corpus:** **NO.**
- **Represented in new workflow layer:** **NO.**
- **Represented in live n8n:** **YES** but inactive and explicitly self-flagged DEPRECATED.
- **Ready for promotion:** **NO — history-only.** Should not be promoted. Should be recorded once in `inventory/known_gaps.md` (or equivalent) and otherwise ignored. Could be considered for archival deletion in n8n itself once the disposition is approved.

---

## K. Companion-artifact pointers

- **Evidence index (machine-readable):** [`inventory/LEGACY_RC_MO_EVIDENCE_INDEX.json`](./LEGACY_RC_MO_EVIDENCE_INDEX.json).
- **Promotion plan (what would go where, if/when promotion is authorized):** [`inventory/LEGACY_RC_MO_PROMOTION_PLAN.md`](./LEGACY_RC_MO_PROMOTION_PLAN.md).

---

## End-of-audit notes

This audit performs **discovery and extraction only**. It does not modify n8n, does not modify any repo doc, and does not create any workflow folder. It does not adjudicate whether the workflow folders should be created — that is a separate decision recorded in the promotion plan as **PARTIAL: ready when promotion is authorized**. It explicitly does not assume the mount-locked files are empty; if any of `Module_Spec_Response.md`, `n8n_Workflow_Mapping.md`, `Architecture_Spec_v3_Ucenicul.md`, `Module_Registry_Ucenicul.md`, or `Migration_Plan_Ucenicul.md` becomes readable in a later session, the verdicts in Section J should be re-rendered, with WF-RC-01 likely rising from PARTIAL to FULL on the "documented in old corpus" axis.
