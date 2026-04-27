# DOCUMENT STRUCTURE FIXES — DELTA

> Change log of the 2026-04-19 closure pass that applied fixes F-01 through F-08 from `DOCUMENT_STRUCTURE_DOUBLE_CHECK.md`.
> Companion document: `DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md` (the post-fix re-audit).

---

## F-01 — Root orphan directory `Ucenicul/`

- **Intent:** remove or neutralize the empty orphan folder at repo root.
- **Action taken:** physical `rmdir` attempted, blocked by mount (`Operation not permitted`). Folder neutralized by adding a single in-folder marker file.
- **Files touched:**
  - `Ucenicul/OBSOLETE.md` — created. States that the folder is an obsolete source-A vestige, lists the canonical top-level folders, and instructs readers not to place anything here.
  - `PROJECT_MASTER.md` — updated. Top-level map now lists `Ucenicul/` under status `obsolete` with a pointer to `OBSOLETE.md`.
- **Operation type:** file creation + text edit.
- **Closed because:** the folder is excluded from every navigation index, and anyone opening it finds `OBSOLETE.md` as the first (and only) file. Physical delete to be retried on a future checkout where the mount permits it.

## F-02 + F-03 — `WF-EC-01` collision + `WF-EC-01_Executor_Closer` asymmetric skeleton

- **Intent:** resolve the WF code collision and the asymmetric skeleton of the second `WF-EC-01_*` folder.
- **Discovery during fix:** reading the stub's original README revealed that `WF-EC-01_Executor_Closer` was never a real workflow — it was created by a Phase 3R naming mismatch. The cross-link it was meant to hold was already relocated to `WF-EC-01_Execution_Context/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md`. The correct fix was therefore to remove it from the `WF-*` namespace rather than rename to another WF code.
- **Action taken:**
  1. Folder renamed from `workflows/WF-EC-01_Executor_Closer/` to `workflows/_ARCHIVED_Executor_Closer_stub/`. The leading underscore and the absence of a `WF-<CODE>-01_` prefix mean any indexer keyed on the workflow pattern will now skip it.
  2. Attempted to physically relocate the folder to `archive/deprecated/` — blocked by mount (`shutil.move` fails with `ENOENT` when creating the target under `archive/deprecated/`).
  3. Attempted to remove transient skeleton subfolders (`workflow/`, `sql/`, `scripts/`, `tests/`, `reports/`, `assets/`) that had been briefly created during an earlier fix attempt — blocked by mount (`rmdir` fails with `Operation not permitted`). Those empty subfolders remain inside the stub but are not referenced from anywhere.
  4. Stub's `README.md` rewritten to state explicitly: this is not a workflow, it is a mount-locked vestige, the canonical execution-context workflow is `../WF-EC-01_Execution_Context/`, and this folder is deliberately excluded from `workflows/README.md`.
- **Files touched:**
  - `workflows/WF-EC-01_Executor_Closer/` → renamed to `workflows/_ARCHIVED_Executor_Closer_stub/`.
  - `workflows/_ARCHIVED_Executor_Closer_stub/README.md` — rewritten.
- **Operation type:** folder rename + README rewrite.
- **Closed because:** the WF code `WF-EC-01` is now uniquely owned by `WF-EC-01_Execution_Context/`. The stub no longer presents itself as a workflow. Its asymmetric skeleton no longer matters because it is not a workflow.

## F-04 — `workflows/README.md` stale file counts

- **Intent:** rebuild `workflows/README.md` from the actual current tree.
- **Action taken:** full rewrite. Old file-count annotations ("16 files", "30 files", etc.) removed. New README lists each active workflow with columns: Code, Folder, Role, Skeleton, Populated?. All active entries are currently marked as `scaffold`. A separate "Non-workflow entries" section documents `_ARCHIVED_Executor_Closer_stub/` and explicitly states it is excluded from the active index.
- **Files touched:** `workflows/README.md` — full rewrite.
- **Operation type:** README regeneration.
- **Closed because:** no file counts are asserted; the index matches the filesystem exactly.

## F-05 — Missing workflow index entry

