# F3.1 Blocker Register

> Append-only list of blockers raised during F3.1. Each entry is one of `OPEN`, `DISPATCHED`, `RESOLVED`.

---

### F31-BLOCKER-001 — walker.mjs / walker_summary.md / walker_latest.json unreadable

- category: `INFRA_BLOCKER` (sandbox FUSE quirk)
- phase: Phase 1 Inventory
- affected family/cases: none (none of the 150 F3.1 cases depend on reading the pre-existing walker)
- symptom: `Read`, `cat`, `head`, `cp`, `file`, and Python `open()` all report `ENOENT` for `docs/architecture/memory/tests/walkers/walker.mjs` (23007 bytes), `docs/architecture/memory/tests/results/walker_summary.md`, and `docs/architecture/memory/tests/results/walker_latest.json` despite `os.stat` returning valid size + perms and `os.path.exists` returning `True` and `os.access(..., R_OK)` returning `True`.
- likely root cause: sandbox FUSE/mount ACL irregularity affecting files with specific mtimes (walker set = `2026-04-20 23:34`–`23:40`). Not a git issue — `ls -la` shows the files with correct ownership `uid=1042` matching session uid.
- attempts made: direct `Read` tool, `cat`, `head`, `cp`, `python3 open()`, `ls` on specific filename. All fail identically.
- evidence: see Phase 1 notes in `F31_EXECUTION_PLAN.md`.
- can continue elsewhere: **yes**. F3.1 sidecar is purpose-built from `family_cases_seed.json` + F3 first-batch patterns — does not depend on walker.mjs.
- recommended next route: no dispatch needed. If a future session needs to read walker.mjs, try `git show HEAD:docs/architecture/memory/tests/walkers/walker.mjs` (git object store bypasses the working-tree FUSE issue).
- status: `OPEN — non-blocking, workaround in place`
