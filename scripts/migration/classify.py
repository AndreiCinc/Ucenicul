#!/usr/bin/env python3
"""Phase 2 classifier.

Inputs:
  inventory/source_root_a_inventory.json
  inventory/source_root_b_inventory.json

Outputs:
  inventory/unified_inventory.json
  inventory/workflow_manifest.json
  inventory/claude_pipeline_manifest.json
  inventory/root_files_manifest.json
  inventory/duplicate_candidates.json
  inventory/ambiguous_files.json
  inventory/move_plan.json

Every entry gains:
  detected_role: one of
    workflow_owned, repo_root_owned, claude_pipeline_asset,
    shared_technical, archive_candidate, duplicate_candidate, ambiguous
  detected_workflow: e.g. "WF-EC-01" or None
  confidence_score: 0.0..1.0
  target_path: relative path inside Ucenicul_REBUILT/
  action: copy, archive, review
  reason: short text

The classifier is CONSERVATIVE: when in doubt, mark ambiguous and place in
inventory/ambiguous or archive/pipeline_legacy as appropriate. No destructive
move planned.
"""
from __future__ import annotations

import json
import os
import re
from collections import defaultdict
from pathlib import Path

INV_DIR = Path("/sessions/elegant-great-volta/inventory")

A = json.loads((INV_DIR / "source_root_a_inventory.json").read_text())
B = json.loads((INV_DIR / "source_root_b_inventory.json").read_text())

ALL: list[dict] = []
ALL.extend(A["entries"])
ALL.extend(B["entries"])

WF_CODE_RE = re.compile(r"WF-[A-Z0-9]{2,4}-\d{2}", re.IGNORECASE)

# Canonical workflow folder name given a workflow code
WORKFLOW_FOLDER_NAMES: dict[str, str] = {
    "WF-DI-01": "WF-DI-01_Dispatcher",
    "WF-EC-01": "WF-EC-01_Execution_Context",
    "WF-ME-01": "WF-ME-01_Module_Execution",
    "WF-OR-01": "WF-OR-01_Orchestrator",
    "WF-PL-01": "WF-PL-01_Plan_Generation",
    "WF-RA-01": "WF-RA-01_Result_Aggregator",
    "WF-RC-01": "WF-RC-01_Response_Composer",
    "WF-TR-01": "WF-TR-01_Thread_Resolver",
    "WF-SU-01": "WF-SU-01_Sub_Workflow",
    "WF-MO-01": "WF-MO-01_Morning_Briefing",
    "WF-E2E-01": "WF-E2E-01_End_To_End",
    "WF-DR-01": "WF-DR-01_Draft_Response",
    "WF-TR-02": "WF-TR-01_Thread_Resolver",  # closeout handoff -> rolls into TR-01
}


def detect_workflow(entry: dict) -> tuple[str | None, float, str]:
    """Return (wf_code, confidence, basis)."""
    path = entry["original_path"]
    name = entry["name"]
    haystack = path
    m = WF_CODE_RE.search(haystack)
    if m:
        code = m.group(0).upper()
        # Normalize TR-02 -> TR-01 since it's a handoff from TR close-out
        norm = WORKFLOW_FOLDER_NAMES.get(code)
        if norm is None:
            # Accept code as-is; track as new
            return code, 0.9, f"wf-code in path: {code}"
        # If code is TR-02 -> we map to TR-01 folder but flag ambiguity of dual-link
        if code == "WF-TR-02":
            return "WF-TR-01", 0.65, "TR-02 handoff rolled to TR-01; cross-link ambiguity"
        return code, 0.92, f"wf-code in path: {code}"
    # Secondary: two-letter folder under workflows/{di,ec,me,or,pl,...}
    parts = path.split("/")
    for i, p in enumerate(parts[:-1]):
        if p.lower() in {"di", "ec", "me", "or", "pl", "ra", "rc", "tr", "mo", "su", "dr"}:
            # Only trust if it sits below workflows/sql | workflows/scripts | workflows/tests | workflows/contracts | workflows/fixtures
            ancestor = "/".join(parts[:i])
            if ancestor.endswith("workflows") or "workflows/" in ancestor + "/":
                code_map = {
                    "di": "WF-DI-01",
                    "ec": "WF-EC-01",
                    "me": "WF-ME-01",
                    "or": "WF-OR-01",
                    "pl": "WF-PL-01",
                    "ra": "WF-RA-01",
                    "rc": "WF-RC-01",
                    "tr": "WF-TR-01",
                    "mo": "WF-MO-01",
                    "su": "WF-SU-01",
                    "dr": "WF-DR-01",
                }
                return code_map[p.lower()], 0.8, f"two-letter dir under workflows/: {p}"
    return None, 0.0, ""


