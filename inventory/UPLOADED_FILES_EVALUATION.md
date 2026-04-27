# Uploaded Files Evaluation — 2026-04-19

> **Scope.** Evaluate each of the 18 files uploaded by the user in this session, decide whether each one is useful for the current Ucenicul repo, identify the destination (if useful), and record the rationale (if not).
>
> **Method.** Every upload was read in full. Each destination was checked against the canonical layout declared in `FINAL_CANONICAL_BASELINE.md` §6 and `CANONICAL_ENTRYPOINTS.md` §3. Where the canonical target path is mount-locked in this session, existence is confirmed from the FINAL_CANONICAL_BASELINE inventory plus direct `stat` probes; byte sizes are compared where possible.
>
> **Authority reminder.** Level-1 canonical = `docs/architecture/Architecture_Spec_v3_Ucenicul.md` > `docs/migration/Migration_Plan_Ucenicul.md` > Level-2 specs > `CLAUDE.md` > `README.md`. See `CANONICAL_ENTRYPOINTS.md` §2.

---

## A. Executive summary

| # | Upload filename | Verdict | Canonical destination | Status of destination |
|---|---|---|---|---|
| 1 | `Architecture_Spec_v3_Ucenicul.md` | **USEFUL — authoritative source** | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` | Exists in repo (mount-locked); size match 36189 B |
| 2 | `Migration_Plan_Ucenicul.md` | **USEFUL — authoritative source** | `docs/migration/Migration_Plan_Ucenicul.md` | Exists (mount-locked); size 12536 B |
| 3 | `n8n_Workflow_Mapping.md` | **USEFUL — authoritative source** | `docs/architecture/n8n_Workflow_Mapping.md` | Exists (mount-locked); size 9849 B |
| 4 | `Module_Registry_Ucenicul.md` | **USEFUL — authoritative source** | `docs/architecture/Module_Registry_Ucenicul.md` | Exists (mount-locked); size 7433 B |
| 5 | `Thread_Resolution_Spec.md` | **USEFUL — authoritative source** | `docs/architecture/Thread_Resolution_Spec.md` | Exists (mount-locked); size 13305 B |
| 6 | `Memory_Model_Spec.md` | **USEFUL — authoritative source** | `docs/architecture/Memory_Model_Spec.md` | Exists (mount-locked); size 5029 B |
| 7 | `Documentation_Verification_Checklist_Ucenicul.md` | **USEFUL — authoritative source** | `docs/operations/Documentation_Verification_Checklist_Ucenicul.md` | Exists (mount-locked); size 10378 B |
| 8 | `db_README.md` | **USEFUL — authoritative source** (rename required) | `db/README.md` | Exists (mount-locked); size 9743 B — **byte-identical** |
| 9 | `db_schema_README.md` | **USEFUL — authoritative source** (rename required) | `db/schema/README.md` | Exists (mount-locked); size 2252 B |
| 10 | `repo_root_README.md` | **USEFUL — authoritative source** (rename required) | `README.md` (repo root) | Exists (visible); size 3182 B — **byte-identical, same mtime** |
| 11 | `README.md` (758 B, 2026-04-18) | **NOT USEFUL** for canonical baseline | n/a | Rationale in §C.11 |
| 12 | `README-cc749849.md` | **NOT USEFUL** for canonical baseline | n/a | Rationale in §C.12 |
| 13 | `README-5e578c8b.md` | **NOT USEFUL** for canonical baseline | n/a | Rationale in §C.13 |
| 14 | `handoff_hardened_README.md` | **CONDITIONALLY USEFUL** — historical only | `archive/legacy_docs/ucenicul_claude_handoff_hardened/README.md` | Archive folder exists; sub-path mount-locked |
| 15 | `00_ROUTE_MAP__generic_root.md` | **CONDITIONALLY USEFUL** — historical only | `archive/legacy_docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP.md` | Same as #14 |
| 16 | `09_REPORT_TEMPLATES.md` | **USEFUL** as live template **or** historical archive | `.claude/pipelines/ucenicul-pipeline/REPORT_TEMPLATES.md` (live) **OR** `archive/legacy_docs/ucenicul_claude_handoff_hardened/09_REPORT_TEMPLATES.md` (archival) | Pipeline folder exists (currently empty per prior audit); decision required |
| 17 | `10_FILE_SCORECARD.md` | **NOT USEFUL** for canonical baseline | `archive/legacy_docs/ucenicul_claude_handoff_hardened/10_FILE_SCORECARD.md` (archive only if desired) | Rationale in §C.17 |
| 18 | `15_STAGE_TEMPLATE.md` | **USEFUL** as live template **or** historical archive | `.claude/pipelines/ucenicul-pipeline/STAGE_TEMPLATE.md` (live) **OR** `archive/legacy_docs/ucenicul_claude_handoff_hardened/15_STAGE_TEMPLATE.md` (archival) | Same consideration as #16 |

**Tally.** 10 uploads are authoritative canonical sources (rows 1–10). 3 uploads are conditionally useful as historical/template archives (rows 14, 16, 18). 1 upload is conditionally archival (row 15). 4 uploads are not useful for the current baseline (rows 11, 12, 13, 17).

---

## B. Why the "authoritative source" label matters

For rows 1–10, the uploaded content either exactly matches the declared canonical destination (confirmed by size for rows 8 and 10) or matches the 2026-04-15 canonical-baseline timestamp and carries the Level-1/Level-2 canonicality headers the baseline requires. Because many of these destinations are mount-locked in this session, I cannot fully compare file contents byte-for-byte — but the metadata and content audit together justify treating the uploads as the canonical source.

**Recommended action for rows 1–10.** Treat the upload as the authoritative copy. If a future session can confirm the mount-locked repo copy diverges from the upload, the upload wins (unless a later commit has legitimately superseded it). No immediate write is required because the canonical baseline already declares the repo copies to be accepted.

---

## C. Per-file rationale (detailed)

### C.1 `Architecture_Spec_v3_Ucenicul.md` — USEFUL

- **Size:** 36189 bytes. **Modified:** 2026-04-15 20:26. **Canonicality:** LEVEL 1 — HIGHEST (repo authority hierarchy).
- **Destination:** `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.
- **Repo state:** Declared as the top-of-hierarchy file in `FINAL_CANONICAL_BASELINE.md` §5 and `CLAUDE.md` (old Ucenicul_old).
- **Why keep.** This is the single source of truth for the whole system. Every subordinate doc cites it. Without it, the hierarchy is unrooted.
- **Action if repo copy is missing/corrupted.** Place the upload at the destination verbatim.

