#!/usr/bin/env python3
"""Verification Pass 2 — fresh rescan of deployed tree vs. manifests.

Walks the deployed Ucenicul_REBUILT/ tree from scratch, building a map of
{target_path -> sha256}. Then compares to:

1. unified_inventory.json: every entry's target_path must exist (unless covered by duplicate collapse)
2. SHAs of canonical deployments must match source SHA
3. No "stray" files: every deployed file must be either
   - in unified_inventory (target_path of some entry), or
   - in manual_adjustments (post-Phase-3R relocations), or
   - a builder-generated artifact (README, PROJECT_MASTER, DECISIONS, etc. — allowlist)

Produces: inventory/verification_report_pass2.json
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

INV = Path("/sessions/elegant-great-volta/inventory")
REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
REBUILT_INV = REBUILT / "inventory"

# Paths (rel to REBUILT) that are allowed to exist without a unified_inventory entry
# (they are repo/builder-generated): READMEs, PROJECT_MASTER, etc.
GENERATED_SUFFIX_ALLOWLIST = {
    "README.md", "LAYOUT.md", "PROJECT_MASTER.md", "PROGRESS_LOG.md", "DECISIONS.md",
    "RECONCILIATION_STATE.json", "final_reorganization_report.md",
    "rescan_diff.json", "verification_report.json",
    "verification_report_pass1.json", "verification_report_pass2.json", "verification_report_pass3.json",
    "source_root_a_inventory_rescan.json", "source_root_b_inventory_rescan.json",
    # Phase 9 (manifest sync / closure hardening) artifacts
    "final_consistency_audit.json", "final_consistency_audit_post.json",
    "manifest_sync_diff.json", "final_cross_check_10pt.json",
    "FINAL_CLOSURE_DELTA.md",
    # Phase 9b (semantic closure polish) artifact
    "FINAL_POLISH_DELTA.md",
}


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        while True:
            b = f.read(1 << 16)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def walk_tree(root: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        filenames.sort()
        for name in filenames:
            fp = Path(dirpath) / name
            try:
                if fp.is_symlink() or not fp.is_file():
                    continue
                st = fp.stat()
            except OSError:
                continue
            rel = fp.relative_to(root).as_posix()
            try:
                sha = sha256_file(fp)
            except OSError:
                sha = ""
            out[rel] = {"size": st.st_size, "sha256": sha}
    return out


def main() -> None:
    unified = json.loads((INV / "unified_inventory.json").read_text())
    entries = unified["entries"]
    manual = unified.get("manual_adjustments", [])

    # Source sha lookup
    sha_by_source: dict[tuple[str, str], str] = {}
    for inv_name, label in (("source_root_a_inventory.json", "PRODUCT_ROOT"),
                             ("source_root_b_inventory.json", "CLAUDE_PIPELINE_ROOT")):
        data = json.loads((INV / inv_name).read_text())
        for e in data["entries"]:
            sha_by_source[(label, e["original_path"])] = e["sha256"]

    # Expected target_path -> expected_sha map (canonical view)
    expected: dict[str, dict] = {}
    for e in entries:
        tp = e.get("target_path")
        if not tp:
            continue
        expected.setdefault(tp, []).append({
            "source_root": e["source_root"],
            "original_path": e["original_path"],
            "expected_sha": sha_by_source.get((e["source_root"], e["original_path"])),
        })

    # Fresh rescan
    deployed = walk_tree(REBUILT)

    # 1) Expected existence + sha
    check_expected_exists = {"passed": 0, "failed": []}
    check_expected_sha = {"passed": 0, "failed": []}
    for tp, items in expected.items():
        if tp not in deployed:
            check_expected_exists["failed"].append({
                "target_path": tp,
                "claims": items,
            })
            continue
        check_expected_exists["passed"] += 1
        actual_sha = deployed[tp]["sha256"]
        # At least one of the claims' expected_sha should match
        shas = {i.get("expected_sha") for i in items if i.get("expected_sha")}
        if actual_sha in shas:
            check_expected_sha["passed"] += 1
        else:
            check_expected_sha["failed"].append({
                "target_path": tp,
                "actual_sha": actual_sha,
                "expected_any_of": sorted(shas),
            })

    # Add manual_adjustments targets to expected_paths (cross-link copies, canonical relocations)
    manual_targets = set()
    for m in manual:
        to = m.get("to_target") or ""
        if to and "inventory/.trash" not in to and "confidence=" not in to:
            manual_targets.add(to)

    # 2) Stray files (in deployed but not in expected AND not allowlist)
    check_no_stray = {"passed": 0, "stray": []}
    expected_paths = set(expected.keys()) | manual_targets
    for rel, meta in deployed.items():
        name = rel.rsplit("/", 1)[-1]
        if rel in expected_paths:
            check_no_stray["passed"] += 1
            continue
        if name in GENERATED_SUFFIX_ALLOWLIST:
            check_no_stray["passed"] += 1
            continue
        # per-dir READMEs in workflow subdirs etc. are allowed
        if name == "README.md":
            check_no_stray["passed"] += 1
            continue
        # Inventory JSONs are generated reorg artifacts
        if rel.startswith("inventory/") and rel.endswith(".json"):
            check_no_stray["passed"] += 1
            continue
        # Migration scripts (reproducibility requirement)
        if rel.startswith("scripts/migration/") and rel.endswith(".py"):
            check_no_stray["passed"] += 1
            continue
        # .trash holds unlinkable test artifacts (mount limitation)
        if rel.startswith("inventory/.trash/"):
            check_no_stray["passed"] += 1
            continue
        check_no_stray["stray"].append(rel)

    # 3) No __collision_ suffixes anywhere
    collisions = [rel for rel in deployed if "__collision_" in rel]

    # 4) Count files deployed vs count entries
    summary = {
        "deployed_file_count": len(deployed),
        "unified_entry_count": len(entries),
        "unique_target_paths": len(expected),
        "collisions_found": len(collisions),
        "allowlist_generated_files_in_deployed": sum(
            1 for rel in deployed if rel.rsplit("/", 1)[-1] in GENERATED_SUFFIX_ALLOWLIST or rel.rsplit("/", 1)[-1] == "README.md"
        ),
    }

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pass": 2,
        "summary": summary,
        "expected_exists": {"passed": check_expected_exists["passed"], "failed_count": len(check_expected_exists["failed"]), "failed": check_expected_exists["failed"][:20]},
        "expected_sha_matches": {"passed": check_expected_sha["passed"], "failed_count": len(check_expected_sha["failed"]), "failed": check_expected_sha["failed"][:20]},
        "stray_file_count": len(check_no_stray["stray"]),
        "stray_files_sample": check_no_stray["stray"][:40],
        "collisions_found": collisions,
    }
    (INV / "verification_report_pass2.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    (REBUILT_INV / "verification_report_pass2.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    print("Pass 2 summary:")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    print(f"  expected_exists: passed={check_expected_exists['passed']} failed={len(check_expected_exists['failed'])}")
    print(f"  expected_sha:    passed={check_expected_sha['passed']}    failed={len(check_expected_sha['failed'])}")
    print(f"  stray_files:     {len(check_no_stray['stray'])}")


if __name__ == "__main__":
    main()