def is_claude_pipeline(entry: dict) -> bool:
    return entry["source_root"] == "CLAUDE_PIPELINE_ROOT"


def is_legacy_restructure_attempt(entry: dict) -> bool:
    return entry["original_path"].startswith("ucenicul_restructured_candidate/")


def is_legacy_handoff_docs(entry: dict) -> bool:
    return entry["original_path"].startswith("docs/ucenicul_claude_handoff_hardened/")


def is_wf_pack_pl01(entry: dict) -> bool:
    return entry["original_path"].startswith("workflows/wf-pl-01_full_source_pack/")


def is_wf_pack_ra01(entry: dict) -> bool:
    return entry["original_path"].startswith("wf-ra-01_full_source_pack/")


def is_tools_n8n_patch(entry: dict) -> bool:
    return entry["original_path"].startswith("tools/n8n-patch/")


def is_snapshots(entry: dict) -> bool:
    return entry["original_path"].startswith("snapshots/") or "/snapshots/" in entry["original_path"]


def is_repo_architecture_doc(entry: dict) -> bool:
    p = entry["original_path"]
    base = entry["name"]
    if not p.startswith("docs/"):
        return False
    if p.startswith("docs/ucenicul_claude_handoff_hardened/"):
        return False
    # only top-level docs/*.md are canonical repo architecture docs
    parts = p.split("/")
    if len(parts) == 2 and base.endswith(".md"):
        return True
    return False


def is_root_product_doc(entry: dict) -> bool:
    p = entry["original_path"]
    if "/" in p:
        return False
    return entry["source_root"] == "PRODUCT_ROOT" and entry["extension"] == ".md"


def is_db_artifact(entry: dict) -> bool:
    return entry["original_path"].startswith("db/")


def is_workflow_root_doc(entry: dict) -> bool:
    """Doc that lives directly at workflows/*.md and is about a specific workflow."""
    p = entry["original_path"]
    parts = p.split("/")
    return len(parts) == 2 and parts[0] == "workflows" and entry["extension"] in {".md", ".sql"}


def is_workflow_root_json(entry: dict) -> bool:
    p = entry["original_path"]
    parts = p.split("/")
    return len(parts) == 2 and parts[0] == "workflows" and entry["extension"] == ".json"


def is_workflow_shared_script(entry: dict) -> bool:
    p = entry["original_path"]
    parts = p.split("/")
    return (
        len(parts) == 3
        and parts[0] == "workflows"
        and parts[1] == "scripts"
        and entry["extension"] in {".js", ".sh"}
    )


def is_pycache(entry: dict) -> bool:
    return "/__pycache__/" in entry["original_path"] or entry["extension"] == ".pyc"


def workflow_subfolder_from_path(path: str) -> str:
    """Map source file into docs/workflow/sql/scripts/tests/assets/reports."""
    pl = path.lower()
    if "/tests/" in pl or pl.endswith("_test.py") or "/tests" in pl:
        return "tests"
    if "/sql/" in pl or pl.endswith(".sql"):
        return "sql"
    if "/scripts/" in pl or pl.endswith(".py") or pl.endswith(".js") or pl.endswith(".sh"):
        return "scripts"
    if pl.endswith(".json"):
        return "workflow"
    if pl.endswith(".md"):
        # Reports vs docs
        name = os.path.basename(path).lower()
        if any(
            name.startswith(p)
            for p in (
                "audit_",
                "build_",
                "closure_",
                "fix_",
                "work_log_",
                "remediation_",
                "post_import_audit_",
                "test_report_",
                "test_after_import_",
                "import_",
                "current_stage",
                "operator_report_",
            )
        ):
            return "reports"
        return "docs"
    return "assets"