### C.2 `Migration_Plan_Ucenicul.md` — USEFUL

- **Size:** 12536 bytes. **Modified:** 2026-04-15 20:27. **Canonicality:** LEVEL 1 — migration truth.
- **Destination:** `docs/migration/Migration_Plan_Ucenicul.md`.
- **Why keep.** #2 in the authority hierarchy; contains Preserve / Refactor / Deprecate / Archive / Delete classification + phase cutover order. Required by `CANONICAL_ENTRYPOINTS.md` §3.5.

### C.3 `n8n_Workflow_Mapping.md` — USEFUL

- **Size:** 9849 bytes. **Modified:** 2026-04-15 20:32. **Canonicality:** LEVEL 2 — CANONICAL SUBORDINATE.
- **Destination:** `docs/architecture/n8n_Workflow_Mapping.md`.
- **Why keep.** Defines the 19-step target-state modular mapping, node ownership, contracts, and the canonical PostgreSQL query policy (§5). Authoritative for any n8n build or audit question.

### C.4 `Module_Registry_Ucenicul.md` — USEFUL

- **Size:** 7433 bytes. **Modified:** 2026-04-15 20:28. **Canonicality:** LEVEL 2.
- **Destination:** `docs/architecture/Module_Registry_Ucenicul.md`.
- **Why keep.** The single registry of which modules exist, their contracts, read/write scopes, and activation rules. Required by `CANONICAL_ENTRYPOINTS.md` §3.2.

### C.5 `Thread_Resolution_Spec.md` — USEFUL

- **Size:** 13305 bytes. **Modified:** 2026-04-15 23:04 (**v2.0** per file header — D-16 latent-reopen split and D-18 ambiguity minimum included). **Canonicality:** LEVEL 2.
- **Destination:** `docs/architecture/Thread_Resolution_Spec.md`.
- **Why keep.** The thread-resolution algorithm with the two critical bug fixes (D-16, D-18) and Romanian-aware semantic matching. Required by WF-TR-01.

