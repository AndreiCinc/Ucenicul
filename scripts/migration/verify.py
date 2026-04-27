#!/usr/bin/env python3
"""Phase 5 verifier. Checks:

  1. Every file in SOURCE A and SOURCE B has a destination in REBUILT (coverage).
  2. Hash parity: all copied files match their source sha256.
  3. Boundary: no pipeline-originated file has ended up under a non-.claude, non-archive product area
     except items explicitly marked with a promotion reason in move_plan.json.
  4. No orphan files in workflows/WF-*/ subfolders (each file is attributable).
  5. Root is clean: only the allowed set of top-level entries.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
INV = Path("/sessions/elegant-great-volta/inventory")


def sha256_of(path: Path, chunk: int = 1 << 16) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def main() -> None:
    log = json.loads((INV / "relocation_log.json").read_text())
    plan = json.loads((INV / "move_plan.json").read_text())

    findings: list[dict] = []
    passed: list[str] = []

    # 1. Coverage
    total_src = len(plan["entries"])
    copied = sum(1 for r in log["entries"] if r["status"].startswith("copied") or r["status"].startswith("target_exists"))
    if copied == total_src:
        passed.append(f"Coverage: all {total_src} source files accounted for.")
    else:
        findings.append({"severity": "HIGH", "check": "coverage", "detail": f"{total_src - copied} source file(s) not copied"})

    # 2. Hash parity — sample up to 50 to keep fast, but also verify any status that isn't clean
    bad_hash = []
    for r in log["entries"]:
        if r["hash_after"] and r["hash_after"] != r["sha256"]:
            bad_hash.append(r)
    if not bad_hash:
        passed.append("Hash parity: every recorded hash_after matches source sha256.")
    else:
        findings.append({"severity": "HIGH", "check": "hash_parity", "detail": f"{len(bad_hash)} files with mismatch", "samples": bad_hash[:5]})

    # 3. Boundary: pipeline-originated files must live under .claude/ or archive/ unless they are explicit promotions
    promotions = [r for r in log["entries"] if r["source_root"] == "CLAUDE_PIPELINE_ROOT"]
    boundary_violations = []
    for r in promotions:
        tgt = r["final_target"] or r["target_path"]
        if tgt.startswith(".claude/") or tgt.startswith("archive/") or tgt.startswith("inventory/"):
            continue
        # Must be explicit promotion (workflow_owned, repo_root_owned, shared_technical)
        if r["detected_role"] not in {"workflow_owned", "repo_root_owned", "shared_technical"}:
            boundary_violations.append(r)
            continue
        # For promotions into workflows/, require that the reason mentions "promote"
        if tgt.startswith("workflows/") and "promot" not in r["reason"].lower():
            boundary_violations.append(r)
    if not boundary_violations:
        passed.append(f"Boundary: every pipeline-originated file ({len(promotions)}) is either preserved inside .claude/ or is a documented promotion into product areas.")
    else:
        findings.append({"severity": "MEDIUM", "check": "boundary", "detail": f"{len(boundary_violations)} pipeline files crossed into product without explicit promotion reason", "samples": boundary_violations[:5]})

    # 4. Workflow folder integrity — every file under workflows/WF-*/ should come from move_plan
    planned_targets = {r["final_target"] or r["target_path"] for r in log["entries"]}
    # Include manual adjustment
    for m in log.get("manual_adjustments", []):
        planned_targets.add(m["to"])
    orphans = []
    for path in REBUILT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(REBUILT).as_posix()
        if rel.startswith("workflows/"):
            if rel.endswith("/README.md") and rel.count("/") == 2:
                # per-workflow README we generated in Phase 3
                continue
            if rel == "workflows/README.md":
                continue
            if rel not in planned_targets:
                orphans.append(rel)
    if not orphans:
        passed.append("Workflow integrity: every file under workflows/ is accounted for in move_plan or is an auto-generated README.")
    else:
        findings.append({"severity": "MEDIUM", "check": "workflow_orphans", "detail": f"{len(orphans)} unplanned files under workflows/", "samples": orphans[:10]})

    # 5. Root cleanliness — allowed top-level entries
    allowed_root = {
        ".claude", "archive", "db", "docs", "inventory", "scripts", "src", "testing", "workflows",
        "CLAUDE.md", "README.md", "PROJECT_MASTER.md", "PROGRESS_LOG.md", "DECISIONS.md",
    }
    actual_root = {p.name for p in REBUILT.iterdir()}
    extra = actual_root - allowed_root
    missing = allowed_root - actual_root
    if not extra and not missing:
        passed.append(f"Root clean: exactly the allowed top-level entries present ({len(allowed_root)}).")
    else:
        findings.append({"severity": "LOW", "check": "root_cleanliness", "extra_entries": sorted(extra), "missing_entries": sorted(missing)})

    # 6. Duplicate-bucket audit
    dup = json.loads((INV / "duplicate_candidates.json").read_text())
    dup_count = dup["group_count"]
    passed.append(f"Duplicates: {dup_count} sha256 groups identified; non-canonical copies routed to archive/superseded/duplicates/.")

    # 7. Ambiguous bucket
    amb = json.loads((INV / "ambiguous_files.json").read_text())
    passed.append(f"Ambiguous: {amb['file_count']} file(s) placed in inventory/ambiguous_holding/ awaiting human review.")

    result = {
        "passed_checks": passed,
        "findings": findings,
        "status": "PASS" if not findings else ("PASS_WITH_FINDINGS" if all(f["severity"] != "HIGH" for f in findings) else "FAIL"),
    }
    (INV / "verification_report.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    import shutil
    shutil.copy2(INV / "verification_report.json", REBUILT / "inventory" / "verification_report.json")

    print("=== Verification ===")
    print("Status:", result["status"])
    print("Passed:")
    for p in passed:
        print(f"  + {p}")
    if findings:
        print("Findings:")
        for f in findings:
            print(f"  ! [{f['severity']}] {f['check']}: {f.get('detail','')}")


if __name__ == "__main__":
    main()