def classify(entry: dict) -> dict:
    """Attach classification fields to a copy of entry."""
    e = dict(entry)
    p = e["original_path"]
    name = e["name"]
    ext = e["extension"]

    wf, wf_conf, wf_basis = detect_workflow(e)
    e["detected_workflow"] = wf
    e["workflow_detection_basis"] = wf_basis

    # Defaults
    e["detected_role"] = "ambiguous"
    e["confidence_score"] = 0.3
    e["target_path"] = f"inventory/ambiguous_holding/{e['source_root']}/{p}"
    e["action"] = "review"
    e["reason"] = "unclassified"

    # 0. pycache — always archive
    if is_pycache(e):
        e["detected_role"] = "archive_candidate"
        e["confidence_score"] = 1.0
        e["action"] = "archive"
        e["target_path"] = f"archive/pycache/{e['source_root']}/{p}"
        e["reason"] = "__pycache__ / .pyc — not source"
        return e

    # 1. CLAUDE_PIPELINE_ROOT handling
    if is_claude_pipeline(e):
        # Default: keep under .claude/pipelines/ucenicul-pipeline/
        role = "claude_pipeline_asset"
        target_sub = p  # preserve structure inside pipeline
        conf = 0.9
        reason = "preserved inside .claude pipeline root"

        # Special handling: n8n tools and test harnesses -> scripts/
        if is_tools_n8n_patch(e):
            # These are real test harnesses / patch tools. Keep inside pipeline but mirror under scripts/ not required.
            role = "claude_pipeline_asset"
            target_sub = p
            reason = "pipeline tools/n8n-patch — stays in pipeline"
            conf = 0.85

        # Special handling: wf-ra-01_full_source_pack -> PROMOTED to product workflows/WF-RA-01/
        if is_wf_pack_ra01(e):
            rel = p[len("wf-ra-01_full_source_pack/"):]
            # rel looks like "workflows/WF-RA-01_blueprint.json" or "workflows/scripts/ra/..." etc.
            rparts = rel.split("/")
            folder = WORKFLOW_FOLDER_NAMES["WF-RA-01"]
            e["detected_workflow"] = "WF-RA-01"
            if rparts[0] == "workflows":
                inner = rparts[1:]
                if len(inner) == 1:
                    # top-level workflow file — route via subfolder heuristic
                    sub = workflow_subfolder_from_path(rel)
                    e["target_path"] = f"workflows/{folder}/{sub}/{inner[0]}"
                elif inner[0] == "scripts":
                    remainder = "/".join(inner[2:]) if len(inner) > 2 else inner[-1]
                    e["target_path"] = f"workflows/{folder}/scripts/{remainder}"
                elif inner[0] == "sql":
                    remainder = "/".join(inner[2:]) if len(inner) > 2 else inner[-1]
                    e["target_path"] = f"workflows/{folder}/sql/{remainder}"
                elif inner[0] == "tests":
                    remainder = "/".join(inner[2:]) if len(inner) > 2 else inner[-1]
                    e["target_path"] = f"workflows/{folder}/tests/{remainder}"
                else:
                    e["target_path"] = f"workflows/{folder}/workflow/{'/'.join(inner)}"
            elif rparts[0] == "docs":
                # nested docs/ucenicul_claude_handoff_hardened inside the pack -> archive
                e["detected_role"] = "archive_candidate"
                e["confidence_score"] = 0.8
                e["action"] = "archive"
                e["target_path"] = f"archive/pipeline_legacy/wf-ra-01_full_source_pack/{rel}"
                e["reason"] = "legacy docs nested inside RA-01 source pack"
                return e
            else:
                e["target_path"] = f"workflows/{folder}/assets/{rel}"
            e["detected_role"] = "workflow_owned"
            e["confidence_score"] = 0.88
            e["action"] = "copy"
            e["reason"] = "promoted from pipeline RA-01 source pack to product workflows/"
            return e

        # Special handling: wf-su-01 -> PROMOTED to product workflows/WF-SU-01/
        if p.startswith("wf-su-01/"):
            rel = p[len("wf-su-01/"):]
            folder = WORKFLOW_FOLDER_NAMES["WF-SU-01"]
            e["detected_workflow"] = "WF-SU-01"
            sub = workflow_subfolder_from_path(rel)
            e["detected_role"] = "workflow_owned"
            e["confidence_score"] = 0.88
            e["action"] = "copy"
            e["target_path"] = f"workflows/{folder}/{sub}/{rel}"
            e["reason"] = "promoted from pipeline wf-su-01/ to product workflows/WF-SU-01/"
            return e

        # docs/ubcinful_claude_handoff_hardened inside pipeline -> archive legacy pipeline docs
        if p.startswith("docs/ucenicul_claude_handoff_hardened/"):
            role = "archive_candidate"
            e["detected_role"] = role
            e["confidence_score"] = 0.8
            e["action"] = "archive"
            e["target_path"] = f"archive/pipeline_legacy/docs/{p.split('/', 1)[1]}"
            e["reason"] = "legacy handoff docs mirrored into pipeline"
            return e

        # snapshots/ inside pipeline -> pipeline archive area
        if p.startswith("snapshots/"):
            e["detected_role"] = "claude_pipeline_asset"
            e["confidence_score"] = 0.85
            e["action"] = "copy"
            e["target_path"] = f".claude/pipelines/ucenicul-pipeline/archive/{p}"
            e["reason"] = "pipeline runtime snapshot — archived inside pipeline"
            return e

        # workflows/ inside pipeline root -> pipeline notes archive (not product workflows)
        if p.startswith("workflows/"):
            e["detected_role"] = "claude_pipeline_asset"
            e["confidence_score"] = 0.75
            e["action"] = "copy"
            e["target_path"] = f".claude/pipelines/ucenicul-pipeline/archive/{p}"
            e["reason"] = "pipeline-scoped workflow scratch — kept separate from product workflows/"
            return e

        # STATE.json, STATE_*.json, FIX_LOG_*, CLOSURE_REPORT_*, AUDIT_REPORT_*, BUILD_REPORT_*
        if name in {"STATE.json", "CURRENT_STAGE.md", "AUDIT_REPORT.md", "BUILD_REPORT.md", "CLOSURE_REPORT.md", "FIX_LOG.md"}:
            e["detected_role"] = "claude_pipeline_asset"
            e["confidence_score"] = 0.95
            e["action"] = "copy"
            e["target_path"] = f".claude/pipelines/ucenicul-pipeline/manifests/{p}"
            e["reason"] = "pipeline active-stage pointer"
            return e

        # Per-workflow reports inside pipeline (e.g. CLOSURE_REPORT_WF-EC-01.md)
        if wf and any(
            name.startswith(pref)
            for pref in (
                "AUDIT_REPORT_",
                "BUILD_REPORT_",
                "CLOSURE_REPORT_",
                "FIX_LOG_",
                "WORK_LOG_",
            )
        ):
            e["detected_role"] = "claude_pipeline_asset"
            e["confidence_score"] = 0.85
            e["action"] = "copy"
            e["target_path"] = f".claude/pipelines/ucenicul-pipeline/notes/{wf}/{name}"
            e["reason"] = f"pipeline per-workflow report for {wf}"
            return e

        # Numbered playbook docs (00_*.md..21_*.md) and sub-agent prompts (n8n-*.md) -> prompts/
        if re.match(r"^\d{2}_.*\.md$", name) or name in {
            "README.md",
            "CLAUDE.md",
            "00_ROUTE_MAP.md",
            "n8n-fixer.md",
            "n8n-reader.md",
            "n8n-tester.md",
        }:
            e["detected_role"] = "claude_pipeline_asset"
            e["confidence_score"] = 0.98
            e["action"] = "copy"
            e["target_path"] = f".claude/pipelines/ucenicul-pipeline/prompts/{p}"
            e["reason"] = "pipeline playbook / sub-agent prompt"
            return e

        # Per-workflow stage/analysis/audit markdown that also references a WF code goes to notes/<wf>/
        if wf and ext == ".md":
            e["detected_role"] = "claude_pipeline_asset"
            e["confidence_score"] = 0.8
            e["action"] = "copy"
            e["target_path"] = f".claude/pipelines/ucenicul-pipeline/notes/{wf}/{name}"
            e["reason"] = f"pipeline notes for {wf}"
            return e

        # Pipeline-root WF-<CODE>-01_*.json at top level = PROMOTED live runtime workflow capture
        if wf and ext == ".json" and "/" not in p:
            folder = WORKFLOW_FOLDER_NAMES.get(wf, wf)
            e["detected_role"] = "workflow_owned"
            e["confidence_score"] = 0.82
            e["action"] = "copy"
            e["target_path"] = f"workflows/{folder}/workflow/{name}"
            e["reason"] = f"promoted: live runtime workflow JSON for {wf} captured in pipeline root"
            return e

        # Top-level pipeline-root files that look like opaque artifacts (zip, binary) -> ambiguous archive
        if ext in {".zip", ".bin", ""} and "/" not in p:
            e["detected_role"] = "ambiguous"
            e["confidence_score"] = 0.2
            e["action"] = "review"
            e["target_path"] = f"inventory/ambiguous_holding/CLAUDE_PIPELINE_ROOT/{p}"
            e["reason"] = "opaque pipeline artifact (zip/binary with no obvious owner) — needs review"
            return e

        # Default: keep under pipeline notes/
        e["detected_role"] = "claude_pipeline_asset"
        e["confidence_score"] = 0.65
        e["action"] = "copy"
        e["target_path"] = f".claude/pipelines/ucenicul-pipeline/notes/{p}"
        e["reason"] = reason
        return e

    # 2. PRODUCT_ROOT handling
    # 2a. Archive candidate: the pre-existing restructured candidate is a superseded attempt
    if is_legacy_restructure_attempt(e):
        e["detected_role"] = "archive_candidate"
        e["confidence_score"] = 0.9
        e["action"] = "archive"
        e["target_path"] = f"archive/superseded/ucenicul_restructured_candidate/{p[len('ucenicul_restructured_candidate/'):]}"
        e["reason"] = "previous single-root restructure attempt; superseded by this dual-root pass"
        return e

    # 2b. Legacy handoff docs under docs/ucenicul_claude_handoff_hardened — treat as legacy_docs
    if is_legacy_handoff_docs(e):
        rel = p[len("docs/ucenicul_claude_handoff_hardened/"):]
        # If the file has a WF code, give it a workflow-attributed home inside docs/archive/
        if wf:
            e["detected_role"] = "archive_candidate"
            e["confidence_score"] = 0.85
            e["action"] = "archive"
            e["target_path"] = f"archive/legacy_docs/ucenicul_claude_handoff_hardened/{rel}"
            e["reason"] = f"legacy handoff doc referencing {wf}"
            return e
        e["detected_role"] = "archive_candidate"
        e["confidence_score"] = 0.8
        e["action"] = "archive"
        e["target_path"] = f"archive/legacy_docs/ucenicul_claude_handoff_hardened/{rel}"
        e["reason"] = "legacy handoff docs snapshot"
        return e

    # 2c. wf-pl-01 full source pack nested under workflows/
    if is_wf_pack_pl01(e):
        rel = p[len("workflows/wf-pl-01_full_source_pack/"):]
        e["detected_role"] = "archive_candidate"
        e["confidence_score"] = 0.9
        e["action"] = "archive"
        e["target_path"] = f"archive/legacy_workflows/wf-pl-01_full_source_pack/{rel}"
        e["reason"] = "nested legacy source pack inside workflows/"
        return e

    # 2d. Top-level repo docs
    if is_root_product_doc(e):
        e["detected_role"] = "repo_root_owned"
        e["confidence_score"] = 1.0
        e["action"] = "copy"
        e["target_path"] = name  # at REBUILT root
        e["reason"] = "top-level repo-level product doc"
        return e

    # 2e. Architecture / migration / module-spec / thread / memory / workflow-mapping docs
    if is_repo_architecture_doc(e):
        low = name.lower()
        sub = "architecture"
        if "migration_plan" in low:
            sub = "migration"
        elif "module_spec_" in low or "module_registry" in low:
            sub = "architecture"
        elif "n8n_workflow_mapping" in low:
            sub = "architecture"
        elif "thread_resolution" in low or "memory_model" in low:
            sub = "architecture"
        elif "documentation_verification" in low or "checklist" in low:
            sub = "operations"
        e["detected_role"] = "repo_root_owned"
        e["confidence_score"] = 0.95
        e["action"] = "copy"
        e["target_path"] = f"docs/{sub}/{name}"
        e["reason"] = f"canonical repo doc -> docs/{sub}/"
        return e

    # 2f. DB artifacts
    if is_db_artifact(e):
        rel = p[len("db/"):]
        e["detected_role"] = "shared_technical"
        e["confidence_score"] = 0.95
        e["action"] = "copy"
        e["target_path"] = f"db/{rel}"
        e["reason"] = "db artifact preserved under db/"
        return e

    # 2g. Workflow-root documents/sql/json at workflows/*
    parts = p.split("/")
    if parts[0] == "workflows":
        # shared scripts like workflows/scripts/*.js
        if is_workflow_shared_script(e):
            e["detected_role"] = "shared_technical"
            e["confidence_score"] = 0.9
            e["action"] = "copy"
            e["target_path"] = f"scripts/workflow_shared/{parts[-1]}"
            e["reason"] = "cross-workflow build/test helper"
            return e

        # workflows/contracts/**
        if len(parts) >= 2 and parts[1] == "contracts":
            wf_code_inferred = wf
            if not wf_code_inferred:
                # look at folder name if two-letter
                if len(parts) >= 3 and parts[2].lower() in {"ec", "or", "pl", "tr", "me", "di", "ra", "rc", "mo", "su"}:
                    wf_code_inferred = {
                        "di": "WF-DI-01",
                        "ec": "WF-EC-01",
                        "me": "WF-ME-01",
                        "or": "WF-OR-01",
                        "pl": "WF-PL-01",
                        "ra": "WF-RA-01",
                        "rc": "WF-RC-01",
                        "tr": "WF-TR-01",
                        "mo": "WF-MO-01",
                        "su": "WF-SU-01",
                    }[parts[2].lower()]
                    e["detected_workflow"] = wf_code_inferred
            if wf_code_inferred:
                folder = WORKFLOW_FOLDER_NAMES.get(wf_code_inferred, wf_code_inferred)
                e["detected_role"] = "workflow_owned"
                e["confidence_score"] = 0.9
                e["action"] = "copy"
                e["target_path"] = f"workflows/{folder}/docs/contracts/{parts[-1]}"
                e["reason"] = "workflow contract spec"
                return e

        # workflows/fixtures/TC-*.json  => WF-TR-01 thread resolution test cases
        if (
            len(parts) == 3
            and parts[1] == "fixtures"
            and parts[2].startswith("TC-")
            and ext == ".json"
        ):
            folder = WORKFLOW_FOLDER_NAMES["WF-TR-01"]
            e["detected_workflow"] = "WF-TR-01"
            e["detected_role"] = "workflow_owned"
            e["confidence_score"] = 0.85
            e["action"] = "copy"
            e["target_path"] = f"workflows/{folder}/tests/fixtures/{parts[-1]}"
            e["reason"] = "thread-resolver test case fixture (TC-*)"
            return e

        # workflows/fixtures/setup_test_data.sql => shared fixture setup
        if len(parts) == 3 and parts[1] == "fixtures" and parts[2] == "setup_test_data.sql":
            e["detected_role"] = "shared_technical"
            e["confidence_score"] = 0.8
            e["action"] = "copy"
            e["target_path"] = "testing/fixtures/setup_test_data.sql"
            e["reason"] = "shared test-data setup (cross-workflow)"
            return e

        # workflows/contracts/<TopLevelMd> not under ec/or/... — classify by name
        if (
            len(parts) == 3
            and parts[1] == "contracts"
            and parts[2].lower().startswith("thread")
            and ext == ".md"
        ):
            folder = WORKFLOW_FOLDER_NAMES["WF-TR-01"]
            e["detected_workflow"] = "WF-TR-01"
            e["detected_role"] = "workflow_owned"
            e["confidence_score"] = 0.9
            e["action"] = "copy"
            e["target_path"] = f"workflows/{folder}/docs/contracts/{parts[-1]}"
            e["reason"] = "Thread Resolution contract spec"
            return e

        # workflows/fixtures/**
        if len(parts) >= 2 and parts[1] == "fixtures":
            wf_code_inferred = wf
            if not wf_code_inferred and len(parts) >= 3 and parts[2].lower() in {"ec", "or", "pl", "tr", "me", "di", "ra", "rc", "mo", "su"}:
                wf_code_inferred = {
                    "ec": "WF-EC-01", "or": "WF-OR-01", "pl": "WF-PL-01",
                    "tr": "WF-TR-01", "me": "WF-ME-01", "di": "WF-DI-01",
                    "ra": "WF-RA-01", "rc": "WF-RC-01", "mo": "WF-MO-01",
                    "su": "WF-SU-01",
                }[parts[2].lower()]
                e["detected_workflow"] = wf_code_inferred
            if wf_code_inferred:
                folder = WORKFLOW_FOLDER_NAMES.get(wf_code_inferred, wf_code_inferred)
                e["detected_role"] = "workflow_owned"
                e["confidence_score"] = 0.9
                e["action"] = "copy"
                e["target_path"] = f"workflows/{folder}/tests/fixtures/{parts[-1]}"
                e["reason"] = "workflow fixture"
                return e

        # workflows/sql/{di,ec,me,or,pl}/*.sql
        if len(parts) >= 3 and parts[1] in {"sql", "scripts", "tests"}:
            sub = parts[1]
            short = parts[2].lower()
            sub_code_map = {
                "ec": "WF-EC-01", "or": "WF-OR-01", "pl": "WF-PL-01",
                "tr": "WF-TR-01", "me": "WF-ME-01", "di": "WF-DI-01",
                "ra": "WF-RA-01", "rc": "WF-RC-01", "mo": "WF-MO-01",
                "su": "WF-SU-01",
            }
            if short in sub_code_map:
                wf_code_inferred = sub_code_map[short]
                e["detected_workflow"] = wf_code_inferred
                folder = WORKFLOW_FOLDER_NAMES.get(wf_code_inferred, wf_code_inferred)
                remainder = "/".join(parts[3:])
                e["detected_role"] = "workflow_owned"
                e["confidence_score"] = 0.9
                e["action"] = "copy"
                e["target_path"] = f"workflows/{folder}/{sub}/{remainder}"
                e["reason"] = f"workflow {sub} asset for {wf_code_inferred}"
                return e

        # top-level workflow file (e.g. workflows/WF-EC-01_blueprint.json)
        if len(parts) == 2:
            if wf:
                folder = WORKFLOW_FOLDER_NAMES.get(wf, wf)
                sub = workflow_subfolder_from_path(p)
                e["detected_role"] = "workflow_owned"
                e["confidence_score"] = 0.95 if sub in {"workflow", "reports", "docs", "sql"} else 0.8
                e["action"] = "copy"
                e["target_path"] = f"workflows/{folder}/{sub}/{name}"
                e["reason"] = f"top-level workflow file for {wf} ({sub})"
                return e
            # top-level workflow file with no code -> ambiguous
            e["detected_role"] = "ambiguous"
            e["confidence_score"] = 0.3
            e["action"] = "review"
            e["target_path"] = f"inventory/ambiguous_holding/PRODUCT_ROOT/{p}"
            e["reason"] = "workflows/* file without WF code"
            return e

    # 2h. Files at PRODUCT_ROOT root with extension other than .md (env example etc)
    if "/" not in p:
        e["detected_role"] = "repo_root_owned"
        e["confidence_score"] = 0.9
        e["action"] = "copy"
        e["target_path"] = name
        e["reason"] = "root-level repo artifact"
        return e

    # Fallback: ambiguous
    return e


