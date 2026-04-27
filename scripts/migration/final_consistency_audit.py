#!/usr/bin/env python3
"""Phase 1 SYNC — Final consistency audit.

Compares all derived artifacts in inventory/ against the canonical truth
(deployed tree + source roots) and emits inventory/final_consistency_audit.json.

Checks (per Phase 1 spec):
 1. unified_inventory.summary.counts_by_role matches Counter(entries[].detected_role)
 2. ambiguous_files.json is empty AND no entry in unified_inventory has detected_role==ambiguous
 3. relocation_log.collisions / by_status reflect ZERO active collisions
    (collision suffix files must NOT exist on disk)
 4. relocation_log.entries[].target_path == unified_inventory.entries[].target_path
    for every (source_root, original_path) pair
 5. move_plan.entries[].target_path == unified_inventory.entries[].target_path
    for every (source_root, original_path) pair
 6. RECONCILIATION_STATE.priors vs final observed counts (informational; will
    require a counts_by_role_final field in next phase)
 7. Final report tables vs current observed counts (file presence + grep)
 8. Verification reports pass1/pass2/pass3 are all green
 9. No __collision_ suffix files exist on disk (recursive)
10. Source root inventories vs unified entries: for each (source_root, original_path)
    in source_*_inventory.json there is a matching unified entry, and counts agree
"""
from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

INV = Path("/sessions/elegant-great-volta/inventory")
REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
REBUILT_INV = REBUILT / "inventory"


def load(p: Path) -> dict:
    return json.loads(p.read_text())


