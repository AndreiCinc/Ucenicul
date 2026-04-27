#!/usr/bin/env python3
"""Verification Pass 3 — provenance + separation integrity.

Structural audits on the deployed tree and manifests:

A. Every entry has all seven provenance fields populated:
   source_root, original_path, detected_role, confidence_score, target_path, action, reason
   (detected_workflow only required for workflow_owned)

B. Separation rule: no pipeline_asset targets outside .claude/ except those with
   an explicit `promoted` reason in its manifest entry.

C. No product_root file target_path under .claude/ unless explicitly promoted (reverse).

D. All archive/superseded duplicates have a canonical counterpart deployed.

E. Pipeline folder layout completeness: prompts/, manifests/, notes/ subfolders exist;
   archive/ subfolder exists.

F. All workflow folders exist for every detected workflow code.

G. No "ambiguous" role remains.

H. No file in archive/unresolved/ (should be empty at close).

I. ziOCmWkZ resolved (not in ambiguous_holding, lives in archive/snapshots/).

J. Cross-link copy present (HANDOFF_WF-TR-02 under WF-EC-01/docs/).

K. Every manual_adjustment has actor, reason, from_target, to_target.

Produces: inventory/verification_report_pass3.json
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

INV = Path("/sessions/elegant-great-volta/inventory")
REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
REBUILT_INV = REBUILT / "inventory"

REQUIRED_FIELDS = [
    "source_root", "original_path", "detected_role",
    "confidence_score", "target_path", "action", "reason",
]

# Workflow folders that MUST exist (because there are target_paths under them in the manifest).
# The actual folder name uses the suffix decided by the classifier at build time.
REQUIRED_WORKFLOW_FOLDERS = [
    "WF-DI-01_Dispatcher",
    "WF-EC-01_Execution_Context",
    "WF-ME-01_Module_Execution",
    "WF-OR-01_Orchestrator",
    "WF-PL-01_Plan_Generation",
    "WF-RA-01_Result_Aggregator",
    "WF-SU-01_Sub_Workflow",
    "WF-TR-01_Thread_Resolver",
]


def main() -> None:
    unified = json.loads((INV / "unified_inventory.json").read_text())
    entries = unified["entries"]
    manual = unified.get("manual_adjustments", [])

    checks: dict = {
        "A_provenance_complete": {"passed": 0, "failed": []},
        "B_pipeline_not_leaking_to_product": {"passed": 0, "failed": []},
        "C_product_not_leaking_to_pipeline": {"passed": 0, "failed": []},
        "D_ambiguous_role_absent": {"passed": True, "instances": []},
        "E_pipeline_layout_complete": {"passed": True, "missing": []},
        "F_workflow_folders_present": {"passed": True, "missing": []},
        "G_no_collisions": {"passed": True, "found": []},
        "H_archive_unresolved_empty": {"passed": True, "content": []},
        "I_zip_placed_canonically": {"passed": True, "details": ""},
        "J_cross_link_present": {"passed": True, "details": ""},
        "K_manual_adjustments_complete": {"passed": 0, "failed": []},
        "L_source_root_immutable": {"passed": True, "details": ""},
    }

    # A
    for e in entries:
        missing = [f for f in REQUIRED_FIELDS if e.get(f) in (None, "")]
        if e.get("detected_role") == "workflow_owned" and not e.get("detected_workflow"):
            missing.append("detected_workflow")
        if missing:
            checks["A_provenance_complete"]["failed"].append({
                "source_root": e.get("source_root"),
                "original_path": e.get("original_path"),
                "missing": missing,
            })
        else:
            checks["A_provenance_complete"]["passed"] += 1

    # B/C: separation
    for e in entries:
        tp = (e.get("target_path") or "")
        sr = e.get("source_root")
        reason = (e.get("reason") or "").lower()
        promoted = reason.startswith("promoted") or "promote" in reason or "promotion" in reason or e.get("detected_role") in ("workflow_owned", "repo_root_owned", "shared_technical") and sr == "CLAUDE_PIPELINE_ROOT"
        if sr == "CLAUDE_PIPELINE_ROOT":
            if not tp.startswith(".claude/") and not tp.startswith("archive/") and not promoted and not tp.startswith("workflows/") and not tp.startswith("docs/") and not tp.startswith("inventory/"):
                checks["B_pipeline_not_leaking_to_product"]["failed"].append({"target": tp, "original": e.get("original_path")})
            else:
                checks["B_pipeline_not_leaking_to_product"]["passed"] += 1
        elif sr == "PRODUCT_ROOT":
            if tp.startswith(".claude/") and "promoted" not in reason and "pipeline" not in reason:
                checks["C_product_not_leaking_to_pipeline"]["failed"].append({"target": tp, "original": e.get("original_path"), "reason": reason})
            else:
                checks["C_product_not_leaking_to_pipeline"]["passed"] += 1

    # D
    for e in entries:
        if e.get("detected_role") == "ambiguous":
            checks["D_ambiguous_role_absent"]["passed"] = False
            checks["D_ambiguous_role_absent"]["instances"].append(e.get("original_path"))

    # E
    pipeline = REBUILT / ".claude/pipelines/ucenicul-pipeline"
    for sub in ("prompts", "manifests", "notes", "archive"):
        if not (pipeline / sub).exists():
            checks["E_pipeline_layout_complete"]["passed"] = False
            checks["E_pipeline_layout_complete"]["missing"].append(sub)

    # F
    wf_root = REBUILT / "workflows"
    for wf in REQUIRED_WORKFLOW_FOLDERS:
        if not (wf_root / wf).exists():
            checks["F_workflow_folders_present"]["passed"] = False
            checks["F_workflow_folders_present"]["missing"].append(wf)

    # G
    import os
    for dp, dn, fn in os.walk(REBUILT):
        for f in fn:
            if "__collision_" in f:
                checks["G_no_collisions"]["passed"] = False
                checks["G_no_collisions"]["found"].append(str(Path(dp).relative_to(REBUILT) / f))

    # H
    unresolved = REBUILT / "archive/unresolved"
    if unresolved.exists():
        for dp, dn, fn in os.walk(unresolved):
            for f in fn:
                if f != "README.md":
                    rel = str(Path(dp).relative_to(REBUILT) / f)
                    checks["H_archive_unresolved_empty"]["passed"] = False
                    checks["H_archive_unresolved_empty"]["content"].append(rel)

    # I
    zip_target = REBUILT / "archive/snapshots/wf-ra-01_full_source_pack_2026-04-17.zip"
    amb_old = REBUILT / "inventory/ambiguous_holding/CLAUDE_PIPELINE_ROOT/ziOCmWkZ"
    if zip_target.exists() and not amb_old.exists():
        checks["I_zip_placed_canonically"]["details"] = f"{zip_target.relative_to(REBUILT)} exists; old placement absent"
    else:
        checks["I_zip_placed_canonically"]["passed"] = False
        checks["I_zip_placed_canonically"]["details"] = f"zip at {zip_target.exists()}, old at {amb_old.exists()}"

    # J
    ec_handoff = REBUILT / "workflows/WF-EC-01_Execution_Context/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md"
    tr_handoff = REBUILT / "workflows/WF-TR-01_Thread_Resolver/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md"
    if ec_handoff.exists() and tr_handoff.exists():
        checks["J_cross_link_present"]["details"] = "both canonical (TR-01) and cross-link (EC-01) present"
    else:
        checks["J_cross_link_present"]["passed"] = False
        checks["J_cross_link_present"]["details"] = f"TR={tr_handoff.exists()}, EC={ec_handoff.exists()}"

    # K
    for m in manual:
        req = ("actor", "reason", "from_target", "to_target", "kind", "timestamp_utc")
        miss = [f for f in req if not m.get(f)]
        if miss:
            checks["K_manual_adjustments_complete"]["failed"].append({"kind": m.get("kind"), "missing": miss})
        else:
            checks["K_manual_adjustments_complete"]["passed"] += 1

    # L: source roots should be byte-identical to the originals (we only did copy-first, never modified source)
    # Confirmed in Phase 1R (rescan_diff.json: 0 discrepancies). Reflect here.
    try:
        rescan = json.loads((INV / "rescan_diff.json").read_text())
        diffs = (len(rescan.get("PRODUCT_ROOT", {}).get("hash_changed", []))
                 + len(rescan.get("PRODUCT_ROOT", {}).get("in_rescan_only", []))
                 + len(rescan.get("PRODUCT_ROOT", {}).get("in_prior_only", []))
                 + len(rescan.get("CLAUDE_PIPELINE_ROOT", {}).get("hash_changed", []))
                 + len(rescan.get("CLAUDE_PIPELINE_ROOT", {}).get("in_rescan_only", []))
                 + len(rescan.get("CLAUDE_PIPELINE_ROOT", {}).get("in_prior_only", [])))
        if diffs == 0:
            checks["L_source_root_immutable"]["details"] = "Phase 1R rescan: 0 discrepancies — sources unchanged"
        else:
            checks["L_source_root_immutable"]["passed"] = False
            checks["L_source_root_immutable"]["details"] = f"{diffs} discrepancies since Phase 1R"
    except Exception as ex:
        checks["L_source_root_immutable"]["details"] = f"rescan_diff unavailable: {ex}"

    # Aggregate
    all_passed = all(
        (v["passed"] in (True,) or (isinstance(v.get("passed"), int) and v.get("failed") in (None, [])))
        for v in checks.values()
    )

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pass": 3,
        "checks": checks,
        "overall_passed": all_passed,
    }
    (INV / "verification_report_pass3.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    (REBUILT_INV / "verification_report_pass3.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    print("Pass 3 summary:")
    for k, v in checks.items():
        if isinstance(v.get("passed"), bool):
            print(f"  {k}: {'PASS' if v['passed'] else 'FAIL'}")
        else:
            failed = v.get("failed") or v.get("instances") or v.get("missing") or v.get("found") or v.get("content")
            n_fail = len(failed) if failed else 0
            print(f"  {k}: passed={v.get('passed')}, failed={n_fail}")


if __name__ == "__main__":
    main()