CLASSIFIED = [classify(x) for x in ALL]

# Duplicate detection: same sha256 across sources
by_hash: dict[str, list[dict]] = defaultdict(list)
for e in CLASSIFIED:
    if e["sha256"]:
        by_hash[e["sha256"]].append(e)
duplicates = [v for v in by_hash.values() if len(v) > 1]

# Pick canonical for each duplicate group
ROLE_RANK = {
    "workflow_owned": 0,
    "repo_root_owned": 1,
    "shared_technical": 2,
    "claude_pipeline_asset": 3,
    "ambiguous": 4,
    "archive_candidate": 5,
    "duplicate_candidate": 5,
}


def _canon_key(e: dict) -> tuple:
    # Lower is better
    return (
        ROLE_RANK.get(e["detected_role"], 9),
        -float(e.get("confidence_score") or 0.0),
        0 if e["source_root"] == "PRODUCT_ROOT" else 1,
        e["original_path"],
    )


dup_records = []
for group in duplicates:
    canonical = min(group, key=_canon_key)
    dup_records.append(
        {
            "sha256": canonical["sha256"],
            "size_bytes": canonical["size_bytes"],
            "canonical": {
                "source_root": canonical["source_root"],
                "original_path": canonical["original_path"],
                "target_path": canonical["target_path"],
            },
            "duplicates": [
                {
                    "source_root": e["source_root"],
                    "original_path": e["original_path"],
                    "original_target_path": e["target_path"],
                }
                for e in group
                if e is not canonical
            ],
        }
    )
    # Reroute non-canonical duplicates to archive/superseded/
    for e in group:
        if e is canonical:
            continue
        e["detected_role"] = "duplicate_candidate"
        e["action"] = "archive"
        old_target = e["target_path"]
        e["target_path"] = f"archive/superseded/duplicates/{e['source_root']}/{e['original_path']}"
        e["reason"] = f"byte-identical duplicate of {canonical['source_root']}:{canonical['original_path']} ({canonical['target_path']})"