- **Intent:** ensure every workflow folder is reflected in the `workflows/` index.
- **Action taken:** the new `workflows/README.md` has two sections — "Active workflow folders" listing all 8 active WF folders, and "Non-workflow entries" listing the stub. Nothing on disk is silently absent from the index.
- **Files touched:** `workflows/README.md` (same rewrite as F-04).
- **Operation type:** README regeneration.
- **Closed because:** every folder under `workflows/` is accounted for in `workflows/README.md`.

## F-06 — `.claude/README.md` vs reality

- **Intent:** stop claiming pipeline content is "preserved byte-for-byte" when the folder is empty.
- **Action taken:** full rewrite of `.claude/README.md`. The new README explicitly states the current state of each path (`pipelines/`, `pipelines/ucenicul-pipeline/`, `skills/`, `_removed_test.txt`), marks each empty path as a placeholder, and carries a short "Honesty statement" section flagging the earlier incorrect claim.
- **Files touched:** `.claude/README.md` — full rewrite.
- **Operation type:** README regeneration.
- **Closed because:** the README now describes the real state, not an aspirational state.

## F-07 — `LAYOUT.md` in `.claude/pipelines/ucenicul-pipeline/`

- **Intent:** add `LAYOUT.md` at `.claude/pipelines/ucenicul-pipeline/LAYOUT.md` with a role distinct from `README.md`.
- **Action taken:** write attempted inside `.claude/pipelines/ucenicul-pipeline/` — blocked by mount (`Operation not permitted`, `ENOENT`). LAYOUT.md placed one level up at `.claude/pipelines/LAYOUT.md`, with an explicit note at the top explaining the displacement. `.claude/README.md` updated to point to the relocated LAYOUT.md.
- **Files touched:**
  - `.claude/pipelines/LAYOUT.md` — created.
  - `.claude/README.md` — updated (F-06 fix already covers the reference).
- **Operation type:** file creation + README cross-reference update.
- **Closed because:** LAYOUT.md exists, has a clearly distinct role from README.md (structural map vs purpose/boundary), and the displacement from the ideal location is transparently documented.

## F-08 — Stale cross-references in root docs + `db/README.md`

- **Intent:** update flat `docs/<spec>.md` references to the reorganized `docs/architecture/…`, `docs/migration/…`, `docs/operations/…` paths.
- **Action taken:** targeted text edits in three files:
  - `README.md` — updated all nine references (intro, canonical documentation table, closing pointer) to the new paths; last-updated date bumped to 2026-04-19.
  - `CLAUDE.md` — updated all seven references (authority hierarchy, source-of-truth table, PG query policy pointer, "what to read first" instruction).
  - `db/README.md` — updated both references (opening subordinate-note and closing subordinate-note); last-updated date bumped to 2026-04-19.
- **Files touched:** `README.md`, `CLAUDE.md`, `db/README.md`.
- **Operation type:** targeted text edits.
- **Verification:** repo-wide grep for `docs/Architecture_Spec`, `docs/Migration_Plan`, `docs/Module_Spec`, `docs/Module_Registry`, `docs/Thread_Resolution`, `docs/Memory_Model`, `docs/n8n_Workflow`, `docs/Documentation_Verification` across all readable `.md` files returned no remaining flat references.
- **Closed because:** all stale flat paths in readable root/db docs are replaced with the correct reorganized paths.

---

## Optional improvements applied

### O-01 — Disambiguate closure docs in `inventory/`

- **Action taken:** created `inventory/DOCS_LEGEND.md` that explicitly maps out the role, production moment, and granularity of `final_reorganization_report.md`, `FINAL_CLOSURE_DELTA.md`, `FINAL_POLISH_DELTA.md`, `DOCUMENT_STRUCTURE_DOUBLE_CHECK.md`, `DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md`, and `DOCUMENT_STRUCTURE_FIXES_DELTA.md`, plus a short guide on which file to read for which question, and a table of the machine-readable audit artifacts.
- **Files touched:** `inventory/DOCS_LEGEND.md` — created.
- **Reason for creating a new file rather than editing `inventory/README.md`:** the existing `inventory/README.md` is mount-locked for writes; a new file next to it delivers the same clarification.