### C.6 `Memory_Model_Spec.md` — USEFUL

- **Size:** 5029 bytes. **Modified:** 2026-04-15 20:30. **Canonicality:** LEVEL 2.
- **Destination:** `docs/architecture/Memory_Model_Spec.md`.
- **Why keep.** Three-tier memory model (Working / Recent Episodic / Long-term), promotion rules, inference safety rules, observation → pattern rules. Authoritative for memory_module.

### C.7 `Documentation_Verification_Checklist_Ucenicul.md` — USEFUL

- **Size:** 10378 bytes. **Modified:** 2026-04-15 20:35. **Canonicality:** LEVEL 2.
- **Destination:** `docs/operations/Documentation_Verification_Checklist_Ucenicul.md`.
- **Why keep.** Declared canonical in `FINAL_CANONICAL_BASELINE.md` §6. Provides the pass/fail checklist used by the 2026-04-15 baseline.
- **Note.** Its File Status Table references the older `docs/*` layout (no architecture/ or migration/ subfolders). That is historical drift; the doc's checklist content remains authoritative, and destination mapping follows the current `docs/architecture/…`, `docs/migration/…` layout declared in `FINAL_CANONICAL_BASELINE.md` §6.

### C.8 `db_README.md` — USEFUL (rename required)

- **Size:** 9743 bytes. **Modified:** 2026-04-15 20:33. **Canonicality:** LEVEL 3.
- **Destination:** `db/README.md` (NOTE: upload has `_` underscore; destination uses a path separator `/`).
- **Repo state:** `stat` confirms `db/README.md` exists in the repo at exactly 9743 bytes — **byte-identical to the upload**. This is a confident match.
- **Action.** If the repo copy is ever lost, use the upload verbatim. No merge needed.

### C.9 `db_schema_README.md` — USEFUL (rename required)