# Buckets
workflow_manifest: dict[str, list[dict]] = defaultdict(list)
claude_pipeline_manifest: list[dict] = []
root_files_manifest: list[dict] = []
ambiguous: list[dict] = []
archived: list[dict] = []
shared_technical: list[dict] = []

for e in CLASSIFIED:
    if e["detected_role"] == "workflow_owned" and e["detected_workflow"]:
        workflow_manifest[e["detected_workflow"]].append(e)
    elif e["detected_role"] == "claude_pipeline_asset":
        claude_pipeline_manifest.append(e)
    elif e["detected_role"] == "repo_root_owned":
        root_files_manifest.append(e)
    elif e["detected_role"] == "ambiguous":
        ambiguous.append(e)
    elif e["detected_role"] in ("archive_candidate", "duplicate_candidate"):
        archived.append(e)
    elif e["detected_role"] == "shared_technical":
        shared_technical.append(e)

# Write outputs
(INV_DIR / "unified_inventory.json").write_text(
    json.dumps(
        {
            "total_files": len(CLASSIFIED),
            "source_a_count": A["file_count"],
            "source_b_count": B["file_count"],
            "counts_by_role": {
                role: sum(1 for e in CLASSIFIED if e["detected_role"] == role)
                for role in sorted({e["detected_role"] for e in CLASSIFIED})
            },
            "entries": CLASSIFIED,
        },
        indent=2,
        ensure_ascii=False,
    ),
    encoding="utf-8",
)