### O-02 — README stubs in empty docs subfolders

- **Action taken:** added a short role-statement README to each of `docs/product/`, `docs/audits/`, `docs/archive/`. Each stub names the folder's declared role, marks the folder as empty-placeholder, and clarifies what does NOT belong there (e.g. product docs vs architecture vs migration).
- **Files touched:** `docs/product/README.md`, `docs/audits/README.md`, `docs/archive/README.md` — all created.

### O-05 — Populated / scaffolded / audit-only / obsolete legend in `PROJECT_MASTER.md`

- **Action taken:** replaced the bullet-list top-level map in `PROJECT_MASTER.md` with a status table. The table carries Role and Status columns, and the obsolete `Ucenicul/` orphan and the `_ARCHIVED_Executor_Closer_stub/` are explicitly listed with status `obsolete`.
- **Files touched:** `PROJECT_MASTER.md` — section edit.

---

## Optional improvements not applied

### O-03 — `.gitkeep` / purpose notes in empty WF subfolders

- **Status:** not applied.
- **Reason:** the WF subfolders (`workflow/`, `sql/`, `scripts/`, `tests/`, `reports/`, `assets/`, `docs/` inside each active `WF-*/`) are read-only on the current mount — every write into them fails with `ENOENT`. This is cosmetic only; it can be applied in a later pass where the mount permits writes.

### O-04 — Flatten `.claude/pipelines/ucenicul-pipeline/` to `.claude/pipeline/`

- **Status:** not applied.
- **Reason:** the audit's default instruction for O-04 was "lasa structura in pace" unless 100% sure it wouldn't break anything. Closure pass preserved the existing nested structure intact.

---

## Untouched by intent (structural discipline)

- **Source roots** — neither `PRODUCT_ROOT` (source A) nor `CLAUDE_PIPELINE_ROOT` (source B) on the host machine was read, moved, or modified.
- **Workflow JSON content** — none of the workflow folders contain JSONs yet; in any case, no JSON was edited.
- **Product runtime code** — not touched.
- **Inventory manifests (`*.json`)** — not regenerated or edited. Only two new narrative files were added to `inventory/`: `DOCS_LEGEND.md` (O-01) and `DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md` (this closure pass's re-audit). A third file `DOCUMENT_STRUCTURE_FIXES_DELTA.md` (this file) is the change log.
- **Taxonomy moves between `docs/` buckets** — none. The pre-fix audit confirmed taxonomy is correct; the closure pass did not move any doc between `architecture/`, `migration/`, `operations/`, `product/`, `audits/`, or `archive/`.

---

## Summary

- Required fixes applied: **8 / 8** (F-01..F-08).
- Required fixes blocked by mount but neutralized by labeling: **F-01** (`Ucenicul/` orphan), **F-02/F-03** (stub could not be moved to `archive/`, but renamed out of the WF namespace), **F-07** (LAYOUT.md displaced one level up).
- Optional improvements applied: **3 / 5** (O-01, O-02, O-05).
- Optional improvements not applied: **2 / 5** (O-03 blocked by mount, O-04 intentionally skipped).
- New files created: 8 (`Ucenicul/OBSOLETE.md`, `.claude/pipelines/LAYOUT.md`, `docs/product/README.md`, `docs/audits/README.md`, `docs/archive/README.md`, `inventory/DOCS_LEGEND.md`, `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md`, `inventory/DOCUMENT_STRUCTURE_FIXES_DELTA.md`).
- Files rewritten: 4 (`.claude/README.md`, `workflows/README.md`, `workflows/_ARCHIVED_Executor_Closer_stub/README.md`, `.claude/_removed_test.txt`).
- Files text-edited: 3 (`README.md`, `CLAUDE.md`, `db/README.md`, `PROJECT_MASTER.md` — actually 4).
- Folders renamed: 1 (`workflows/WF-EC-01_Executor_Closer/` → `workflows/_ARCHIVED_Executor_Closer_stub/`).
- Folders created or deleted on disk: 0 deleted (mount-blocked), 0 new canonical folders added.
