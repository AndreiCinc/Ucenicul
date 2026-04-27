# LEGACY RC/MO PROMOTION PLAN

> **Purpose:** Specify, for each future workflow folder (`workflows/WF-RC-01_Response_Composer/` and `workflows/WF-MO-01_Message_Out/`), what content would go where IF promotion were authorized — using the standard workflow skeleton (`workflow/`, `docs/`, `sql/`, `scripts/`, `tests/`, `reports/`, `assets/`).
> **Strict scope:** This is a *plan*, not an action. No folders are created, no n8n workflows are modified, no repo docs are modified. The plan answers: "If we promote, what goes in each subfolder, what comes from old docs, what comes from live n8n, what is unclear, what is history-only?"
> **Companions:** [`LEGACY_RC_MO_DISCOVERY_AUDIT.md`](./LEGACY_RC_MO_DISCOVERY_AUDIT.md), [`LEGACY_RC_MO_EVIDENCE_INDEX.json`](./LEGACY_RC_MO_EVIDENCE_INDEX.json).
> **Pass date:** 2026-04-19.

---

## 1. Standard workflow skeleton (recap)

Per `workflows/README.md`, every active workflow folder follows the layout:

| Subfolder | Content |
|---|---|
| `workflow/` | n8n blueprint JSONs (canonical artifact) |
| `docs/` | node maps, connection maps, import patch plans, test matrices, stage docs, contracts, handoffs |
| `sql/` | workflow-specific SQL |
| `scripts/` | workflow-specific Python logic |
| `tests/` | test families, results, fixtures |
| `reports/` | AUDIT / BUILD / CLOSURE / FIX_LOG / WORK_LOG / POST_IMPORT_AUDIT / REMEDIATION / TEST_REPORT / TEST_AFTER_IMPORT |
| `assets/` | UI assets, screenshots, other binaries |

A new folder also gets a top-level `README.md` (orientation only).

---

## 2. Promotion plan — `workflows/WF-RC-01_Response_Composer/`

### 2.1 Top-level `README.md`

**Source mix:** synthesized at promotion time from (a) the live n8n display name, (b) the `Module_Spec_Response.md` summary if/when readable, (c) the `README.md` pipeline diagram position.

**Content outline:** Workflow code, role, position in the target pipeline (between WF-RA-01 / WF-SU-01 upstream and WF-MO-01 downstream), authority pointers (back to `docs/architecture/Module_Spec_Response.md` for the contract and `docs/architecture/n8n_Workflow_Mapping.md` for the wiring), known-gaps note (disabled MO-01 handoff).

### 2.2 `workflow/`

**Source mix:** **100% from live n8n** — export workflow `TClXgmO8H8zsSwMb` ("WF-RC-01 Response Composer") to a versioned blueprint JSON, e.g. `WF-RC-01_blueprint_2026-04-18.json`. No legacy doc contributes here.

**Notes:**
- Preserve the n8n metadata block (`updatedAt`, `versionId`) for diff-detection in future passes.
- Keep the **disabled MO-01 handoff nodes** in the export. Do not silently re-enable them.

### 2.3 `docs/`

**Source mix:** primarily **from live n8n**, supplemented by **`Module_Spec_Response.md` if readable** and by **`n8n_Workflow_Mapping.md` if readable**.

**Concrete docs to produce at promotion time:**

| Doc | Source | Notes |
|---|---|---|
| `node_map.md` | live n8n | One row per node: name, type, role in flow. From the parsed compact form. |
| `connection_map.md` | live n8n | Edge list (source → target, including the disabled MO-01 handoff edges). |
| `contract.md` | `Module_Spec_Response.md` (if readable) + live n8n | Input envelope (`state_update_input` shape — UUID + envelope wrappers); output envelope (composed response with SHA256 digest); `allowed_next_stage='MESSAGE_OUT'`; locale rules (Romanian/English with labels). |
| `handoffs.md` | live n8n + `n8n_Workflow_Mapping.md` (if readable) | Upstream: WF-SU-01 emits state-update → RC-01 input. Downstream (currently disabled): WF-MO-01. |
| `stage_doc.md` | `README.md` pipeline diagram + `Module_Spec_Response.md` (if readable) | One-page narrative of where this stage fits and why. |
| `import_patch_plan.md` | (none yet) | Created during the actual import pass; left as a TODO at promotion time. |
| `test_matrix.md` | live n8n + new test design | Validation scenarios (locale routing, digest stability, lineage check, replay guard, error envelope). |
| `KNOWN_GAPS.md` | this audit | Records "disabled MO-01 handoff", "no readable legacy contract for digest policy", "Module_Spec_Response.md was mount-locked at promotion start". |

