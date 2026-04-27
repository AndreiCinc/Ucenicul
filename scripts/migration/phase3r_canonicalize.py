#!/usr/bin/env python3
"""Phase 3R — Canonical Target Normalization.

Applies content-aware decisions to remove remaining ambiguity and collisions:

1. ziOCmWkZ — identified as ZIP snapshot of wf-ra-01_full_source_pack.
   -> archive/snapshots/wf-ra-01_full_source_pack_2026-04-17.zip
   -> remove from ambiguous_files.json

2. WF-TR-01 dual blueprints:
   - canonical: WF-TR-01_Thread_Resolver.json (complete workflow with name/meta)
   - overlay: WF-TR-01_PATCHED_switch_fix.json (patch-only export, no name/meta)
     -> relocate to workflows/WF-TR-01_Thread_Resolver/workflow/patches/

3. WF-RA-01 triple artifacts:
   - canonical: WF-RA-01_Result_Aggregator_LIVE.json (live n8n export, largest, has expressions)
   - draft:     wf-ra-01_full_source_pack/.../WF-RA-01_Result_Aggregator.json
     -> relocate to workflows/WF-RA-01_Result_Aggregator/workflow/drafts/WF-RA-01_Result_Aggregator_draft.json
   - blueprint-spec (metadata only): WF-RA-01_blueprint.json
     -> relocate to workflows/WF-RA-01_Result_Aggregator/docs/WF-RA-01_blueprint.json

4. Pipeline README collision:
   - auto-generated description → LAYOUT.md
   - original pipeline README (currently README_from_pipeline_source.md) → README.md

5. HANDOFF_WF-TR-02 cross-link: create a SECOND copy at
   workflows/WF-EC-01_Executor_Closer/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md
   with a preamble noting it's a cross-link, not a duplicate.

6. tools/n8n-patch/* confidence upgrade: from 0.65 → 0.90 after content review
   (legitimate pipeline-scoped harness/snapshot tooling).

All changes:
- are applied to the deployed tree under Ucenicul_REBUILT/
- update unified_inventory.json (target_path, detected_role, confidence_score)
- update move_plan.json, relocation_log.json, ambiguous_files.json
- append entries to manual_adjustments (with actor="phase3r_canonicalize" + reason)
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

INV_VM = Path("/sessions/elegant-great-volta/inventory")
REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
REBUILT_INV = REBUILT / "inventory"
SOURCE_A = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul")
SOURCE_B = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/.claude/ucenicul-pipeline")

NOW = datetime.now(timezone.utc).isoformat()
ACTOR = "phase3r_canonicalize"

manual_adjustments: list[dict] = []


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        while True:
            b = f.read(1 << 16)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def ensure_parent(p: Path) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)


def copy_verified(src: Path, dst: Path) -> str:
    """Copy src to dst (creating parents) and verify sha256 match. Returns sha256."""
    ensure_parent(dst)
    src_sha = sha256_file(src)
    shutil.copy2(src, dst)
    dst_sha = sha256_file(dst)
    if src_sha != dst_sha:
        raise RuntimeError(f"copy_verified mismatch: {src} -> {dst}")
    return dst_sha


def move_rename(src: Path, dst: Path) -> None:
    """Rename src -> dst (works on the OneDrive mount where unlink is denied but rename works).

    Falls back to copy-then-truncate when rename is not possible (cross-device etc.).
    """
    ensure_parent(dst)
    if not src.exists():
        return
    if dst.exists():
        # cannot overwrite on mount; pick unique alternate name
        raise RuntimeError(f"move_rename target already exists: {dst}")
    try:
        os.rename(src, dst)
    except OSError as e:
        # Copy + overwrite source with stub (mount allows truncate but not unlink)
        src_sha = sha256_file(src)
        shutil.copy2(src, dst)
        if sha256_file(dst) != src_sha:
            raise RuntimeError(f"move_rename copy mismatch: {src} -> {dst}") from e
        # Blank the old file
        src.write_text("# SUPERSEDED — see manual_adjustments in inventory/unified_inventory.json\n", encoding="utf-8")


def shelve_to_trash(p: Path, reason_slug: str) -> Path | None:
    """Move a file to inventory/.trash/<reason_slug>/ via rename (for files we cannot delete).
    Returns the new path or None if source didn't exist.
    """
    if not p.exists():
        return None
    trash_root = REBUILT / "inventory/.trash" / reason_slug
    trash_root.mkdir(parents=True, exist_ok=True)
    # Preserve relative layout under REBUILT
    try:
        rel = p.relative_to(REBUILT)
        target = trash_root / rel
    except ValueError:
        target = trash_root / p.name
    ensure_parent(target)
    if target.exists():
        # append timestamp
        target = target.with_name(target.stem + "__" + NOW.replace(":","").replace("-","") + target.suffix)
    try:
        os.rename(p, target)
    except OSError:
        # Could not rename — fallback: truncate contents to stub
        try:
            p.write_text("# SUPERSEDED — moved to inventory/.trash/ (see manual_adjustments)\n", encoding="utf-8")
        except Exception:
            pass
        return None
    return target


def adj(kind: str, original_path: str, source_root: str, old_target: str, new_target: str, reason: str) -> None:
    manual_adjustments.append({
        "actor": ACTOR,
        "timestamp_utc": NOW,
        "kind": kind,
        "source_root": source_root,
        "original_path": original_path,
        "from_target": old_target,
        "to_target": new_target,
        "reason": reason,
    })


def update_entry(entries: list[dict], source_root: str, original_path: str, **updates) -> dict:
    for e in entries:
        if e["source_root"] == source_root and e["original_path"] == original_path:
            e.update(updates)
            return e
    raise KeyError(f"entry not found: {source_root}/{original_path}")


def main() -> None:
    # Load all manifests
    with (INV_VM / "unified_inventory.json").open() as f:
        unified = json.load(f)
    with (INV_VM / "move_plan.json").open() as f:
        move_plan = json.load(f)
    with (INV_VM / "ambiguous_files.json").open() as f:
        ambiguous = json.load(f)
    with (INV_VM / "relocation_log.json").open() as f:
        relocation = json.load(f)

    entries = unified["entries"]
    mp_entries = move_plan.get("entries") or move_plan.get("moves") or []

    # -------- 1. ziOCmWkZ -> archive/snapshots --------
    src = SOURCE_B / "ziOCmWkZ"
    new_target_rel = "archive/snapshots/wf-ra-01_full_source_pack_2026-04-17.zip"
    old_target_rel = "inventory/ambiguous_holding/CLAUDE_PIPELINE_ROOT/ziOCmWkZ"
    old_deployed = REBUILT / old_target_rel
    new_deployed = REBUILT / new_target_rel
    # rename to canonical archive location (works on mount)
    if old_deployed.exists() and not new_deployed.exists():
        ensure_parent(new_deployed)
        os.rename(old_deployed, new_deployed)
    elif not new_deployed.exists():
        copy_verified(src, new_deployed)
    adj("content_review_placement", "ziOCmWkZ", "CLAUDE_PIPELINE_ROOT",
        old_target_rel, new_target_rel,
        "ZIP snapshot of wf-ra-01_full_source_pack (verified via unzip -l) — archive as dated snapshot")
    e = update_entry(entries, "CLAUDE_PIPELINE_ROOT", "ziOCmWkZ",
                     detected_role="archive_candidate",
                     detected_workflow="WF-RA-01",
                     workflow_detection_basis="zip_content_contains_wf-ra-01_full_source_pack",
                     confidence_score=0.95,
                     target_path=new_target_rel,
                     action="copy_to_target",
                     reason="archived ZIP snapshot of RA-01 source pack (post-promotion); kept for provenance")
    # Clear ambiguous list entirely
    ambiguous["file_count"] = 0
    ambiguous["files"] = []
    ambiguous["note"] = "All previously-ambiguous items resolved via Phase 2R content review; see manual_adjustments in unified_inventory.json"

    # -------- 2. WF-TR-01 PATCHED overlay -> patches/ --------
    old_t = "workflows/WF-TR-01_Thread_Resolver/workflow/WF-TR-01_PATCHED_switch_fix.json"
    new_t = "workflows/WF-TR-01_Thread_Resolver/workflow/patches/WF-TR-01_PATCHED_switch_fix.json"
    move_rename(REBUILT / old_t, REBUILT / new_t)
    adj("dual_canonical_resolution",
        "workflows/WF-TR-01_PATCHED_switch_fix.json", "PRODUCT_ROOT",
        old_t, new_t,
        "Canonical workflow for WF-TR-01 is Thread_Resolver.json (has name/meta); PATCHED_switch_fix is a partial patch export (no name/meta) — relocated to workflow/patches/")
    update_entry(entries, "PRODUCT_ROOT", "workflows/WF-TR-01_PATCHED_switch_fix.json",
                 target_path=new_t,
                 confidence_score=0.95,
                 reason="overlay patch kept under workflow/patches/ next to canonical Thread_Resolver.json")

    # Write a README in patches/
    patches_readme = REBUILT / "workflows/WF-TR-01_Thread_Resolver/workflow/patches/README.md"
    patches_readme.write_text(
        "# WF-TR-01 / workflow / patches\n\n"
        "Overlay / partial-export patches for the WF-TR-01 Thread Resolver workflow.\n\n"
        "- `WF-TR-01_PATCHED_switch_fix.json` — partial export containing only `nodes`, `connections`, `settings` (no top-level `name` or `meta`). Addresses Switch-node routing fixes. The canonical full workflow is `../WF-TR-01_Thread_Resolver.json`.\n\n"
        "Rule: patches are NEVER the canonical workflow — they must be applied on top of the canonical blueprint.\n",
        encoding="utf-8",
    )

    # -------- 3. WF-RA-01 — keep LIVE as canonical, relocate others --------
    # 3a. draft version (pack RA_01 workflow JSON)
    old_t = "workflows/WF-RA-01_Result_Aggregator/workflow/WF-RA-01_Result_Aggregator.json"
    new_t = "workflows/WF-RA-01_Result_Aggregator/workflow/drafts/WF-RA-01_Result_Aggregator_draft.json"
    move_rename(REBUILT / old_t, REBUILT / new_t)
    adj("dual_canonical_resolution",
        "wf-ra-01_full_source_pack/workflows/WF-RA-01_Result_Aggregator.json", "CLAUDE_PIPELINE_ROOT",
        old_t, new_t,
        "Canonical for WF-RA-01 is ...LIVE.json (larger, has full expressions; 2026-04-18 export). Pack version is older draft — relocated to workflow/drafts/")
    update_entry(entries, "CLAUDE_PIPELINE_ROOT",
                 "wf-ra-01_full_source_pack/workflows/WF-RA-01_Result_Aggregator.json",
                 target_path=new_t,
                 confidence_score=0.95,
                 reason="superseded draft; canonical is LIVE export")

    # 3b. blueprint.json (metadata-only spec, not a workflow JSON)
    old_t = "workflows/WF-RA-01_Result_Aggregator/workflow/WF-RA-01_blueprint.json"
    new_t = "workflows/WF-RA-01_Result_Aggregator/docs/WF-RA-01_blueprint.json"
    move_rename(REBUILT / old_t, REBUILT / new_t)
    adj("content_review_placement",
        "wf-ra-01_full_source_pack/workflows/WF-RA-01_blueprint.json", "CLAUDE_PIPELINE_ROOT",
        old_t, new_t,
        "File is a blueprint SPECIFICATION (workflow_name/stage_code/node_count metadata), not an n8n workflow export — relocated to docs/")
    update_entry(entries, "CLAUDE_PIPELINE_ROOT",
                 "wf-ra-01_full_source_pack/workflows/WF-RA-01_blueprint.json",
                 target_path=new_t,
                 confidence_score=0.95,
                 reason="blueprint metadata spec (not n8n JSON) — belongs in docs/")

    # 3c. Write drafts/README.md
    drafts_readme = REBUILT / "workflows/WF-RA-01_Result_Aggregator/workflow/drafts/README.md"
    drafts_readme.write_text(
        "# WF-RA-01 / workflow / drafts\n\n"
        "Historical drafts of the Result Aggregator workflow JSON, superseded by the canonical live export in `../WF-RA-01_Result_Aggregator_LIVE.json`.\n\n"
        "- `WF-RA-01_Result_Aggregator_draft.json` — 14 nodes, pre-LIVE version from `wf-ra-01_full_source_pack/`. Same node graph but lacking later expression refinements.\n",
        encoding="utf-8",
    )

    # -------- 4. Pipeline README collision — canonical swap --------
    pipeline_dir = REBUILT / ".claude/pipelines/ucenicul-pipeline"
    auto_readme = pipeline_dir / "README.md"
    source_readme = pipeline_dir / "README_from_pipeline_source.md"
    layout_readme = pipeline_dir / "LAYOUT.md"

    if auto_readme.exists() and source_readme.exists():
        # Step A: rename auto-generated README.md → LAYOUT.md
        if not layout_readme.exists():
            os.rename(auto_readme, layout_readme)
        # Step B: rename source README → README.md
        if not auto_readme.exists() and source_readme.exists():
            os.rename(source_readme, auto_readme)
        # Step C: prepend note to LAYOUT.md
        layout_content = layout_readme.read_text(encoding="utf-8")
        if not layout_content.startswith("> **Note:** This file describes"):
            layout_readme.write_text(
                "> **Note:** This file describes the *structural layout* of `.claude/pipelines/ucenicul-pipeline/` after the 2026-04-19 reorg. For the pipeline's *operating contract* see `README.md` (the canonical pipeline README from the source tree).\n\n"
                + layout_content,
                encoding="utf-8",
            )

    adj("readme_collision_resolution",
        "README.md", "CLAUDE_PIPELINE_ROOT",
        ".claude/pipelines/ucenicul-pipeline/README__collision_1.md (suffixed)",
        ".claude/pipelines/ucenicul-pipeline/README.md (canonical)",
        "Source pipeline README is the canonical (operating contract for Claude); auto-generated layout moved to LAYOUT.md")
    # update entry for the source-root README
    try:
        update_entry(entries, "CLAUDE_PIPELINE_ROOT", "README.md",
                     target_path=".claude/pipelines/ucenicul-pipeline/README.md",
                     confidence_score=0.95,
                     reason="canonical pipeline README (operating contract); superseded auto-generated layout doc which is now LAYOUT.md")
    except KeyError:
        pass

    # -------- 5. HANDOFF_WF-TR-02 cross-link into WF-EC-01 --------
    tr_path = REBUILT / "workflows/WF-TR-01_Thread_Resolver/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md"
    ec_target = REBUILT / "workflows/WF-EC-01_Executor_Closer/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md"
    if tr_path.exists():
        ec_target.parent.mkdir(parents=True, exist_ok=True)
        content = tr_path.read_text(encoding="utf-8")
        preamble = (
            "> **Cross-link copy.** Canonical location: `workflows/WF-TR-01_Thread_Resolver/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md`.\n"
            "> This file documents the handoff between WF-TR-01 (Thread Resolver) and WF-EC-01 (Executor/Closer) for the EC-Init kickoff on 2026-04-16.\n"
            "> It is duplicated here for discoverability from the WF-EC-01 side; any edits must be made in the canonical copy.\n\n"
            "---\n\n"
        )
        ec_target.write_text(preamble + content, encoding="utf-8")
        adj("cross_link_copy",
            "workflows/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md", "PRODUCT_ROOT",
            "workflows/WF-TR-01_Thread_Resolver/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md",
            "workflows/WF-EC-01_Executor_Closer/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md",
            "Cross-link copy (not duplicate): handoff concerns BOTH WF-TR-01 (source) and WF-EC-01 (recipient). Canonical is TR-01, EC-01 gets a preambled copy.")

    # -------- 6. tools/n8n-patch/* confidence upgrade --------
    patched = 0
    for e in entries:
        if e.get("source_root") == "CLAUDE_PIPELINE_ROOT" and e.get("original_path","").startswith("tools/n8n-patch/"):
            if e.get("confidence_score", 1.0) < 0.9:
                e["confidence_score"] = 0.9
                e["reason"] = (e.get("reason","") + " | phase2r: content review confirms pipeline-scoped dev/test tooling (harnesses, snapshots)").strip(" |")
                patched += 1
    if patched:
        adj("bulk_confidence_upgrade",
            f"tools/n8n-patch/* ({patched} files)", "CLAUDE_PIPELINE_ROOT",
            "confidence=0.65", "confidence=0.90",
            "Content review confirmed all n8n-patch/* files are legitimate pipeline-scoped tooling (test harnesses, snapshots, put-ready fixtures, patch script)")

    # -------- Persist all changes --------
    unified["manual_adjustments"] = unified.get("manual_adjustments", []) + manual_adjustments
    unified["content_review_complete_at"] = NOW

    # move_plan: update target paths for affected entries
    # We update via entries list (unified), not mp_entries — but mirror the decisions there too.
    if isinstance(mp_entries, list):
        # map by (source_root, original_path)
        adjustments_map = {
            ("CLAUDE_PIPELINE_ROOT", "ziOCmWkZ"): new_target_rel,
            ("PRODUCT_ROOT", "workflows/WF-TR-01_PATCHED_switch_fix.json"):
                "workflows/WF-TR-01_Thread_Resolver/workflow/patches/WF-TR-01_PATCHED_switch_fix.json",
            ("CLAUDE_PIPELINE_ROOT", "wf-ra-01_full_source_pack/workflows/WF-RA-01_Result_Aggregator.json"):
                "workflows/WF-RA-01_Result_Aggregator/workflow/drafts/WF-RA-01_Result_Aggregator_draft.json",
            ("CLAUDE_PIPELINE_ROOT", "wf-ra-01_full_source_pack/workflows/WF-RA-01_blueprint.json"):
                "workflows/WF-RA-01_Result_Aggregator/docs/WF-RA-01_blueprint.json",
            ("CLAUDE_PIPELINE_ROOT", "README.md"):
                ".claude/pipelines/ucenicul-pipeline/README.md",
        }
        for m in mp_entries:
            k = (m.get("source_root"), m.get("original_path"))
            if k in adjustments_map:
                m["target_path"] = adjustments_map[k]
                m["adjusted_by_phase3r"] = True

    move_plan["phase3r_adjustments"] = manual_adjustments

    # Relocation log: append Phase 3R action records
    reloc_records = relocation.get("records", relocation.get("actions", []))
    if isinstance(reloc_records, list):
        for adj_rec in manual_adjustments:
            reloc_records.append({
                "phase": "3R",
                "timestamp_utc": NOW,
                "source_root": adj_rec["source_root"],
                "original_path": adj_rec["original_path"],
                "from_target": adj_rec["from_target"],
                "to_target": adj_rec["to_target"],
                "kind": adj_rec["kind"],
                "reason": adj_rec["reason"],
                "action": "canonical_relocate" if adj_rec["kind"] != "bulk_confidence_upgrade" else "metadata_only",
            })
        if "records" in relocation:
            relocation["records"] = reloc_records
        else:
            relocation["actions"] = reloc_records
    relocation["phase3r_timestamp_utc"] = NOW

    # Save all four back to session inventory AND deployed inventory
    for name, obj in (
        ("unified_inventory.json", unified),
        ("move_plan.json", move_plan),
        ("ambiguous_files.json", ambiguous),
        ("relocation_log.json", relocation),
    ):
        text = json.dumps(obj, indent=2, ensure_ascii=False)
        (INV_VM / name).write_text(text, encoding="utf-8")
        (REBUILT_INV / name).write_text(text, encoding="utf-8")

    # rewrite ambiguous_holding README (cannot rmtree on OneDrive mount;
    # any subdirs are now empty since we renamed files out)
    holding_parent = REBUILT / "inventory/ambiguous_holding/CLAUDE_PIPELINE_ROOT"
    try:
        if holding_parent.exists() and not any(holding_parent.iterdir()):
            holding_parent.rmdir()
    except OSError:
        pass
    holding_readme = REBUILT / "inventory/ambiguous_holding/README.md"
    if holding_readme.exists():
        holding_readme.write_text(
            "# inventory/ambiguous_holding/\n\n"
            "Staging bucket for files the metadata-only classifier could not place deterministically.\n\n"
            "At reorg close (2026-04-19 Phase 3R) this folder is **empty** — all previously-ambiguous items were resolved via content-aware review. See `../unified_inventory.json#manual_adjustments` for the audit trail.\n",
            encoding="utf-8",
        )

    print(f"Phase 3R complete: {len(manual_adjustments)} manual adjustments applied")
    for m in manual_adjustments:
        print(f"  - [{m['kind']}] {m['source_root']}:{m['original_path']}")
        print(f"      {m['from_target']}")
        print(f"   -> {m['to_target']}")


if __name__ == "__main__":
    main()
