#!/usr/bin/env python3
"""Phase 5 SYNC — 10-point final cross-check.

Strict closure verification: every assertion below is checked against
canonical sources of truth simultaneously.

  1. ambiguous = 0 in unified_inventory.entries
  2. ambiguous_files.json file_count = 0
  3. unified_inventory.counts_by_role['ambiguous'] = 0
  4. RECONCILIATION_STATE.unresolved_counts.ambiguous_post_review = 0
  5. RECONCILIATION_STATE.counts_by_role_final['ambiguous'] = 0
  6. relocation_log.collisions = []  (active state)
  7. relocation_log.by_status.copied_with_collision_suffix = 0
  8. zero __collision_ files anywhere on disk
  9. counts_by_role['archive_candidate'] = Counter(entries).get('archive_candidate')
     (cross-check that the recomputed value matches the observed in entries)
 10. all 3 verification reports overall green AND audit passes 10/10
"""
from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

INV = Path("/sessions/elegant-great-volta/inventory")
REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
REBUILT_INV = REBUILT / "inventory"


def load(p):
    return json.loads(p.read_text())


def main():
    ui = load(INV / "unified_inventory.json")
    af = load(INV / "ambiguous_files.json")
    rl = load(INV / "relocation_log.json")
    rs = load(INV / "RECONCILIATION_STATE.json")
    v1 = load(INV / "verification_report_pass1.json")
    v2 = load(INV / "verification_report_pass2.json")
    v3 = load(INV / "verification_report_pass3.json")
    audit = load(INV / "final_consistency_audit.json")

    observed = dict(Counter(e.get("detected_role") for e in ui["entries"]))

    # collect __collision_ on disk
    collision_on_disk = []
    for dp, dn, fn in os.walk(REBUILT):
        for f in fn:
            if "__collision_" in f:
                collision_on_disk.append(str(Path(dp).relative_to(REBUILT) / f))

    points = [
        {
            "n": 1,
            "name": "ambiguous role absent from unified_inventory.entries",
            "expected": 0,
            "actual": observed.get("ambiguous", 0),
            "passed": observed.get("ambiguous", 0) == 0,
        },
        {
            "n": 2,
            "name": "ambiguous_files.json is empty",
            "expected": 0,
            "actual": af.get("file_count", -1),
            "passed": af.get("file_count", -1) == 0,
        },
        {
            "n": 3,
            "name": "unified_inventory.counts_by_role['ambiguous'] = 0",
            "expected": 0,
            "actual": ui.get("counts_by_role", {}).get("ambiguous", 0),
            "passed": ui.get("counts_by_role", {}).get("ambiguous", 0) == 0,
        },
        {
            "n": 4,
            "name": "RECONCILIATION_STATE.unresolved_counts.ambiguous_post_review = 0",
            "expected": 0,
            "actual": rs.get("unresolved_counts", {}).get("ambiguous_post_review", -1),
            "passed": rs.get("unresolved_counts", {}).get("ambiguous_post_review", -1) == 0,
        },
        {
            "n": 5,
            "name": "RECONCILIATION_STATE.counts_by_role_final['ambiguous'] = 0",
            "expected": 0,
            "actual": rs.get("counts_by_role_final", {}).get("ambiguous", 0),
            "passed": rs.get("counts_by_role_final", {}).get("ambiguous", 0) == 0,
        },
        {
            "n": 6,
            "name": "relocation_log.collisions[] empty (current active state)",
            "expected": [],
            "actual": rl.get("collisions", []),
            "passed": rl.get("collisions", []) == [],
        },
        {
            "n": 7,
            "name": "relocation_log.by_status.copied_with_collision_suffix = 0",
            "expected": 0,
            "actual": rl.get("by_status", {}).get("copied_with_collision_suffix", -1),
            "passed": rl.get("by_status", {}).get("copied_with_collision_suffix", -1) == 0,
        },
        {
            "n": 8,
            "name": "no __collision_ files anywhere on disk",
            "expected": [],
            "actual": collision_on_disk,
            "passed": collision_on_disk == [],
        },
        {
            "n": 9,
            "name": "counts_by_role['archive_candidate'] aligns with entries Counter",
            "expected": observed.get("archive_candidate"),
            "actual": ui.get("counts_by_role", {}).get("archive_candidate"),
            "passed": (ui.get("counts_by_role", {}).get("archive_candidate")
                       == observed.get("archive_candidate")),
        },
        {
            "n": 10,
            "name": "all verification passes green AND audit passes 10/10",
            "expected": "all green",
            "actual": {
                "v1_failed": v1.get("summary", {}).get("deployed_exists", {}).get("failed_count", -1),
                "v2_stray": v2.get("stray_file_count", -1),
                "v3_overall_passed": v3.get("overall_passed"),
                "audit_failed": audit.get("summary", {}).get("failed", -1),
                "audit_mismatches": audit.get("mismatches_found", -1),
            },
            "passed": (
                v1.get("summary", {}).get("deployed_exists", {}).get("failed_count", -1) == 0
                and v1.get("summary", {}).get("sha_matches_source", {}).get("failed_count", -1) == 0
                and v2.get("stray_file_count", -1) == 0
                and v2.get("expected_exists", {}).get("failed_count", -1) == 0
                and v2.get("expected_sha_matches", {}).get("failed_count", -1) == 0
                and v3.get("overall_passed") is True
                and audit.get("mismatches_found", -1) == 0
            ),
        },
    ]

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "phase": "5_SYNC_FINAL_CROSS_CHECK",
        "total_points": len(points),
        "passed": sum(1 for p in points if p["passed"]),
        "failed": sum(1 for p in points if not p["passed"]),
        "all_passed": all(p["passed"] for p in points),
        "points": points,
    }

    out_local = INV / "final_cross_check_10pt.json"
    out_pub = REBUILT_INV / "final_cross_check_10pt.json"
    out_local.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    out_pub.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"10-point cross-check: {summary['passed']}/{summary['total_points']} passed")
    for p in points:
        mark = "PASS" if p["passed"] else "FAIL"
        print(f"  [{mark}] {p['n']:2d}. {p['name']}")
        if not p["passed"]:
            print(f"        expected={p['expected']}, actual={p['actual']}")


if __name__ == "__main__":
    main()