### 2.4 `sql/`

**Source mix:** **from live n8n** node SQL only. No legacy SQL is known to exist for this workflow.

**Concrete files to produce at promotion time:**

| File | Source | Notes |
|---|---|---|
| `load_execution_context.sql` | live n8n "Load Execution Context" node | Parameterized SELECT keyed by `idempotency_key` (per the canonical query policy in `n8n_Workflow_Mapping.md` §5, mount-locked). |
| `load_thread_context.sql` | live n8n "Load Thread Context" node | Parameterized SELECT against `threads` (and possibly `recent_memory`) keyed by thread id from the input envelope. |

### 2.5 `scripts/`

**Source mix:** **from live n8n** Function/Code nodes. None known from legacy docs.

**Likely scripts to extract at promotion time:**

- Composition input builder (extract relevant fields from EC + thread + aggregated_result).
- Locale resolver (Romanian/English label policy).
- SHA256 digest generator for the output envelope.
- Output envelope builder (typed wrapper with `status_kind`, `result_type`, `payload`, `allowed_next_stage`, `idempotency_key`).
- Error envelope builder.

### 2.6 `tests/`

**Source mix:** **none yet** — no legacy test fixtures readable in this session. Tests would be new at promotion time.

**Suggested test families (to be created):**

- Locale tests (Romanian, English, fallback).
- Envelope-validation tests (missing fields, wrong types).
- Lineage/replay-guard tests.
- Digest-stability tests (same payload → same digest; small change → different digest).
- "Disabled MO-01 handoff" regression test (RC-01 must not invoke MO-01 directly until the gate is opened).

### 2.7 `reports/`

**Source mix:** newly generated at promotion time.

**Initial reports:**

- `BUILD_2026-MM-DD.md` — initial build/import report.
- `POST_IMPORT_AUDIT_2026-MM-DD.md` — diff between imported state and live n8n.
- `KNOWN_GAPS.md` — references the audit's findings on the disabled handoff and the missing legacy contract.

### 2.8 `assets/`

**Source mix:** none planned at promotion time. Reserve for future screenshots / diagrams.

### 2.9 What from old docs vs. what from n8n vs. what unclear vs. what history-only

- **From old docs (READABLE):** stage label and pipeline position (`README.md`); module-layer pointer (`CANONICAL_ENTRYPOINTS.md`, `HOT_CONTEXT_FILES.md`, `FINAL_CANONICAL_BASELINE.md`); schema-level inputs (`db/README.md`).
- **From old docs (POTENTIAL — mount-locked, not inspected):** `Module_Spec_Response.md` (likely contains the contract), `n8n_Workflow_Mapping.md` (likely contains node-level wiring), `Architecture_Spec_v3_Ucenicul.md` (likely contains envelope conventions), `Module_Registry_Ucenicul.md` (likely disambiguates module-vs-stage), `Migration_Plan_Ucenicul.md` (likely contains cutover plan), all 8 `workflows/WF-*-01_*/README.md` (may contain handoff notes).
- **From n8n (LIVE):** the entire 16-node graph including locale composition, SHA256 digest, lineage/replay verification, output envelope structure, disabled MO-01 handoff edges.
- **Unclear (no source either way):** the runtime trigger conditions for the disabled MO-01 handoff (when is it intended to be re-enabled?); the precise locale-selection policy (per-org? per-thread? per-message?); the digest's downstream consumer (idempotency? cache key? audit chain?).
- **History-only:** none for WF-RC-01.

---

## 3. Promotion plan — `workflows/WF-MO-01_Message_Out/`

### 3.1 Top-level `README.md`

**Source mix:** synthesized at promotion time from (a) the live n8n display name "Message Out / Output Gateway", (b) the `n8n_Workflow_Mapping.md` summary if/when readable, (c) the `README.md` pipeline diagram position.

**Content outline:** Workflow code, role (terminal stage; channel-aware delivery), position in target pipeline, authority pointers, known-gaps note (channel abstraction in `PLACEHOLDER` state; "outbound boundary detokenization" deferred to Phase 2).

### 3.2 `workflow/`

**Source mix:** **100% from live n8n** — export workflow `OooZdC0DgsDR6gm0` ("WF-MO-01 Message Out / Output Gateway") to `WF-MO-01_blueprint_2026-04-18.json`. Preserve the `MO_Send_Channel_PLACEHOLDER` node verbatim and its name.

