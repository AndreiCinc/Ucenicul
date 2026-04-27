#!/usr/bin/env python3
"""Fresh recursive scan of both roots and diff against previous inventory.

Writes rescan_diff.json with:
  - in_prior_only: files that were in old inventory but missing now (rare; would indicate deletes)
  - in_rescan_only: files that exist now but weren't in old inventory (omissions)
  - hash_changed: same path, different hash (updates)
  - identical: count
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

INV = Path("/sessions/elegant-great-volta/inventory")
REBUILT_INV = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT/inventory")

SOURCE_A_VM = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul")
SOURCE_B_VM = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/.claude/ucenicul-pipeline")


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(1 << 16)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def scan(root: Path, label: str) -> dict[str, dict]:
    result: dict[str, dict] = {}
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
                digest = sha256_of(fp)
            except OSError:
                digest = ""
            result[rel] = {
                "source_root": label,
                "original_path": rel,
                "size_bytes": st.st_size,
                "sha256": digest,
                "mtime_iso": datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat(),
            }
    return result


def load_prior(name: str) -> dict[str, dict]:
    data = json.loads((INV / name).read_text())
    out: dict[str, dict] = {}
    for e in data["entries"]:
        out[e["original_path"]] = e
    return out


def diff(prior: dict[str, dict], rescan: dict[str, dict]) -> dict:
    prior_keys = set(prior.keys())
    rescan_keys = set(rescan.keys())
    in_prior_only = sorted(prior_keys - rescan_keys)
    in_rescan_only = sorted(rescan_keys - prior_keys)
    hash_changed = []
    identical = 0
    for k in prior_keys & rescan_keys:
        if prior[k]["sha256"] != rescan[k]["sha256"]:
            hash_changed.append(
                {
                    "path": k,
                    "prior_sha": prior[k]["sha256"],
                    "now_sha": rescan[k]["sha256"],
                    "prior_size": prior[k]["size_bytes"],
                    "now_size": rescan[k]["size_bytes"],
                }
            )
        else:
            identical += 1
    return {
        "prior_count": len(prior_keys),
        "rescan_count": len(rescan_keys),
        "identical": identical,
        "in_prior_only": in_prior_only,
        "in_rescan_only": in_rescan_only,
        "hash_changed": hash_changed,
    }


def main() -> None:
    a_rescan = scan(SOURCE_A_VM, "PRODUCT_ROOT")
    b_rescan = scan(SOURCE_B_VM, "CLAUDE_PIPELINE_ROOT")
    a_prior = load_prior("source_root_a_inventory.json")
    b_prior = load_prior("source_root_b_inventory.json")

    a_diff = diff(a_prior, a_rescan)
    b_diff = diff(b_prior, b_rescan)

    # Save rescan inventories as inventory/source_root_*_inventory_rescan.json
    for label, data in (("a", a_rescan), ("b", b_rescan)):
        source_label = "PRODUCT_ROOT" if label == "a" else "CLAUDE_PIPELINE_ROOT"
        entries = list(data.values())
        out = {
            "source_root": source_label,
            "file_count": len(entries),
            "total_bytes": sum(e["size_bytes"] for e in entries),
            "entries": entries,
        }
        (INV / f"source_root_{label}_inventory_rescan.json").write_text(
            json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "PRODUCT_ROOT": a_diff,
        "CLAUDE_PIPELINE_ROOT": b_diff,
        "total_in_rescan": len(a_rescan) + len(b_rescan),
        "total_in_prior": len(a_prior) + len(b_prior),
    }
    (INV / "rescan_diff.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"PRODUCT_ROOT prior={len(a_prior)} rescan={len(a_rescan)} identical={a_diff['identical']} new={len(a_diff['in_rescan_only'])} missing={len(a_diff['in_prior_only'])} hash_changed={len(a_diff['hash_changed'])}")
    print(f"PIPELINE_ROOT prior={len(b_prior)} rescan={len(b_rescan)} identical={b_diff['identical']} new={len(b_diff['in_rescan_only'])} missing={len(b_diff['in_prior_only'])} hash_changed={len(b_diff['hash_changed'])}")


if __name__ == "__main__":
    main()
