# ucenicul_restructured_candidate/

**Candidate restructuring. Non-destructive parallel clean copy. Ready for human review.**

This folder is a parallel reorganization of the Ucenicul repository. It exists only for cleanup, inventory, and clearer separation of workflow ownership. The original repository was **not** modified: no file was renamed in place, moved in place, deleted, rewritten, merged, split, reformatted, or otherwise altered. Every file under this tree is a byte-for-byte copy of a file that still exists in the original repository.

> **Not yet a new source of truth.** The canonical authority documents are still the files originally under `docs/` in the source repo. See `common/architecture/Architecture_Spec_v3_Ucenicul.md` (copied from `docs/Architecture_Spec_v3_Ucenicul.md`) for the top of the authority hierarchy as defined by the repo's own `CLAUDE.md`.

## Top-level layout

```
ucenicul_restructured_candidate/
  README.md                        (this file)
  RESTRUCTURE_MANIFEST.md          (executive summary, counts, safety confirmation)
  RESTRUCTURE_INVENTORY.md         (full source -> target mapping table)
  RESTRUCTURE_DECISIONS.md         (classification rules applied + edge cases)
  RESTRUCTURE_COPY_LOG.md          (folders created, files copied, collisions, skips)

  common/                          (cross-workflow assets)
    architecture/                  (architecture + migration + schema docs)
    contracts/                     (contracts, playbooks, repo-level CLAUDE.md)
    runtime/                       (runtime canonical target + module contracts)
    shared_reports/                (stage template, report template, doc-verification checklist)
    shared_test_utils/             (cross-workflow test orchestration scripts + fixture registry)
    historical_reference/          (original READMEs, file scorecard, generic ROUTE_MAP)

  workflows/
    WF-TR-01/   (Thread Resolver)
    WF-EC-01/   (Execution Context Init)
    WF-OR-01/   (Orchestrator Input Handoff)
    WF-PL-01/   (Plan Generation)
    WF-DI-01/   (Dispatcher)
    WF-ME-01/   (Module Execution Adapter)
    WF-RA-01/   (Result Aggregator, planned)
    WF-RC-01/   (Response Composer, planned)

  archive/
    historical_snapshots/          (closure snapshots, root-level generic pointers)
    superseded_packs/              (nested duplicate packs preserved byte-for-byte)
    deprecated_docs/               (empty this pass)
    legacy_root/                   (empty this pass)

  unresolved/                      (all subfolders empty this pass)
    unknown_placement/
    ambiguous_files/
    manual_review_needed/
```

Each workflow folder has the same internal shape: `docs/`, `workflow/`, `sql/`, `scripts/`, `tests/`, `reports/`, `assets/`. WF-RA-01 and WF-RC-01 are scaffolded empty because no workflow-specific artifacts for those stages exist in the source repo.

## What this restructure is, and is NOT

**It is:**

- A filesystem reorganization by **copying** existing files into a clearer structure.
- An inventory of what exists, classified by workflow ownership vs. cross-workflow (`common/`) vs. historical (`archive/`).
- A candidate layout **ready for human review** before anyone decides to adopt it.

**It is not:**

- A refactor of content.
- An architecture rewrite.
- A docs rewrite.
- A code rewrite.
- A migration. The original repo still exists unchanged alongside this candidate.

## Source of truth

The original `docs/Architecture_Spec_v3_Ucenicul.md` remains the top of the authority hierarchy. This candidate tree **re-presents** that document under `common/architecture/` but does not replace or supersede the source file. Anyone working from this candidate should still treat `Architecture_Spec_v3_Ucenicul.md` (and the rest of the authority hierarchy listed in the repo-root `CLAUDE.md` — now also at `common/contracts/CLAUDE.md`) as canonical.

## Verification

See `RESTRUCTURE_MANIFEST.md` for:

- total folders created
- total files copied
- per-bucket totals (`common/`, workflow folders, `archive/`, `unresolved/`)
- collision handling
- confirmation that **no source file was modified or deleted**
- highest-risk ambiguous placements (if any) that need human review

See `RESTRUCTURE_INVENTORY.md` for the full source → target mapping.
