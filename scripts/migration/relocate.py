#!/usr/bin/env python3
"""Phase 4 relocator — executes move_plan.json as pure copies.

- NEVER deletes source files.
- NEVER silently overwrites a destination (would rename with __collision_N suffix).
- Verifies hash after each copy.
- Emits inventory/relocation_log.json and copies manifests into REBUILT/inventory/.
"""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
SOURCE_A = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul")
SOURCE_B = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/.claude/ucenicul-pipeline")
INV = Path("/sessions/elegant-great-volta/inventory")

PLAN = json.loads((INV / "move_plan.json").read_text())


def sha256_of(path: Path, chunk: int = 1 << 16) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def resolve_source(e: dict) -> Path:
    if e["source_root"] == "PRODUCT_ROOT":
        return SOURCE_A / e["original_path"]
    return SOURCE_B / e["original_path"]


def main() -> None:
    results = []
    skipped = []
    collided = []

    for e in PLAN["entries"]:
        src = resolve_source(e)
        tgt = REBUILT / e["target_path"]

        if not src.exists():
            results.append(
                {
                    **e,
                    "status": "source_missing",
                    "hash_before": e["sha256"],
                    "hash_after": None,
                    "final_target": str(tgt.relative_to(REBUILT)),
                }
            )
            skipped.append(str(src))
            continue

        tgt.parent.mkdir(parents=True, exist_ok=True)

        final_target = tgt
        collision = False
        if tgt.exists():
            # If identical content, skip silently
            try:
                if sha256_of(tgt) == e["sha256"]:
                    results.append(
                        {
                            **e,
                            "status": "target_exists_identical",
                            "hash_before": e["sha256"],
                            "hash_after": e["sha256"],
                            "final_target": str(tgt.relative_to(REBUILT)),
                        }
                    )
                    continue
            except OSError:
                pass
            # Otherwise rename to collision slot
            collision = True
            stem = tgt.stem
            suf = tgt.suffix
            n = 1
            while True:
                candidate = tgt.with_name(f"{stem}__collision_{n}{suf}")
                if not candidate.exists():
                    final_target = candidate
                    break
                n += 1

        try:
            shutil.copy2(src, final_target)
            h_after = sha256_of(final_target)
            status = "copied"
            if collision:
                status = "copied_with_collision_suffix"
                collided.append(
                    {
                        "target_path_original": str(tgt.relative_to(REBUILT)),
                        "final_target": str(final_target.relative_to(REBUILT)),
                        "source_root": e["source_root"],
                        "original_path": e["original_path"],
                    }
                )
            if h_after != e["sha256"]:
                status = f"hash_mismatch ({status})"
            results.append(
                {
                    **e,
                    "status": status,
                    "hash_before": e["sha256"],
                    "hash_after": h_after,
                    "final_target": str(final_target.relative_to(REBUILT)),
                }
            )
        except OSError as err:
            results.append(
                {
                    **e,
                    "status": f"copy_error:{err}",
                    "hash_before": e["sha256"],
                    "hash_after": None,
                    "final_target": str(final_target.relative_to(REBUILT)),
                }
            )

    # Write relocation log
    log = {
        "total": len(results),
        "by_status": {},
        "collisions": collided,
        "skipped_missing": skipped,
        "entries": results,
    }
    from collections import Counter

    log["by_status"] = dict(Counter(r["status"] for r in results))

    (INV / "relocation_log.json").write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")

    # Also copy every inventory JSON into REBUILT/inventory/
    for name in (
        "source_root_a_inventory.json",
        "source_root_b_inventory.json",
        "unified_inventory.json",
        "workflow_manifest.json",
        "claude_pipeline_manifest.json",
        "root_files_manifest.json",
        "duplicate_candidates.json",
        "ambiguous_files.json",
        "move_plan.json",
        "relocation_log.json",
    ):
        src_j = INV / name
        if src_j.exists():
            shutil.copy2(src_j, REBUILT / "inventory" / name)

    print("=== Relocation summary ===")
    for k, v in sorted(log["by_status"].items()):
        print(f"  {k:40s} {v}")
    print(f"Collisions: {len(collided)}")
    print(f"Skipped (missing): {len(skipped)}")


if __name__ == "__main__":
    main()
