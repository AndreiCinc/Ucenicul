# STANDARDIZATION_DECISION

Run ID: `run_2026-04-19_autonomous`
Mission mode: `repo_reconcile` + `docs_standardization` (no live n8n; no `package_final`).
Authority: `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` (active canonical standard).

## 1. Minimum-touch remediation policy

Per operator pack `00_OPERATING_MODEL.md` principle 2 ("Minimal justified write") and standard §7.4 ("Principle of minimum-touch"), this run makes the **smallest set of changes** that raises each workflow to a verifiable tier compliance while avoiding:

- fabricating contracts that are not on disk,
- rewriting existing READMEs that are already adequate,
- slimming non-slim blueprint JSONs (larger refactor; canonical source is already unambiguous via naming rule),
- renaming files (delete is gated; rename via copy + pointer is acceptable only when strong evidence exists),
- destructive deletes (forbidden and gated),
- live n8n mutation (out of this run's mode).

## 2. What this run does do

For every in-scope workflow:

1. **Create `state/` subfolder** (missing in 10/10 WFs) with:
   - `state/README.md` — minimal subfolder README per standard §6.2 + explicit pointer to legacy STATE location if one exists.
   - `state/STATE__<WF>.json` — authoritative status snapshot per standard §5.7. Where a legacy STATE JSON exists under `reports/` or `docs/`, its content (the strong evidence) is used to seed the canonical file. Unknown fields are `null` / `"TBD"`, never invented.
2. **Create subfolder README** where a subfolder has files but no README. Applies to: `docs/`, `reports/`, `sql/`, `scripts/`, `tests/`, `workflow/` (when workflow/ has >1 file or subfolders). Uses standard §6.2 template.
3. **Record explicit gaps** in `state/STATE__<WF>.json → missing` array and in `WORKFLOW_RUN_RECORD__<WF>.md` for:
   - missing `WF-XX-01_CONTRACTS.md`,
   - missing `WF-XX-01_TEST_MATRIX.md` (where absent),
   - duplicate-full "blueprint" JSONs,
   - misplaced reports/STATE files,
   - missing LIVE_EXECUTIONS or CLOSURE_REPORT (where role demands them).
4. **Document archived/foreign material** in the appropriate subfolder README rather than silently relocating.

## 3. What this run deliberately does NOT do

- **Does not create CONTRACTS files** where they are absent. Writing a CONTRACTS file without strong evidence would fabricate interface guarantees not grounded in the JSON. Gap is recorded; future pass (or `wf-sync` skill when authored) should derive CONTRACTS from the validator `jsCode` nodes of the canonical JSON per standard §5.2.
- **Does not create TEST_MATRIX files** where they are absent. Same fabrication risk.
- **Does not slim the duplicate-full blueprint JSONs** for WF-OR-01, WF-PL-01, WF-DI-01, WF-ME-01. Slimming requires byte-identity verification against the canonical JSON and regeneration in the canonical slim shape; this is a multi-step refactor beyond minimal-remediation scope.
- **Does not rename any existing file.** `WF-RA-01_Result_Aggregator_LIVE.json`, `reports/STATE_WF-SU-01.json` (single-underscore drift), and `reports/CLOSURE_REPORT_WF-SU-01.md` (single-underscore drift) remain as-is. Canonical state file is **newly created** at the correct path; legacy files become documented historical copies.
- **Does not relocate misfiled reports** in WF-RC-01 from `docs/` to `reports/`. Relocation requires delete of the source, which is gated by the cowork sandbox. Record as gap; future pass can re-run with an environment that supports delete.
- **Does not touch live n8n.** No patch, no read, no roundtrip. Repo-only mode.

## 4. Tier assignments applied in this run

| WF | Tier declared in new STATE file | Justification |
|---|---|---|
| WF-TR-01 | `standard` | MCP trigger, rich tests, no explicit closure/live proof. |
| WF-EC-01 | `standard` | Has closure, but no LIVE_EXECUTIONS on disk. |
| WF-OR-01 | `standard` | Scaffold-plus; no closure. |
| WF-PL-01 | `standard` | Closed with 10/10 live proof in STATE; CRITICAL promotion deferred — requires `tier: critical` explicit opt-in. |
| WF-DI-01 | `standard` | Closure present; STATE has closure evidence. |
| WF-ME-01 | `standard` | Closure present; no LIVE_EXECUTIONS file. |
| WF-RA-01 | `standard` | Closure present; `_LIVE` in filename hints at live verification but no standalone LIVE_EXECUTIONS file. |
| WF-SU-01 | `standard` (with CRITICAL-grade evidence) | VERIFIER_DELIVERY + SU_LIVE_EXECUTIONS + VERIFIER_DELIVERY imply CRITICAL, but canonical `tier: critical` opt-in is deferred until the reports/docs misplacement is resolved. Evidence recorded in STATE. |
| WF-MO-01 | `standard` | `pre_live_ready` posture per README; no closure yet. |
| WF-RC-01 | `standard` | Closure present but misfiled; deferring CRITICAL opt-in until artifacts relocate. |

All tier promotions to CRITICAL are **deferred** — promotion is explicit per standard §2 "Tier promotion and demotion", and requires the CRITICAL-tier report set to be at the canonical location AND the state file to declare `tier: critical`. Neither is true today for any WF. `standard` is the correct conservative classification for this run.

## 5. Expected verdicts per workflow

Given the minimum-touch scope and the explicit gap list, each in-scope workflow is expected to reach **`PASS_WITH_EXPLICIT_GAPS`** — not `PASS` — because CONTRACTS are missing in 9/10 and other gaps remain. This is the correct final state per operator pack `07_DONE_CRITERIA_PER_MODE.md` for `docs_standardization` mode: "mandatory README/doc artifacts exist by tier; contradictions are reduced to explicit gaps; no over-documentation for SMALL workflows".

No workflow is expected to reach `QUARANTINED` under this scope.

## 6. Explicit scope boundaries

This run does NOT:
- modify `docs/architecture/` (higher-authority spec per CLAUDE.md authority hierarchy),
- modify `brain_contract.json`,
- modify `docs/migration/`,
- modify `workflows/README.md` (top-level index is already accurate per `workflows/README.md` §1 and §2; changes would be shared-manifest edits outside this pass's write-boundary policy),
- modify `FINAL_CANONICAL_BASELINE.md` (shared-root file; edits only after stronger workflow-specific truth exists per `05_WRITE_BOUNDARIES.md`).

It does NOT modify:
- `_ARCHIVED_Executor_Closer_stub/` (archived, its own README is sufficient),
- `workflows/contracts/`, `workflows/fixtures/`, `workflows/scripts/` (shared legacy folders superseded by per-WF copies; out of scope).
