#!/usr/bin/env python3
"""Phase 1 scanner — produces source_root_a_inventory.json and source_root_b_inventory.json.

Each entry carries: source_root, original_path (posix, relative),
original_path_host (Windows), size_bytes, sha256, extension, top_level_segment,
name, mtime_iso, mime_hint.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

SOURCE_A_VM = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul")
SOURCE_A_HOST = r"C:\\Users\\andre\\OneDrive\\Documents\\Claude\\Projects\\Ucenicul\\Ucenicul"
SOURCE_B_VM = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/.claude/ucenicul-pipeline")
SOURCE_B_HOST = r"C:\\Users\\andre\\OneDrive\\Documents\\Claude\\Projects\\Ucenicul\\.claude\\ucenicul-pipeline"

OUT_DIR = Path("/sessions/elegant-great-volta/inventory")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MIME_BY_EXT = {
    ".md": "text/markdown",
    ".json": "application/json",
    ".sql": "application/sql",
    ".py": "text/x-python",
    ".yml": "text/yaml",
    ".yaml": "text/yaml",
    ".sh": "text/x-shellscript",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".html": "text/html",
    ".ts": "text/typescript",
    ".js": "text/javascript",
    ".env": "text/plain",
    ".example": "text/plain",
    ".log": "text/plain",
    ".cfg": "text/plain",
    ".ini": "text/plain",
    ".toml": "text/toml",
    ".rar": "application/x-rar-compressed",
    ".zip": "application/zip",
    ".gif": "image/gif",
    ".png": "image/png",
    ".pdf": "application/pdf",
}


def sha256_of(path: Path, chunk: int = 1 << 16) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def scan(root: Path, source_label: str, host_root: str) -> list[dict]:
    entries: list[dict] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Keep deterministic order
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
            ext = fp.suffix.lower()
            top = rel.split("/", 1)[0] if "/" in rel else ""
            host_path = host_root + "\\" + rel.replace("/", "\\")
            try:
                digest = sha256_of(fp)
            except OSError:
                digest = ""
            entries.append(
                {
                    "source_root": source_label,
                    "original_path": rel,
                    "original_path_host": host_path,
                    "name": name,
                    "extension": ext,
                    "top_level_segment": top,
                    "size_bytes": st.st_size,
                    "mtime_iso": datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat(),
                    "sha256": digest,
                    "mime_hint": MIME_BY_EXT.get(ext, "application/octet-stream"),
                }
            )
    return entries


def main() -> None:
    a = scan(SOURCE_A_VM, "PRODUCT_ROOT", SOURCE_A_HOST)
    b = scan(SOURCE_B_VM, "CLAUDE_PIPELINE_ROOT", SOURCE_B_HOST)

    (OUT_DIR / "source_root_a_inventory.json").write_text(
        json.dumps(
            {
                "source_root": "PRODUCT_ROOT",
                "source_root_host": SOURCE_A_HOST,
                "source_root_vm": str(SOURCE_A_VM),
                "file_count": len(a),
                "total_bytes": sum(e["size_bytes"] for e in a),
                "entries": a,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (OUT_DIR / "source_root_b_inventory.json").write_text(
        json.dumps(
            {
                "source_root": "CLAUDE_PIPELINE_ROOT",
                "source_root_host": SOURCE_B_HOST,
                "source_root_vm": str(SOURCE_B_VM),
                "file_count": len(b),
                "total_bytes": sum(e["size_bytes"] for e in b),
                "entries": b,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    print(f"SOURCE A: {len(a)} files, {sum(e['size_bytes'] for e in a)} bytes")
    print(f"SOURCE B: {len(b)} files, {sum(e['size_bytes'] for e in b)} bytes")


if __name__ == "__main__":
    main()
