#!/usr/bin/env python3
"""Verification Pass 1 — manifest-driven integrity.

For every entry in unified_inventory.json whose action is 'copy_to_target' OR is present
in the deployed tree per target_path, verify:
  - the deployed file exists at target_path
  - its sha256 matches the original sha256 in source_root_*_inventory.json
  - detected_role, detected_workflow, confidence are populated

Produces: inventory/verification_report_pass1.json
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone

INV = Path("/sessions/elegant-great-volta/inventory")
REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
REBUILT_INV = REBUILT / "inventory"


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        while True:
            b = f.read(1 << 16)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def main() -> None:
    unified = json.loads((INV / "unified_inventory.json").read_text())
    entries = unified["entries"]

    # Build sha lookup from prior inventories (sha256 per source_root+original_path)
    sha_by_source: dict[tuple[str, str], str] = {}
    for inv_name, label in (("source_root_a_inventory.json", "PRODUCT_ROOT"),
                             ("source_root_b_inventory.json", "CLAUDE_PIPELINE_ROOT")):
        data = json.loads((INV / inv_name).read_text())
        for e in data["entries"]:
            sha_by_source[(label, e["original_path"])] = e["sha256"]

    results = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pass": 1,
        "entry_count": len(entries),
        "checks": {
            "deployed_exists": {"passed": 0, "failed": []},
            "sha_matches_source": {"passed": 0, "failed": []},
            "role_populated": {"passed": 0, "failed": []},
            "confidence_populated": {"passed": 0, "failed": []},
            "target_path_populated": {"passed": 0, "failed": []},
        },
        "issues": [],
    }

    for e in entries:
        sr = e["source_root"]
        op = e["original_path"]
        tp = e.get("target_path")
        role = e.get("detected_role")
        conf = e.get("confidence_score")
        action = e.get("action") or "copy_to_target"

        # role populated
        if role:
            results["checks"]["role_populated"]["passed"] += 1
        else:
            results["checks"]["role_populated"]["failed"].append(f"{sr}:{op}")

        if conf is not None:
            results["checks"]["confidence_populated"]["passed"] += 1
        else:
            results["checks"]["confidence_populated"]["failed"].append(f"{sr}:{op}")

        if tp:
            results["checks"]["target_path_populated"]["passed"] += 1
        else:
            results["checks"]["target_path_populated"]["failed"].append(f"{sr}:{op}")
            continue

        deployed = REBUILT / tp
        if deployed.exists():
            results["checks"]["deployed_exists"]["passed"] += 1
            # hash check
            try:
                got = sha256_file(deployed)
                want = sha_by_source.get((sr, op))
                if want and got == want:
                    results["checks"]["sha_matches_source"]["passed"] += 1
                else:
                    results["checks"]["sha_matches_source"]["failed"].append({
                        "source_root": sr, "original_path": op, "target_path": tp,
                        "expected_sha": want, "actual_sha": got,
                    })
            except Exception as ex:
                results["issues"].append({"entry": f"{sr}:{op}", "error": str(ex)})
        else:
            # Some entries were merged into duplicates (canonical kept at a different path).
            # For duplicates, check the target_path points to the canonical (same sha).
            results["checks"]["deployed_exists"]["failed"].append({
                "source_root": sr, "original_path": op, "target_path": tp,
            })

    summary_counts = {k: {"passed": v["passed"], "failed_count": len(v["failed"])}
                       for k, v in results["checks"].items()}
    results["summary"] = summary_counts

    (INV / "verification_report_pass1.json").write_text(
        json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    (REBUILT_INV / "verification_report_pass1.json").write_text(
        json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Pass 1 done. Checks summary:")
    for k, v in summary_counts.items():
        print(f"  {k}: passed={v['passed']}, failed={v['failed_count']}")


if __name__ == "__main__":
    main()