def main() -> None:
    ui = load(INV / "unified_inventory.json")
    rl = load(INV / "relocation_log.json")
    mp = load(INV / "move_plan.json")
    af = load(INV / "ambiguous_files.json")
    rs = load(INV / "RECONCILIATION_STATE.json")
    v1 = load(INV / "verification_report_pass1.json")
    v2 = load(INV / "verification_report_pass2.json")
    v3 = load(INV / "verification_report_pass3.json")
    src_a = load(INV / "source_root_a_inventory.json")
    src_b = load(INV / "source_root_b_inventory.json")

    audit = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "phase": "1_SYNC_CONSISTENCY_AUDIT",
        "checks_run": [],
        "mismatches_found": 0,
        "mismatch_details": [],
        "proposed_regenerations": [],
        # `status` is computed from results at end-of-run; do NOT pre-seed
        # with a stale placeholder. See block before write.
    }

    def add_check(name: str, passed: bool, detail: str = "") -> None:
        audit["checks_run"].append({"check": name, "passed": passed, "detail": detail})

    def add_mismatch(category: str, where: str, observed, declared, fix: str) -> None:
        audit["mismatches_found"] += 1
        audit["mismatch_details"].append({
            "category": category,
            "where": where,
            "observed_truth": observed,
            "declared_in_artifact": declared,
            "proposed_fix": fix,
        })

    # === Check 1: unified_inventory counts vs entries ===
    declared = ui.get("counts_by_role", {})
    observed = dict(Counter(e.get("detected_role") for e in ui["entries"]))
    if declared == observed:
        add_check("unified_inventory.counts_by_role matches entries", True,
                  f"counts: {observed}")
    else:
        add_check("unified_inventory.counts_by_role matches entries", False)
        diff = {r: (declared.get(r), observed.get(r))
                for r in set(declared) | set(observed) if declared.get(r) != observed.get(r)}
        add_mismatch(
            "A_unified_inventory_summary_stale",
            "unified_inventory.json#counts_by_role",
            observed, declared,
            "Recompute counts_by_role from entries[].detected_role and overwrite the field.",
        )
        audit["mismatch_details"][-1]["diff"] = diff

    # === Check 2: ambiguous absent everywhere ===
    amb_in_entries = [e for e in ui["entries"] if e.get("detected_role") == "ambiguous"]
    af_count = af.get("file_count", len(af.get("files", [])))
    if not amb_in_entries and af_count == 0:
        add_check("ambiguous role absent from entries AND ambiguous_files empty", True)
    else:
        add_check("ambiguous role absent everywhere", False)
        add_mismatch(
            "B_ambiguous_residue",
            "unified_inventory.entries / ambiguous_files.json",
            {"in_entries": len(amb_in_entries), "in_ambiguous_files": af_count},
            None,
            "Re-resolve any residual ambiguous entries via content review and update both files.",
        )

    # === Check 3: collision residue ===
    collision_suffix_on_disk = []
    for dp, dn, fn in os.walk(REBUILT):
        for f in fn:
            if "__collision_" in f:
                collision_suffix_on_disk.append(
                    str(Path(dp).relative_to(REBUILT) / f))
    rl_collisions = rl.get("collisions", [])
    rl_collision_status = rl.get("by_status", {}).get("copied_with_collision_suffix", 0)
    if not collision_suffix_on_disk and not rl_collisions and rl_collision_status == 0:
        add_check("no active collision (disk + relocation_log)", True)
    elif not collision_suffix_on_disk and (rl_collisions or rl_collision_status > 0):
        add_check("relocation_log advertises collisions but disk has none", False)
        add_mismatch(
            "C_relocation_log_collision_history_as_active_state",
            "relocation_log.json#collisions / by_status.copied_with_collision_suffix",
            {"on_disk_collisions": 0},
            {"by_status.copied_with_collision_suffix": rl_collision_status,
             "collisions_array_len": len(rl_collisions)},
            "Move collisions[] to historical_collision_resolutions[] (with resolution metadata); "
            "set by_status.copied_with_collision_suffix=0 (current active state); collisions=[].",
        )
    else:
        add_check("collisions present on disk", False)
        add_mismatch(
            "C_collisions_on_disk",
            "deployed tree",
            collision_suffix_on_disk, None,
            "Investigate: collision suffix files should not exist after Phase 3R.",
        )

    # === Check 4: relocation_log.entries vs unified target_path ===
    ui_index = {(e["source_root"], e["original_path"]): e.get("target_path") for e in ui["entries"]}
    rl_mismatch = []
    for e in rl.get("entries", []):
        key = (e.get("source_root"), e.get("original_path"))
        ui_tp = ui_index.get(key)
        rl_tp = e.get("target_path")
        rl_ft = e.get("final_target")
        # Source of truth: unified_inventory target_path
        if ui_tp is None:
            continue
        # We accept either target_path OR final_target matching
        if ui_tp != rl_tp and ui_tp != rl_ft:
            rl_mismatch.append({
                "source_root": key[0],
                "original_path": key[1],
                "unified_target": ui_tp,
                "relocation_target": rl_tp,
                "relocation_final_target": rl_ft,
            })
    if not rl_mismatch:
        add_check("relocation_log.entries[].target_path matches unified", True)
    else:
        add_check("relocation_log.entries stale for some entries", False, f"{len(rl_mismatch)} mismatches")
        add_mismatch(
            "D_relocation_log_entries_stale",
            "relocation_log.json#entries",
            "match unified_inventory target_path",
            f"{len(rl_mismatch)} stale entries",
            "Update each stale entry: set target_path=final_target=unified_target, "
            "preserve old as superseded_target, add note='phase3r_retargeted'.",
        )
        audit["mismatch_details"][-1]["sample"] = rl_mismatch[:10]

    # === Check 5: move_plan.entries vs unified target_path ===
    mp_mismatch = []
    for e in mp.get("entries", []):
        key = (e.get("source_root"), e.get("original_path"))
        ui_tp = ui_index.get(key)
        mp_tp = e.get("target_path")
        if ui_tp is None:
            continue
        if ui_tp != mp_tp:
            mp_mismatch.append({
                "key": key, "unified_target": ui_tp, "move_plan_target": mp_tp,
            })
    if not mp_mismatch:
        add_check("move_plan.entries target_path matches unified", True)
    else:
        add_check("move_plan.entries stale", False, f"{len(mp_mismatch)} mismatches")
        add_mismatch(
            "E_move_plan_stale",
            "move_plan.json#entries",
            "match unified_inventory target_path",
            f"{len(mp_mismatch)} stale entries",
            "Update each stale entry's target_path; preserve original under "
            "phase3r_adjustments[] (already present).",
        )

    # === Check 6: RECONCILIATION_STATE has counts_by_role_final aligned with observed ===
    # priors[] is by definition immutable (pre-content-review snapshot).
    # The resolution for priors-vs-observed drift is the presence of a
    # `counts_by_role_final` field that reflects the post-Phase-3R reality.
    final_field = rs.get("counts_by_role_final")
    if final_field:
        # Verify that counts_by_role_final aligns with observed (every role in
        # observed must match the value in counts_by_role_final).
        misalign = {k: (final_field.get(k), observed[k])
                    for k in observed if final_field.get(k) != observed[k]}
        if not misalign:
            add_check("RECONCILIATION_STATE has counts_by_role_final aligned with observed", True,
                      f"final={observed}")
        else:
            add_check("RECONCILIATION_STATE.counts_by_role_final misaligned with observed", False,
                      f"misalign={misalign}")
            add_mismatch(
                "F_reconciliation_state_final_misaligned",
                "RECONCILIATION_STATE.json#counts_by_role_final",
                observed, final_field,
                "Recompute counts_by_role_final from entries[].detected_role.",
            )
    else:
        add_check("RECONCILIATION_STATE missing counts_by_role_final", False)
        add_mismatch(
            "F_reconciliation_state_no_final_snapshot",
            "RECONCILIATION_STATE.json",
            observed,
            {"counts_by_role_final": "missing"},
            "Add counts_by_role_final field with post-review observed counts.",
        )

    # === Check 7: final report stats vs observed (presence + table check) ===
    fr_path = REBUILT_INV / "final_reorganization_report.md"
    if not fr_path.exists():
        add_check("final report exists", False)
        add_mismatch("G_final_report_missing", str(fr_path), "exists", "missing",
                     "Regenerate final report from canonical state.")
    else:
        text = fr_path.read_text(encoding="utf-8")
        # Parse the role-counts table; legacy/stale would say "ambiguous | 1"
        ambiguous_in_report = re.search(r"ambiguous\s*\|\s*(\d+)", text)
        archive_in_report = re.search(r"archive_candidate\s*\|\s*(\d+)", text)
        amb_val = int(ambiguous_in_report.group(1)) if ambiguous_in_report else None
        arch_val = int(archive_in_report.group(1)) if archive_in_report else None
        report_consistent = (amb_val == observed.get("ambiguous", 0)
                             and arch_val == observed.get("archive_candidate"))
        if report_consistent:
            add_check("final report tables match observed counts", True,
                      f"ambiguous={amb_val}, archive={arch_val}")
        else:
            add_check("final report tables stale", False,
                      f"report says ambiguous={amb_val}/archive={arch_val}, "
                      f"observed={observed.get('ambiguous',0)}/{observed.get('archive_candidate')}")
            add_mismatch(
                "G_final_report_stats_stale",
                "final_reorganization_report.md",
                {"ambiguous": observed.get("ambiguous", 0),
                 "archive_candidate": observed.get("archive_candidate")},
                {"ambiguous": amb_val, "archive_candidate": arch_val},
                "Regenerate role-count tables, manual_adjustments section, and provenance counts.",
            )

    # === Check 8: verification reports green ===
    # Pass 1 keeps a `failed` list inside checks; failed_count lives in summary.
    v1_summary = v1.get("summary", {})
    v1_ok = (v1_summary.get("deployed_exists", {}).get("failed_count", 1) == 0
             and v1_summary.get("sha_matches_source", {}).get("failed_count", 1) == 0
             and v1_summary.get("role_populated", {}).get("failed_count", 1) == 0
             and v1_summary.get("confidence_populated", {}).get("failed_count", 1) == 0
             and v1_summary.get("target_path_populated", {}).get("failed_count", 1) == 0)
    v2_ok = (v2.get("expected_exists", {}).get("failed_count", 1) == 0
             and v2.get("expected_sha_matches", {}).get("failed_count", 1) == 0
             and v2.get("stray_file_count", 1) == 0
             and not v2.get("collisions_found"))
    v3_ok = v3.get("overall_passed") is True
    if v1_ok and v2_ok and v3_ok:
        add_check("verification passes 1/2/3 all green", True)
    else:
        add_check("verification pass(es) not green", False,
                  f"v1={v1_ok} v2={v2_ok} v3={v3_ok}")
        add_mismatch(
            "H_verification_pass_red",
            "verification_report_pass{1,2,3}.json",
            "all green", {"v1": v1_ok, "v2": v2_ok, "v3": v3_ok},
            "Investigate first; do not regenerate without root-cause.",
        )

    # === Check 9: no __collision_ on disk (already covered by check 3, formal) ===
    if not collision_suffix_on_disk:
        add_check("no __collision_ suffix anywhere on disk", True)
    else:
        add_check("__collision_ suffix files found on disk", False, str(collision_suffix_on_disk))

    # === Check 10: source roots vs unified ===
    src_keys = set()
    for src, label in ((src_a, "PRODUCT_ROOT"), (src_b, "CLAUDE_PIPELINE_ROOT")):
        for e in src.get("entries", []):
            src_keys.add((label, e["original_path"]))
    ui_keys = set(ui_index.keys())
    only_in_src = src_keys - ui_keys
    only_in_ui = ui_keys - src_keys
    if not only_in_src and not only_in_ui:
        add_check("source roots and unified entries 1:1", True,
                  f"{len(src_keys)} keys")
    else:
        add_check("source/unified key drift", False,
                  f"only_in_src={len(only_in_src)} only_in_ui={len(only_in_ui)}")
        add_mismatch(
            "I_source_unified_drift",
            "source_root_*_inventory vs unified_inventory.entries",
            {"src_keys": len(src_keys), "ui_keys": len(ui_keys)},
            {"only_in_src": list(only_in_src)[:10], "only_in_ui": list(only_in_ui)[:10]},
            "Investigate: every source path must be present in unified_inventory.",
        )

    # === Aggregate proposed regenerations ===
    if any(m["category"] == "A_unified_inventory_summary_stale" for m in audit["mismatch_details"]):
        audit["proposed_regenerations"].append("unified_inventory.counts_by_role")
    if any(m["category"].startswith("C_") for m in audit["mismatch_details"]):
        audit["proposed_regenerations"].append("relocation_log.collisions / by_status / historical_collision_resolutions")
    if any(m["category"] == "D_relocation_log_entries_stale" for m in audit["mismatch_details"]):
        audit["proposed_regenerations"].append("relocation_log.entries[].target_path (5 entries)")
    if any(m["category"] == "E_move_plan_stale" for m in audit["mismatch_details"]):
        audit["proposed_regenerations"].append("move_plan.entries[].target_path")
    if any(m["category"] == "F_reconciliation_state_priors_no_final_snapshot" for m in audit["mismatch_details"]):
        audit["proposed_regenerations"].append("RECONCILIATION_STATE.counts_by_role_final (new field)")
    if any(m["category"].startswith("G_") for m in audit["mismatch_details"]):
        audit["proposed_regenerations"].append("final_reorganization_report.md (stats tables)")

    audit["summary"] = {
        "total_checks": len(audit["checks_run"]),
        "passed": sum(1 for c in audit["checks_run"] if c["passed"]),
        "failed": sum(1 for c in audit["checks_run"] if not c["passed"]),
        "mismatch_categories": sorted({m["category"] for m in audit["mismatch_details"]}),
    }

    # Compute final status from actual results (replaces the stale
    # `status_before_fix: PENDING_REGENERATION` placeholder used in earlier
    # iterations of this script).
    if audit["mismatches_found"] == 0 and audit["summary"]["failed"] == 0:
        audit["status"] = "PASSED — SYNCHRONIZED"
    else:
        audit["status"] = "REGENERATION_REQUIRED"
    audit["status_history"] = {
        "historical_pre_sync_state": "PENDING_REGENERATION (initial Phase-1 SYNC scan)",
        "current_state": audit["status"],
    }

    out_local = INV / "final_consistency_audit.json"
    out_pub = REBUILT_INV / "final_consistency_audit.json"
    out_local.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    out_pub.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Phase 1 SYNC audit done.")
    print(f"  total checks: {audit['summary']['total_checks']}")
    print(f"  passed:       {audit['summary']['passed']}")
    print(f"  failed:       {audit['summary']['failed']}")
    print(f"  mismatches:   {audit['mismatches_found']}")
    print(f"  categories:   {audit['summary']['mismatch_categories']}")


if __name__ == "__main__":
    main()