- **Size:** 2252 bytes. **Modified:** 2026-04-15 20:34. **Canonicality:** LEVEL 3.
- **Destination:** `db/schema/README.md` (rename pattern same as #8).
- **Repo state:** Declared canonical in `FINAL_CANONICAL_BASELINE.md` §6. Directly mount-locked in this session.
- **Action.** Authoritative source for the schema quick-reference doc.

### C.10 `repo_root_README.md` — USEFUL (rename required)

- **Size:** 3182 bytes. **Modified:** 2026-04-15 20:32. **Canonicality:** LEVEL 3.
- **Destination:** `README.md` at repo root (NOTE: rename from `repo_root_README.md` → `README.md`).
- **Repo state:** The existing `README.md` at repo root is **3182 bytes, modified 2026-04-15 20:32** — byte-size and mtime both match the upload. This is the same file.
- **Action.** No action needed; the repo already holds this file in the canonical location. Keep the upload as a recoverable backup.

### C.11 `README.md` (758 bytes, 2026-04-18) — NOT USEFUL

- **Content summary.** Three short bullets describing a folder `common/shared_reports/` containing `Documentation_Verification_Checklist_Ucenicul.md`, `09_REPORT_TEMPLATES.md`, `15_STAGE_TEMPLATE.md`, with a note that "Workflow-specific rendered reports live under `workflows/WF-XX-01/reports/`".
- **Why not useful.** It describes a `common/shared_reports/` folder that does **not** exist in the current canonical layout (`FINAL_CANONICAL_BASELINE.md` §6 places these files under `docs/operations/` and under the `archive/legacy_docs/ucenicul_claude_handoff_hardened/` historical bucket). Adopting it would introduce a competing organization scheme and contradict the accepted baseline.
- **Disposition.** Do not import into the canonical baseline. If needed as a historical breadcrumb, it can be placed at `archive/legacy_docs/handoff_reorg_proposal/shared_reports_README.md` — but this is optional and adds no authority.

### C.12 `README-cc749849.md` — NOT USEFUL

- **Content summary.** Describes a flat `common/architecture/` folder that copies the Level-1/Level-2 specs byte-for-byte from `docs/`. Explicitly states "This reorganized copy does not change [the authority hierarchy]".
- **Why not useful.** The current canonical layout is `docs/architecture/…` not `common/architecture/…`. This README belongs to an alternative, never-adopted flat reorganization. Importing it would create confusing duplicate navigation.
- **Disposition.** Do not import.

### C.13 `README-5e578c8b.md` — NOT USEFUL

- **Content summary.** Describes a `common/historical_reference/` folder collecting `repo_root_README.md`, `handoff_hardened_README.md`, `10_FILE_SCORECARD.md`, `00_ROUTE_MAP__generic_root.md`.
- **Why not useful.** Same reason as #11 and #12 — belongs to an unaccepted flat reorganization with a `common/…` top-level folder that does not exist in the current canonical baseline.
- **Disposition.** Do not import. The historical-reference bucket the current repo uses is `archive/legacy_docs/` — see rows 14–18 for placement of the underlying historical files.

### C.14 `handoff_hardened_README.md` — CONDITIONALLY USEFUL (historical)

- **Size:** 3868 bytes. **Modified:** 2026-04-17 03:07. **Canonicality:** LEVEL 4 — historical operational pack.
- **Content.** README for the "Ucenicul Claude Handoff — Hardened Runtime Pack" that drove unattended stage-execution during the WF-EC-01 era. Lists the 21-file read order and the core operational rules.
- **Repo relevance.** The rules it encodes (no SDK rabbit hole, stage lock, runtime proof required, 10/10 gate) are still philosophically aligned with the current baseline, but the active-stage target (WF-EC-01) is **now closed** per the 2026-04-18 route map (see row 15). The pack itself is historical.
- **Destination (if imported).** `archive/legacy_docs/ucenicul_claude_handoff_hardened/README.md`. The `archive/legacy_docs/` folder exists in the current repo; the `ucenicul_claude_handoff_hardened/` subfolder is not visible via `find` in this session (mount-lock) but is compatible with the archive structure.
- **Disposition.** Archive only. Never promote to Level 1/2/3.

### C.15 `00_ROUTE_MAP__generic_root.md` — CONDITIONALLY USEFUL (historical)

- **Size:** 3266 bytes. **Modified:** 2026-04-18 00:16. **Canonicality:** LEVEL 4 — historical route-map snapshot.
- **Content.** Records: TR, EC, OR, PL, DI, ME — CLOSED; RA — NEXT CANDIDATE; SU, RC — PLANNED. Includes runtime execution IDs (WF-DI-01: execs 716–720; WF-ME-01: execs 729–733) and canonical design patterns (chat-input adapter, cross-Postgres reference, n8n switch-node shape at typeVersion 3.2, cross-tenant isolation gate).
- **Repo relevance.** The evidence in this file is **historically valuable** — it documents the specific live-runtime proofs that closed each stage. These would be difficult/impossible to reconstruct. The design patterns captured here (especially the switch-node typeVersion 3.2 rule and the cross-tenant isolation gate) are usable operational knowledge.
- **Destination (if imported).** `archive/legacy_docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP.md`.
- **Disposition.** **Archive recommended** — preserves the runtime evidence trail. Do not use as authoritative architecture (the canonical spec is in `docs/architecture/`).

### C.16 `09_REPORT_TEMPLATES.md` — USEFUL (live template or archive)

- **Size:** 3033 bytes. **Modified:** 2026-04-17 03:07. **Canonicality:** LEVEL 4 historical — but template content is reusable.
- **Content.** Full template schemas for `BUILD_REPORT.md`, `AUDIT_REPORT.md`, `FIX_LOG.md`, `CLOSURE_REPORT.md`. Fields include: attempt identity, objective, live starting state, changes, artifacts, fixture ledger, tooling notes, verification matrix, next executable action, evidence classification, conflict log, recovery status, snapshot IDs.
- **Repo relevance.** These templates are substantively useful for any future stage work. They enforce discipline (evidence-first, blocker-aware, next-executable-action).
- **Destination options.**
  - **Live (preferred if future stage work is expected):** `.claude/pipelines/ucenicul-pipeline/REPORT_TEMPLATES.md` — the pipeline folder exists in the repo (currently empty per prior discovery audit); placing the templates there makes them a live, discoverable asset.
  - **Archival (if no future stage work):** `archive/legacy_docs/ucenicul_claude_handoff_hardened/09_REPORT_TEMPLATES.md`.
- **Disposition.** **Import recommended** — pick one of the two destinations depending on whether new stage work is expected post-baseline.

### C.17 `10_FILE_SCORECARD.md` — NOT USEFUL

- **Size:** 3926 bytes. **Modified:** 2026-04-17 03:07. **Canonicality:** LEVEL 4 internal self-audit.
- **Content.** A 10.0/10.0 self-score for each of the 29 files in the 2026-04-17 handoff pack, with per-file "acceptance notes" like "Strong entrypoint, correct read order".
- **Why not useful.** This is a point-in-time self-assessment of a no-longer-active handoff pack. It has no instructional value for future work — every row just says "10.0". The final "honesty rule" at the bottom ("live truth wins") is already encoded more precisely in the current canonical docs.
- **Disposition.** Do not import as authoritative. Optional: archive at `archive/legacy_docs/ucenicul_claude_handoff_hardened/10_FILE_SCORECARD.md` if the complete handoff pack is being preserved as a historical unit. Standalone it adds nothing.

### C.18 `15_STAGE_TEMPLATE.md` — USEFUL (live template or archive)

- **Size:** 3826 bytes. **Modified:** 2026-04-17 03:07. **Canonicality:** LEVEL 4 historical — template content reusable.
- **Content.** A complete stage-file scaffold: stage identity, workflow-shell policy (preserve, never delete), input/output contracts, required DB side effects, DB-blocked fallback (create `_claude_mcp` parallel), blocked-workflow-write fallback, recommended node layout, V1–V6 validation matrix (shell integrity, input validation, happy path, replay/idempotency, cross-tenant isolation, upstream smoke), required reports, blocker-output requirements, completion criteria.
- **Repo relevance.** Structurally identical in spirit to the per-workflow READMEs declared at `workflows/WF-<CODE>-01_<Name>/README.md`. This template is directly reusable for any new WF-xx-01 folder or for re-opening a closed stage.
- **Destination options.**
  - **Live (preferred):** `.claude/pipelines/ucenicul-pipeline/STAGE_TEMPLATE.md` — same reasoning as #16.
  - **Archival:** `archive/legacy_docs/ucenicul_claude_handoff_hardened/15_STAGE_TEMPLATE.md`.
- **Disposition.** **Import recommended** — especially as a live template if any new workflow is planned.

---

## D. Proposed batched action plan

If the user wants to actually place these files, the recommended sequence is:

1. **Confirm mount-locked paths.** Before overwriting any of rows 1–10, ensure the repo copy is missing or outdated. If the mount-lock is the only obstacle (as in this session), no write is needed — the baseline already declares the repo to be correct.
2. **Rows 11–13 — skip entirely.** Do not import the three alternative-reorganization READMEs.
3. **Row 17 — skip unless archiving the whole handoff pack.** The scorecard adds nothing standalone.
4. **Rows 14, 15, 16, 18 — decide once.** Either:
   - *Path A (preserve as historical unit):* place all four under `archive/legacy_docs/ucenicul_claude_handoff_hardened/` alongside row 17.
   - *Path B (promote templates, archive the rest):* place rows 16 and 18 under `.claude/pipelines/ucenicul-pipeline/` as live templates; place rows 14 and 15 under `archive/legacy_docs/ucenicul_claude_handoff_hardened/`; leave row 17 out.

I did **not** write any of these files into the repo as part of producing this evaluation. No destinations were modified. The report records the decisions only.

---

## E. What I did NOT do

- Did not overwrite any file in `docs/architecture/`, `docs/migration/`, `docs/operations/`, `db/`, or `workflows/`.
- Did not create any new folder under `archive/legacy_docs/` or `.claude/pipelines/ucenicul-pipeline/`.
- Did not modify `README.md`, `CLAUDE.md`, `FINAL_CANONICAL_BASELINE.md`, `CANONICAL_ENTRYPOINTS.md`, or any of the HOT/COLD context files.
- Did not add rows to `workflows/README.md` or to `PROJECT_MASTER.md`.
- Did not inspect or modify any `.git` metadata.

---

## F. Companion artifacts

This report lives at `inventory/UPLOADED_FILES_EVALUATION.md`. Its evidence surface is: the 18 upload files under `/sessions/.../mnt/uploads/`, `FINAL_CANONICAL_BASELINE.md`, `CANONICAL_ENTRYPOINTS.md`, and the in-session `stat`/`find` metadata probes documented in §A.

> **Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.** Version: 1.0 | Written: 2026-04-19.