### 3.3 `docs/`

**Source mix:** **primarily from live n8n**, with `n8n_Workflow_Mapping.md` (mount-locked) as the secondary source if/when readable. There is no MO-01 module-spec analog in the readable corpus.

**Concrete docs to produce at promotion time:**

| Doc | Source | Notes |
|---|---|---|
| `node_map.md` | live n8n | 18 nodes including Validate Composed Response, Load EC / Thread / Channel Delivery Context, Replay Guard Probe, Verify Lineage & Replay, Build Delivery Request, Route Channel switch, MO_Send_Channel_PLACEHOLDER, Log Outbound Message, Build Delivery Result. |
| `connection_map.md` | live n8n | Edge list. |
| `contract.md` | live n8n + `n8n_Workflow_Mapping.md` (if readable) + `Architecture_Spec_v3_Ucenicul.md` (if readable) | Input envelope (composed response from RC-01); output envelope (delivery result with channel id, status, retry-eligibility). Called out: "outbound boundary detokenization in Phase 2" (per `db/README.md`); not yet implemented. |
| `handoffs.md` | live n8n | Upstream: WF-RC-01 (currently disabled handoff; the live MO-01 trigger is `MO_Input` executeWorkflowTrigger plus a manual trigger). Downstream: none in-pipeline; channel-side delivery. |
| `channel_routing.md` | live n8n + future channel-abstraction doc | Documents the current `PLACEHOLDER` behavior (Telegram-only) and the placeholders for future channels. |
| `stage_doc.md` | `README.md` pipeline diagram | One-page narrative. |
| `import_patch_plan.md` | (none yet) | Created during actual import pass. |
| `test_matrix.md` | live n8n + new test design | Validation scenarios (envelope validation, channel routing, replay guard, lineage check, log integrity). |
| `KNOWN_GAPS.md` | this audit | "channel abstraction is `PLACEHOLDER`", "no readable legacy contract", "detokenization deferred to Phase 2", "no module-spec analog (Output Gateway has no Module_Spec_*)". |

### 3.4 `sql/`

**Source mix:** **from live n8n** node SQL.

**Concrete files to produce at promotion time:**

| File | Source | Notes |
|---|---|---|
| `load_execution_context.sql` | live n8n | Mirrors RC-01's variant; parameterized by idempotency_key. |
| `load_thread_context.sql` | live n8n | Parameterized by thread id; pulls `threads.source_channels`. |
| `load_channel_delivery_context.sql` | live n8n | Per-channel delivery state lookup. |
| `log_outbound_message.sql` | live n8n | INSERT into `messages` with `direction='outbound'`, `channel`, `author_type`, `content` (subject to detokenization policy in Phase 2). |

### 3.5 `scripts/`

**Source mix:** **from live n8n** Function/Code nodes.

**Likely scripts to extract:**

- Composed-response validator.
- Lineage-and-replay verifier (paired with replay guard probe).
- Delivery-request builder.
- Channel-switch helper (current implementation: Telegram-only).
- Outbound-message logger (couples with `log_outbound_message.sql`).
- Delivery-result builder.
- Error envelope builder.

### 3.6 `tests/`

**Source mix:** **none yet** — no legacy test fixtures readable.

**Suggested test families:**

