# WORKFLOW_COVERAGE_AUDIT.md — Ucenicul vs n8n

> **Scope.** Consolidated, current-day coverage audit between live n8n state and the `workflows/` folder set in this repo. Combines the 2026-04-19 n8n fetch, the prior `N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md`, and the `LEGACY_WF_E2E_01_DISCOVERY.md` findings into a single decision surface.
>
> **Date of pass.** 2026-04-19 (re-verified against `search_workflows` at 18:45 UTC — no n8n changes since `N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md`).
>
> **Authority.** Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`. This audit does not modify n8n, does not modify any canonical spec, and does not edit any `workflows/` content. It proposes what to stage next.

---

## A. TL;DR

1. **n8n holds 14 workflows. The repo holds 8 scaffold folders.** Gap: **WF-RC-01 Response Composer** and **WF-MO-01 Message Out** are in n8n but missing in `workflows/`. Also undocumented in `workflows/`: the legacy monolith `brain_main_inbound_mvp_v6_preprocessor_fixed`, `WF-00 Morning Briefing` (active cron), and `WF-01 Message Receiver` (inactive).
2. **Every existing WF folder is scaffold (README only; empty `workflow/`, `sql/`, `scripts/`, `tests/`, `docs/`, `reports/`, `assets/`).** The live n8n counterparts carry 10–76 nodes each. The repo lags n8n by ~3 days of wiring.
3. **One naming drift.** `workflows/WF-SU-01_Sub_Workflow/` should be `workflows/WF-SU-01_State_Persistence_Updater/` per the live n8n name + role.
4. **Halted E2E session.** There is no WF-E2E-01 workflow in n8n, no spec in either Ucenicul or Ucenicul_old, and no legacy artifact to recover (see `LEGACY_WF_E2E_01_DISCOVERY.md`). What was halted is the **creation of end-to-end test scenarios under `testing/e2e/`** (empty placeholder). The halt state is "never started"; nothing to resume.
5. **Action proposal.** Create two missing WF folders (RC-01, MO-01), rename SU-01, add a monolith orientation doc, then populate every WF folder with the live n8n blueprint using a standardized per-.md template. Maintenance of the alignment is delegated to a persistent skill (`wf-sync`) described in `WORKFLOW_STANDARDIZATION_PLAN.md`.

## B. Live n8n state (2026-04-19 18:45 UTC)

Re-fetched via `search_workflows`. Identical to the 2026-04-19 12:30 UTC fetch in `N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md`. No new edits.

| # | n8n name | id | active | updatedAt (UTC) | triggers |
|---|---|---|---|---|---|
| 1 | brain_main_inbound_mvp_v6_preprocessor_fixed | DO0uAOBZOVHVumOW | yes | 2026-04-14 17:40 | 1 |
| 2 | WF-00 Morning Briefing | cD8aHWo34XWEixcy | yes | 2026-04-16 05:13 | 1 |
| 3 | WF-01: Message Receiver | 0SsP6OLY4LbOPmzG | **no** | 2026-04-18 09:24 | 1 |
| 4 | WF-TR-01 Thread Resolver | wI8hpSROxQI0zC9f | yes | 2026-04-18 12:20 | 1 |
| 5 | WF-EC-01 | v9jih4jqeXpOJOiH | yes | 2026-04-18 21:08 | 0 |
| 6 | WF-OR-01 | KhGmNpi0ZDmrnz8W | yes | 2026-04-18 12:20 | 1 |
| 7 | WF-PL-01 | RwToPLa1ErHl2tUi | yes | 2026-04-18 12:20 | 1 |
| 8 | WF-DI-01 | abqYINcXr3JAhGGk | yes | 2026-04-18 12:20 | 1 |
| 9 | WF-ME-01 Module Execution | uq26nh1grIpnHju0 | yes | 2026-04-18 12:20 | 1 |
| 10 | WF-RA-01 Result Aggregator | 5RcNLtxNjAHJsZPE | yes | 2026-04-18 12:20 | 0 |
| 11 | WF-SU-01 State / Persistence Updater | ENiYNfL3ul8AmmCB | yes | 2026-04-18 12:44 | 0 |
| 12 | WF-RC-01 Response Composer | TClXgmO8H8zsSwMb | yes | 2026-04-18 12:34 | 0 |
| 13 | WF-MO-01 Message Out / Output Gateway | OooZdC0DgsDR6gm0 | yes | 2026-04-18 11:20 | 0 |
| 14 | DEPRECATED__WF-MO-01_langchain_stub | rooFWDryqC0YDyVa | **no** | 2026-04-18 12:27 | 1 |

## C. Repo state (2026-04-19)

Reachable via Glob / ls on Ucenicul_old (structural twin of Ucenicul which is mount-locked for deep traversal in this session; folder set verified via `workflows/README.md`):

| Folder | Has n8n counterpart? | Populated? |
|---|---|---|
| `workflows/WF-DI-01_Dispatcher/` | yes (WF-DI-01) | scaffold |
| `workflows/WF-EC-01_Execution_Context/` | yes (WF-EC-01) | scaffold |
| `workflows/WF-ME-01_Module_Execution/` | yes (WF-ME-01) | scaffold |
| `workflows/WF-OR-01_Orchestrator/` | yes (WF-OR-01) | scaffold |
| `workflows/WF-PL-01_Plan_Generation/` | yes (WF-PL-01) | scaffold |
| `workflows/WF-RA-01_Result_Aggregator/` | yes (WF-RA-01) | scaffold |
| `workflows/WF-SU-01_Sub_Workflow/` | yes (WF-SU-01) — **naming drift** | scaffold |
| `workflows/WF-TR-01_Thread_Resolver/` | yes (WF-TR-01) | scaffold |
| `workflows/_ARCHIVED_Executor_Closer_stub/` | no (intentionally obsolete) | obsolete |

Missing folders (confirmed via `Glob **/*.md`):

- `workflows/WF-RC-01_Response_Composer/` — **absent**
- `workflows/WF-MO-01_Message_Out/` — **absent**
- `workflows/WF-00_Morning_Briefing/` or `docs/archive/WF-00_Morning_Briefing.md` — **absent**
- `workflows/WF-01_Message_Receiver/` or `docs/archive/WF-01_Message_Receiver.md` — **absent**
- Monolith orientation (`docs/archive/brain_main_monolith_orientation.md` or equivalent) — **absent**

Standard folder skeleton (per `workflows/README.md`): `workflow/`, `docs/`, `sql/`, `scripts/`, `tests/`, `reports/`, `assets/`, plus `README.md`.

## D. Coverage gap matrix

| Gap category | Items | Severity | Proposed action |
|---|---|---|---|
| Missing target-stage folder | WF-RC-01, WF-MO-01 | HIGH | Create folders with standard skeleton; stage blueprint from live n8n |
| Naming drift | WF-SU-01_Sub_Workflow → WF-SU-01_State_Persistence_Updater | MEDIUM | **STAGED** — see `inventory/staged_rename_su01/STAGED_RENAME_MANIFEST.md` (PowerShell steps). Rename + two README updates + FINAL_CANONICAL_BASELINE.md line already corrected. |
| Monolith undocumented | `brain_main_inbound_mvp_v6_preprocessor_fixed` | HIGH | Add `docs/archive/brain_main_monolith_orientation.md` with node inventory + cutover link |
| Active cron undocumented | WF-00 Morning Briefing | MEDIUM | Add `workflows/WF-00_Morning_Briefing/` (cron is operational-critical) |
| Inactive receiver undocumented | WF-01 Message Receiver | LOW | Either document as "frozen — pending decision" or flag for deletion in n8n |
| Scaffold vs populated | All 8 existing + 2 new | MEDIUM-HIGH | Populate per §F of this document |
| Module registry drift | `improvement` module in n8n has no `Module_Spec_Improvement.md`; `Module_Spec_Response.md` has no module registry row (role split between module + stage WF-RC-01) | MEDIUM | Reconcile: either add `Module_Spec_Improvement.md` or remove from n8n registry; clarify response scope in `Module_Registry_Ucenicul.md` |
| ME-01 completeness | Only `task` branch wired in n8n; `reminder`/`memory`/`improvement`/`watcher_basic` branches absent | MEDIUM | Track in `workflows/WF-ME-01_Module_Execution/reports/MODULE_COMPLETENESS.md` |
| Misleading n8n description | WF-EC-01 description says "adauga timestamp" | LOW | Fix n8n `meta.description` to describe Execution Context init |
| Disabled RC→MO handoff | WF-RC-01 has disabled MO-01 handoff nodes | MEDIUM | Document in `workflows/WF-RC-01_Response_Composer/reports/PENDING_WIRING.md` |
| PLACEHOLDER Telegram node | `MO_Send_Channel_PLACEHOLDER` in WF-MO-01 | LOW-MEDIUM | Document channel-abstraction plan in WF-MO-01 folder |

## E. Halted E2E test session — investigation result

Per `LEGACY_WF_E2E_01_DISCOVERY.md` (Section A–G):

1. **No WF-E2E-01 workflow exists in n8n.** `search_workflows` confirms 14 workflows, none carry E2E prefix.
2. **No `WF-E2E-01` spec, plan, or reference exists in Ucenicul, Ucenicul_old, or any readable doc.** Grep across both repos returns a single hit: `testing/README.md:7:- e2e/ — end-to-end scenarios (placeholder)`.
3. **`testing/e2e/` is an empty directory in both repos.** No fixtures, no scenarios, no results.
4. **Conclusion on "halted E2E session":** there is no state to resume. What was started and halted is **the intent to populate `testing/e2e/` with end-to-end scenarios** — not a partially-built WF-E2E-01 workflow. The halt is pre-state.
5. **Resumption plan (when desired):** the logical E2E scenario set covers the full target pipeline `Message In → WF-TR-01 → WF-EC-01 → WF-OR-01 → WF-PL-01 → WF-DI-01 → WF-ME-01 → WF-RA-01 → WF-SU-01 → WF-RC-01 → WF-MO-01 → Message Out`. Each scenario asserts (a) envelope correctness per step, (b) idempotency, (c) allowed_next_stage transitions, (d) final SHA256 digest consistency. A baseline fixture (`testing/fixtures/setup_test_data.sql`, 5720 B) exists in Ucenicul_old but is mount-locked; content has to be copied once staging is possible. See §F.E2E in this document for the scaffold proposal.

## F. What must be staged (and in what order)

All actions are additions or renames inside the repo. No n8n changes. The list below drives the staging in `inventory/staged_canonical_v2/` (next pass).

### F.1 Create missing WF folders

- `workflows/WF-RC-01_Response_Composer/` — standard skeleton + README + pending-wiring report
- `workflows/WF-MO-01_Message_Out/` — standard skeleton + README + channel-placeholder report
- `workflows/WF-00_Morning_Briefing/` — standard skeleton + README (cron workflow)

### F.2 Rename SU-01

- Rename `workflows/WF-SU-01_Sub_Workflow/` → `workflows/WF-SU-01_State_Persistence_Updater/`
- Update `workflows/README.md` active-index row
- Update any stale references (search: `WF-SU-01_Sub_Workflow`)

### F.3 Populate 8 existing + 2 new WF folders from live n8n

For each of WF-TR-01, WF-EC-01, WF-OR-01, WF-PL-01, WF-DI-01, WF-ME-01, WF-RA-01, WF-SU-01, WF-RC-01, WF-MO-01:

- Export live n8n blueprint → `workflow/<WF-CODE>_blueprint.json`
- Generate node map → `docs/node_map.md`
- Carry envelope contract → `docs/contract.md` (input shape, output shape, `allowed_next_stage`)
- Copy SQL → `sql/` (node-extracted Postgres statements)
- Copy code-node scripts → `scripts/`
- Stub tests → `tests/`
- Stub reports → `reports/` (AUDIT, BUILD, FIX_LOG templates empty)
- README updated with status (`scaffold` → `populated`)

### F.4 Monolith orientation

`docs/archive/brain_main_monolith_orientation.md`:

- Why the monolith exists
- Node inventory (high-level — the Telegram → Normalize → Privacy Gate → Brain → Switch-by-intent → branches → response chain)
- Cutover pointer to `docs/migration/Migration_Plan_Ucenicul.md`
- Deprecation milestone (when the 10 modular WF-* workflows can fully replace it)

### F.5 E2E scaffold

- `testing/e2e/README.md` — scope + scenario catalog table
- `testing/e2e/scenarios/` — placeholder
- `testing/e2e/fixtures/` — symlink or copy of `testing/fixtures/setup_test_data.sql`
- `testing/e2e/runner/README.md` — how to run (n8n executor vs local harness)

### F.6 Cleanup

- Remove stray `STAGED_PLACEMENT_MANIFEST.md` from repo root (side-effect of prior PowerShell copy; not canonical)
- Remove write-probe `inventory/_test_write.tmp` and `.write_probe_tmp` if mount permits

## G. What changes require only documentation (no n8n touch)

All of §F except (a) changing n8n `meta.description` on WF-EC-01 and (b) wiring RC→MO handoff. Those two are n8n-side operations and are deliberately not proposed here.

## H. Scores (unchanged from `N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md` §F)

| Dimension | Score | Projected after §F applied |
|---|---|---|
| Alignment (content-level, for both sides) | 4 / 10 | 8 / 10 |
| Coverage (n8n workflows with repo folder + spec) | 5 / 10 | 9 / 10 |
| Recency (docs↔reality) | 3 / 10 | 8 / 10 |

Scores rise sharply because §F is mostly staging the already-known n8n content into the already-known repo skeleton. It is not a redesign.

## I. Companion files

- `inventory/N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md` — the upstream detailed audit (329 lines).
- `inventory/LEGACY_WF_E2E_01_DISCOVERY.md` — the E2E halt investigation.
- `inventory/LEGACY_RC_MO_DISCOVERY_AUDIT.md` + `inventory/LEGACY_RC_MO_PROMOTION_PLAN.md` — upstream discovery of RC/MO legacy content for the new folders.
- `inventory/UPLOADED_FILES_EVALUATION.md` — where the canonical specs came from.
- `inventory/WORKFLOW_STANDARDIZATION_PLAN.md` (**next document in this pack**) — per-.md templates and maintenance skills.

---

> **Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-19.
