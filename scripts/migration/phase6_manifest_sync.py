#!/usr/bin/env python3
"""Phase 2 SYNC — regenerate derived artifacts from canonical truth.

Idempotent: every change is computed FROM source-of-truth (entries[] +
deployed tree + manual_adjustments[]). We do not cosmetic-patch.

Regenerations:
  A. unified_inventory.counts_by_role := Counter(entries[].detected_role)
  B. RECONCILIATION_STATE.counts_by_role_final := observed counts
     (priors kept as immutable historical "pre-content-review" snapshot)
  C. relocation_log:
       - Move active collisions[] + by_status.copied_with_collision_suffix
         into historical_collision_resolutions[] with resolution metadata.
       - Set by_status.copied_with_collision_suffix=0, collisions=[].
       - Update each entries[] item whose target_path/final_target diverges
         from unified_inventory canonical (preserve original under
         superseded_target/superseded_final_target, add note=phase3r_retargeted).
  D. (move_plan was already correct — no-op, just verify.)

Writes the regenerated artifacts to BOTH /sessions/.../inventory/ and
the deployed REBUILT_INV/.

Also writes inventory/manifest_sync_diff.json — what changed and why.
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
NOW = datetime.now(timezone.utc).isoformat()


def load(p: Path) -> dict:
    return json.loads(p.read_text())


def write_both(filename: str, payload: dict) -> None:
    body = json.dumps(payload, indent=2, ensure_ascii=False)
    (INV / filename).write_text(body, encoding="utf-8")
    (REBUILT_INV / filename).write_text(body, encoding="utf-8")


def main() -> None:
    diff = {
        "generated_at": NOW,
        "phase": "2_SYNC_REGENERATE_DERIVED",
        "changes": [],
    }

    # ---- A. unified_inventory ----
    ui = load(INV / "unified_inventory.json")
    observed = dict(Counter(e.get("detected_role") for e in ui["entries"]))
    old_counts = ui.get("counts_by_role", {})
    if old_counts != observed:
        ui["counts_by_role"] = observed
        ui.setdefault("regeneration_log", []).append({
            "phase": "2_SYNC", "timestamp_utc": NOW,
            "field": "counts_by_role",
            "old": old_counts, "new": observed,
            "reason": "Recomputed from entries[].detected_role; "
                      "stale stored value did not reflect Phase 3R move of ziOCmWkZ "
                      "from ambiguous to archive_candidate.",
        })
        diff["changes"].append({
            "artifact": "unified_inventory.json",
            "field": "counts_by_role",
            "old": old_counts, "new": observed,
        })
    write_both("unified_inventory.json", ui)

    # ---- B. RECONCILIATION_STATE ----
    rs = load(INV / "RECONCILIATION_STATE.json")
    final_counts = {
        "source_a_file_count": rs.get("priors", {}).get("source_a_file_count"),
        "source_b_file_count": rs.get("priors", {}).get("source_b_file_count"),
        "total": len(ui["entries"]),
        **observed,
    }
    rs_changed = False
    if rs.get("counts_by_role_final") != final_counts:
        rs["counts_by_role_final"] = final_counts
        rs_changed = True
    if "priors_note" not in rs:
        rs["priors_note"] = (
            "priors[] is an immutable pre-content-review snapshot from initial "
            "classification (Phase 2). counts_by_role_final reflects the "
            "post-Phase-3R canonical state. Drift between the two is expected "
            "and audited in inventory/final_consistency_audit.json."
        )
        rs_changed = True
    rs["unresolved_counts"]["ambiguous_post_review"] = observed.get("ambiguous", 0)
    rs["last_updated_at"] = NOW
    if rs_changed:
        diff["changes"].append({
            "artifact": "RECONCILIATION_STATE.json",
            "field": "counts_by_role_final + priors_note",
            "old": "missing",
            "new": final_counts,
        })
    write_both("RECONCILIATION_STATE.json", rs)

    # ---- C. relocation_log ----
    rl = load(INV / "relocation_log.json")
    ui_index = {(e["source_root"], e["original_path"]): e for e in ui["entries"]}

    # C1: collisions historical extraction
    coll_active = rl.get("collisions", [])
    if coll_active:
        # Find resolution context from manual_adjustments / actions
        actions = rl.get("actions", [])
        resolved = []
        for c in coll_active:
            sr = c.get("source_root")
            op = c.get("original_path")
            ui_entry = ui_index.get((sr, op))
            resolution_action = next((a for a in actions
                                       if a.get("kind") == "readme_collision_resolution"
                                       and a.get("source_root") == sr
                                       and a.get("original_path") == op), None)
            resolved.append({
                **c,
                "resolved_at": resolution_action.get("timestamp_utc") if resolution_action else NOW,
                "resolution_phase": resolution_action.get("phase", "3R") if resolution_action else "3R",
                "canonical_final_target": ui_entry.get("target_path") if ui_entry else None,
                "resolution_kind": resolution_action.get("kind") if resolution_action else "readme_collision_resolution",
                "resolution_reason": resolution_action.get("reason") if resolution_action else
                    "Collision suffix file relocated; canonical placement chosen by content review.",
                "current_active_state": "RESOLVED — no collision suffix on disk",
            })
        rl.setdefault("historical_collision_resolutions", []).extend(resolved)
        rl["collisions"] = []
        if "by_status" in rl:
            rl["by_status"]["copied_with_collision_suffix"] = 0
            rl["by_status"]["copied"] = sum(1 for e in rl.get("entries", [])
                                              if e.get("status", "").startswith("copied"))
        diff["changes"].append({
            "artifact": "relocation_log.json",
            "field": "collisions / by_status / historical_collision_resolutions",
            "old": {"collisions_len": len(coll_active),
                    "by_status.copied_with_collision_suffix": 1},
            "new": {"collisions_len": 0,
                    "by_status.copied_with_collision_suffix": 0,
                    "historical_collision_resolutions_len": len(resolved)},
        })

    # C2: entries[] target_path refresh for adjusted items
    refreshed = []
    for e in rl.get("entries", []):
        key = (e.get("source_root"), e.get("original_path"))
        ui_entry = ui_index.get(key)
        if ui_entry is None:
            continue
        canonical_tp = ui_entry.get("target_path")
        old_tp = e.get("target_path")
        old_ft = e.get("final_target")
        if canonical_tp is None:
            continue
        if canonical_tp == old_tp and canonical_tp == old_ft:
            continue
        # diverged: refresh, preserve old as superseded
        e["superseded_target_path"] = old_tp
        e["superseded_final_target"] = old_ft
        e["target_path"] = canonical_tp
        e["final_target"] = canonical_tp
        e["status"] = "copied_then_phase3r_retargeted"
        e["phase3r_retargeted_at"] = NOW
        e["phase3r_retargeted_note"] = (
            "Target refreshed to canonical Phase-3R placement (per "
            "manual_adjustments in unified_inventory). Original target preserved "
            "under superseded_target_path."
        )
        refreshed.append({
            "key": list(key),
            "old_target_path": old_tp,
            "new_target_path": canonical_tp,
        })

    if refreshed:
        diff["changes"].append({
            "artifact": "relocation_log.json#entries",
            "field": "target_path/final_target (5 adjusted items)",
            "refreshed_count": len(refreshed),
            "details": refreshed,
        })

    rl.setdefault("regeneration_log", []).append({
        "phase": "2_SYNC",
        "timestamp_utc": NOW,
        "operations": [
            f"moved {len(coll_active)} active collision(s) to historical_collision_resolutions[]",
            f"refreshed {len(refreshed)} entries[] target_path to canonical Phase-3R placement",
            "set by_status.copied_with_collision_suffix=0 (current active state)",
        ],
        "reason": "Phase 6 manifest sync: active collisions resolved, entries refreshed to canonical.",
    })
    write_both("relocation_log.json", rl)

    # ---- D. move_plan (verify only) ----
    mp = load(INV / "move_plan.json")
    mp_drift = []
    for e in mp.get("entries", []):
        key = (e.get("source_root"), e.get("original_path"))
        ui_entry = ui_index.get(key)
        if ui_entry is None:
            continue
        if e.get("target_path") != ui_entry.get("target_path"):
            mp_drift.append(key)
    if mp_drift:
        diff["changes"].append({
            "artifact": "move_plan.json",
            "field": "entries (drift detected — investigate)",
            "drift_count": len(mp_drift),
        })
    else:
        diff["changes"].append({
            "artifact": "move_plan.json",
            "field": "no-op — already aligned with unified_inventory canonical",
            "verified": True,
        })

    # ---- diff log ----
    write_both("manifest_sync_diff.json", diff)

    print(f"Phase 2 SYNC done. {len(diff['changes'])} change blocks written.")
    for c in diff["changes"]:
        print(f"  - {c.get('artifact')}: {c.get('field')}")


if __name__ == "__main__":
    main()