- Envelope-validation tests (missing fields from RC-01's output).
- Channel-routing tests (Telegram path; placeholder for additional channels).
- Replay-guard tests (idempotent re-delivery).
- Lineage tests (matching EC + thread).
- Log-integrity tests (`messages.direction`, `messages.channel`, `messages.author_type` correctness).
- Outbound-boundary detokenization tests **placeholder** (Phase 2; no live implementation to test against).

### 3.7 `reports/`

**Source mix:** newly generated at promotion time. Same skeleton as RC-01 (BUILD, POST_IMPORT_AUDIT, KNOWN_GAPS).

### 3.8 `assets/`

**Source mix:** none planned.

### 3.9 What from old docs vs. what from n8n vs. what unclear vs. what history-only

- **From old docs (READABLE):** stage label and pipeline position (`README.md`); schema-level outbound writes (`db/README.md` rows on `direction`, `channel`, `source_channels`, and the Phase-2 detokenization policy).
- **From old docs (POTENTIAL — mount-locked, not inspected):** `n8n_Workflow_Mapping.md` (most likely source for MO-01 wiring); `Architecture_Spec_v3_Ucenicul.md` (envelope conventions, replay-guard policy); `Migration_Plan_Ucenicul.md` (channel-abstraction roadmap, langchain-stub disposition); all 8 `workflows/WF-*-01_*/README.md` (may mention MO-01 as downstream).
- **From n8n (LIVE):** the entire 18-node graph including channel-delivery context, replay-guard probe, lineage verification, delivery-request build, channel switch with `PLACEHOLDER`, outbound logging, delivery result.
- **Unclear (no source either way):** the channel-abstraction roadmap (which channels next? which abstraction surface?); the precise replay-guard semantics (probe outcome → action); the Phase-2 detokenization implementation owner (MO-01 itself, or a pre-MO-01 helper?).
- **History-only:** the DEPRECATED langchain stub (see Section 4).

---

## 4. DEPRECATED__WF-MO-01_langchain_stub — disposition

- **Promotion verdict:** **DO NOT PROMOTE.** The workflow is self-flagged DEPRECATED in its n8n display name, is `inactive`, and has only 4 nodes (Manual + Chat triggers feeding an AI Agent + OpenAI gpt-5-mini). It is not part of the runtime path.
- **Where it should be recorded once:** A single line in a `inventory/known_gaps.md` (or equivalent) documenting that this workflow exists in n8n purely as a historical stub, that it is not promoted, and that it can be considered for archival deletion in n8n once the disposition is approved.
- **Why it is recorded here:** so that a future discovery pass does not re-surface it as a candidate for promotion.

---

## 5. Authorization gates (what must be true before promotion proceeds)

This audit recommends the following gates be satisfied before any actual promotion is performed (the audit itself takes none of these actions):

1. **Authorization to create workflow folders** — a deliberate decision to add `workflows/WF-RC-01_Response_Composer/` and `workflows/WF-MO-01_Message_Out/` to the active index, recorded in `DECISIONS.md` or equivalent.
2. **Authorization to update `workflows/README.md`** — to add the two new active rows and describe their populated/scaffold state.
3. **Re-attempt mount reads** — try to Read `Module_Spec_Response.md`, `n8n_Workflow_Mapping.md`, `Architecture_Spec_v3_Ucenicul.md`, `Module_Registry_Ucenicul.md`, `Migration_Plan_Ucenicul.md`, and the 8 `workflows/WF-*-01_*/README.md` files. If any become readable, fold their content into the relevant subfolders per Sections 2.3 / 3.3.
4. **Re-fetch live n8n** — confirm the two workflows have not been edited since 2026-04-18 (or if they have, capture the new state for export).
5. **Decide on the disabled MO-01 handoff in WF-RC-01** — promotion should explicitly state whether to preserve the disabled state or open the gate. Default recommendation: preserve.
6. **Decide on the `MO_Send_Channel_PLACEHOLDER` node** — promotion should explicitly state that the channel abstraction is not finalized and that exporting the placeholder is intentional.
7. **Update `inventory/N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md`** — Sections D.12 / D.13 / E (rows 2, 9, 10) / H should be updated to reflect that the coverage gap is closed (in part), and the scores re-rendered.

None of these gates is satisfied by this audit. They are recorded so that the next agent has an explicit pre-promotion checklist.

---

## 6. Summary table

| Subfolder | WF-RC-01 source | WF-MO-01 source |
|---|---|---|
| `README.md` | synthesized + `Module_Spec_Response.md` (if readable) | synthesized + `n8n_Workflow_Mapping.md` (if readable) |
| `workflow/` | live n8n (`TClXgmO8H8zsSwMb`) | live n8n (`OooZdC0DgsDR6gm0`) |
| `docs/` | live n8n + mount-locked specs (if readable) | live n8n + mount-locked specs (if readable) |
| `sql/` | live n8n | live n8n |
| `scripts/` | live n8n | live n8n |
| `tests/` | new at promotion time | new at promotion time |
| `reports/` | new at promotion time | new at promotion time |
| `assets/` | (empty) | (empty) |

---

## 7. End-of-plan note

This plan is strictly a **specification of what would happen if promotion were authorized**. It performs no promotion itself. It does not create folders, does not export n8n JSON, does not write SQL, does not author tests. The downstream agent (or a future session in which the mount is fully readable) is expected to use this plan plus [`LEGACY_RC_MO_DISCOVERY_AUDIT.md`](./LEGACY_RC_MO_DISCOVERY_AUDIT.md) plus [`LEGACY_RC_MO_EVIDENCE_INDEX.json`](./LEGACY_RC_MO_EVIDENCE_INDEX.json) as the basis for the actual promotion work.