(INV_DIR / "workflow_manifest.json").write_text(
    json.dumps(
        {
            "workflows": {
                wf: {
                    "folder": WORKFLOW_FOLDER_NAMES.get(wf, wf),
                    "file_count": len(items),
                    "files": items,
                }
                for wf, items in sorted(workflow_manifest.items())
            }
        },
        indent=2,
        ensure_ascii=False,
    ),
    encoding="utf-8",
)

(INV_DIR / "claude_pipeline_manifest.json").write_text(
    json.dumps({"file_count": len(claude_pipeline_manifest), "files": claude_pipeline_manifest}, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

(INV_DIR / "root_files_manifest.json").write_text(
    json.dumps({"file_count": len(root_files_manifest), "files": root_files_manifest}, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

(INV_DIR / "duplicate_candidates.json").write_text(
    json.dumps({"group_count": len(dup_records), "groups": dup_records}, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

(INV_DIR / "ambiguous_files.json").write_text(
    json.dumps({"file_count": len(ambiguous), "files": ambiguous}, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

(INV_DIR / "move_plan.json").write_text(
    json.dumps(
        {
            "total_files": len(CLASSIFIED),
            "entries": [
                {
                    "source_root": e["source_root"],
                    "original_path": e["original_path"],
                    "original_path_host": e["original_path_host"],
                    "sha256": e["sha256"],
                    "size_bytes": e["size_bytes"],
                    "detected_role": e["detected_role"],
                    "detected_workflow": e["detected_workflow"],
                    "confidence_score": e["confidence_score"],
                    "target_path": e["target_path"],
                    "action": e["action"],
                    "reason": e["reason"],
                }
                for e in CLASSIFIED
            ],
        },
        indent=2,
        ensure_ascii=False,
    ),
    encoding="utf-8",
)

# Print summary
print("=== Classification summary ===")
print(f"Total: {len(CLASSIFIED)}")
from collections import Counter
c = Counter(e["detected_role"] for e in CLASSIFIED)
for k, v in sorted(c.items(), key=lambda kv: -kv[1]):
    print(f"  {k:25s} {v}")
print(f"Workflows detected: {sorted(workflow_manifest.keys())}")
print(f"Duplicate groups: {len(dup_records)}")
print(f"Ambiguous: {len(ambiguous)}")
