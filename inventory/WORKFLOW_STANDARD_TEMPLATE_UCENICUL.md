# WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md

> **Role.** Canonical template any `workflows/WF-*/` folder in this repo must conform to. Applies to humans, to Claude, and to any future `wf-*` skill or agent.
>
> **Status.** Active. Single source of truth for workflow folder shape, file contracts, lookup order, and maintenance procedure.
>
> **Authority.** Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md` and `docs/architecture/n8n_Workflow_Mapping.md`. In case of conflict with those specs, they win. In case of conflict with any other `inventory/*.md` document (including `WORKFLOW_STANDARDIZATION_PLAN.md`), this file wins.
>
> **Relation to previous docs.**
> - `inventory/WORKFLOW_STANDARDIZATION_PLAN.md` — previous proposal doc. SUPERSEDED as canonical standard. Kept as historical migration roadmap (it contains the rollout plan for the 8 scaffolds that still need population). All forward decisions reference THIS file, not that one.
> - `inventory/WORKFLOW_COVERAGE_AUDIT.md` — audit report, not a standard. Uses this template as its reference.
> - `FINAL_CANONICAL_BASELINE.md` §6 — repo file inventory. Uses this template's folder shape as its reference.
>
> **What this file is NOT.** Not a migration plan. Not an audit. Not a rewrite. It defines the shape. Existing workflows are brought to compliance incrementally.

---

## 1. Purpose

This template exists so that **any Claude instance entering any workflow folder can answer four questions within the first minute:**

1. What does this workflow do? → `README.md`
2. Where is its truth implementation? → `workflow/<WF-code>_<Name>.json`
3. What interface does it expose? → `docs/WF-<code>_CONTRACTS.md`
4. Is it live, paused, drifted, or obsolete? → `state/STATE__WF-<code>.json` + `README.md` status line

Everything else is a tier-dependent elaboration on those four anchors.

**Problem this solves.**
Before standardization, workflows accumulated overlapping docs (NODE_MAP + CONNECTION_MAP + FLOW.md + blueprint.json + workflow.json all claiming authority over topology), stale status cards, and READMEs that contradicted the actual JSON. Result: Claude had to read 5 files to figure out what 1 file should already tell it, and a minor `jsCode` tweak cost 10 document updates.

**Design principles.**
- **Contracts > prose.** Narrative descriptions duplicate the JSON and drift. Contracts (inputs, outputs, lineage fields, error envelopes) are stable.
- **Canonical sources win.** Every fact has exactly one source of truth. Other documents reference it, they don't paraphrase it.
- **Slim > complete.** A workflow that passes the SMALL tier is compliant. CRITICAL tier is opt-in, not default.
- **Self-describing subfolders.** Any subfolder containing files has a `README.md`. No exceptions.
- **Proportional updates.** A `jsCode` or SQL tweak updates one artifact. A structural change updates more. Contract changes update the contract file. Status changes update the status card.

## 2. Workflow Tiers

Every workflow is classified into one tier. Tier determines documentation depth.

### Tier 1 — SMALL

**When.** Workflow has ≤5 nodes, no Postgres writes, no external provider calls with side effects, no handoff to another workflow, no patching history. Pure local logic or a trivial cron.

**Example.** A cron that fires an existing workflow on a schedule. A passthrough with a single code node. WF-00 Morning Briefing pre-population.

**REQUIRED files.**

```
WF-XX-01_Name/
  README.md                               # 30–60 lines
  workflow/
    WF-XX-01_Name.json                    # the n8n export (canonical)
  state/
    STATE__WF-XX-01.json                  # 5–10 keys
```

**OPTIONAL files.** `docs/WF-XX-01_CONTRACTS.md` (only if the workflow exposes a callable interface), `reports/` (only if an audit has been done).

**FORBIDDEN / OVERKILL.** NODE_MAP, CONNECTION_MAP, IMPORT_PATCH_PLAN, VERIFIER_DELIVERY, LIVE_EXECUTIONS, FIX_LOG, BUILD_REPORT, CLOSURE_REPORT. These are CRITICAL-tier artifacts and add no value at SMALL tier.

### Tier 2 — STANDARD

**When.** Workflow has 6–20 nodes, at least one Postgres read or write, routing switches, may hand off to another workflow, but has not been subjected to a live-verification cycle. Default for most modular workflows mid-development.

**Example.** WF-TR-01 Thread Resolver, WF-PL-01 Plan Generation in a scaffold-but-not-closed state.

**REQUIRED files.**

```
WF-XX-01_Name/
  README.md
  workflow/
    WF-XX-01_Name.json
    patches/
      README.md
  docs/
    README.md
    WF-XX-01_CONTRACTS.md
    WF-XX-01_TEST_MATRIX.md
  reports/
    README.md
  state/
    README.md
    STATE__WF-XX-01.json
```

**OPTIONAL files.** `sql/` (if any SQL lives outside the JSON), `scripts/` (if off-node Python/JS exists), `tests/` (if tests exist), `assets/` (diagrams/screenshots). Each optional subfolder that contains files has a `README.md`.

**FORBIDDEN / OVERKILL.** NODE_MAP and CONNECTION_MAP unless a structural deviation from the JSON has been noted. `IMPORT_PATCH_PLAN.md` unless a pending patch exists.

### Tier 3 — CRITICAL

**When.** Workflow is live-verified with V1–V7 proofs, OR has significant side effects (outbound messages, state writes, replay-guarded operations), OR has a documented drift risk, OR hosts a sensitive inter-workflow handoff. Promotion to CRITICAL is explicit and recorded in `state/STATE__WF-XX-01.json` as `tier: critical`.

**Example.** WF-MO-01 Message Out (outbound provider calls + replay guard), WF-RC-01 Response Composer (user-visible output), WF-SU-01 State Persistence Updater (state mutations).

**REQUIRED files.** Everything STANDARD requires, plus:

```
WF-XX-01_Name/
  docs/
    WF-XX-01_NODE_MAP.md                  # if topology is non-obvious
    WF-XX-01_CONNECTION_MAP.md            # if routing/fanout is non-obvious
    WF-XX-01_IMPORT_PATCH_PLAN.md         # if the n8n import requires rebinding
  reports/
    AUDIT_REPORT__WF-XX-01.md             # one per audit cycle
    BUILD_REPORT__WF-XX-01.md             # one per major build
    CLOSURE_REPORT__WF-XX-01.md           # when closed after live verification
    FIX_LOG__WF-XX-01.md                  # running fix log
    VERIFIER_DELIVERY__WF-XX-01.md        # verifier handoff pack
    LIVE_EXECUTIONS__WF-XX-01.md          # live run proof log
```

**OPTIONAL at CRITICAL.** `tests/results/` (off-node test output), `assets/` (flow diagrams).

**FORBIDDEN even at CRITICAL.** Narrative duplicates of the workflow JSON (a prose "what this workflow does" longer than 200 words). Multiple conflicting CONTRACTS files. Reports that restate the contract instead of validating it.

### Tier promotion and demotion

- A workflow enters the repo at SMALL or STANDARD. CRITICAL is earned, not assumed.
- Promotion SMALL → STANDARD: triggered by adding a Postgres write, a handoff, or a switch. Required artifacts are added in the same commit.
- Promotion STANDARD → CRITICAL: triggered by live verification completion OR by the architecture spec declaring it critical. Requires `CLOSURE_REPORT` to exist.
- Demotion is allowed only when the workflow is archived. Archived workflows follow `§11 Example B` pattern.

## 3. Canonical Folder Shape

This is the SHAPE OF A FOLDER, not the shape of every workflow. Tier defines which of these files are present.

```
WF-XX-01_Name/
├── README.md                              # ALWAYS. Entry point + status card. §6.
├── workflow/                              # ALWAYS. The canonical implementation.
│   ├── README.md                          # if other files exist here
│   ├── WF-XX-01_Name.json                 # ALWAYS. The n8n export.
│   ├── last_sync.json                     # optional, populated by wf-sync skill.
│   └── patches/                           # optional subfolder
│       ├── README.md                      # if any patch file exists
│       └── <patch files>
├── docs/                                  # STANDARD+ tier onward
│   ├── README.md
│   ├── WF-XX-01_CONTRACTS.md              # STANDARD+. Interface contract. §4.C.
│   ├── WF-XX-01_TEST_MATRIX.md            # STANDARD+.
│   ├── WF-XX-01_NODE_MAP.md               # CRITICAL only, if non-obvious.
│   ├── WF-XX-01_CONNECTION_MAP.md         # CRITICAL only, if non-obvious.
│   └── WF-XX-01_IMPORT_PATCH_PLAN.md      # CRITICAL only, if applicable.
├── state/                                 # STANDARD+ tier onward
│   ├── README.md
│   └── STATE__WF-XX-01.json               # ALWAYS when folder exists.
├── reports/                               # STANDARD+ tier onward
│   ├── README.md
│   └── <per-tier report files>
├── sql/                                   # OPTIONAL. Only if SQL exists outside the JSON.
│   ├── README.md
│   └── <sql files>
├── scripts/                               # OPTIONAL. Only if off-node scripts exist.
│   ├── README.md
│   └── <script files>
├── tests/                                 # OPTIONAL.
│   ├── README.md
│   └── <test files>
└── assets/                                # OPTIONAL.
    ├── README.md
    └── <asset files>
```

**Rules.**

- **Any subfolder containing files has a `README.md`.** No exceptions. If the subfolder is empty, `README.md` is optional.
- **Subfolder name is semantic, not decorative.** `workflow/` is not `workflows/` (plural is the top-level repo folder; singular is inside a workflow). `docs/` is not `documentation/`. Names are locked.
- **File names follow a fixed pattern.** Workflow JSON = `WF-XX-01_<Name>.json`. Docs = `WF-XX-01_<DOCUMENT_TYPE>.md`. State = `STATE__WF-XX-01.json`. Reports = `<TYPE>__WF-XX-01.md`. No lowercase codes (`wf-xx-01_*` is rejected).
- **Handoff bundles that arrive pre-packaged** (e.g. `ucenicul_claude_handoff_hardened/`) may sit as a subdir inside `docs/` OR be flattened into `docs/`. Both are allowed. Do NOT relocate them to `reports/` — they are docs, not reports.
- **`reports/` vs `state/`.** A report is a narrative about a point in time. The state is the current status. If it changes shape as the workflow evolves, it's state. If it describes what happened during a specific cycle, it's a report.

## 4. Information Lookup Order

This is the **single most important section** for any Claude entering a workflow. It tells you exactly where to look for each kind of information, in priority order.

When two sources disagree, the HIGHER-PRIORITY source wins and the lower one is flagged as stale by Claude.

### 4.A Identity / Status (what is this workflow, and is it live?)

1. `README.md` status card (top of file)
2. `state/STATE__WF-XX-01.json` — `status`, `posture`, `last_verified`, `tier`
3. `reports/CLOSURE_REPORT__WF-XX-01.md` — only for CRITICAL tier
4. `reports/VERIFIER_DELIVERY__WF-XX-01.md` — only for CRITICAL tier
5. Fallback: `workflow/WF-XX-01_Name.json` — `active` flag and `updatedAt`

### 4.B Real Implementation (what does this workflow actually do?)

1. `workflow/WF-XX-01_Name.json` — the canonical artifact, live n8n export
2. `workflow/patches/*.json` — applied overlays (if overlay patches exist)
3. `reports/LIVE_EXECUTIONS__WF-XX-01.md` — only for CRITICAL tier (live proof)
4. Fallback: `docs/WF-XX-01_NODE_MAP.md` + `WF-XX-01_CONNECTION_MAP.md` — ONLY when the JSON is unavailable or disputed

**Never read narrative prose as a source for implementation truth. If it contradicts the JSON, the JSON wins.**

### 4.C Interface Contracts (what inputs/outputs does this workflow expose?)

1. `docs/WF-XX-01_CONTRACTS.md` — canonical contract document
2. `README.md` §Inputs / §Outputs — summary pointers only, not the contract itself
3. Validator `jsCode` nodes inside the `workflow/WF-XX-01_Name.json` — implementation, not the contract
4. Fallback: the TEST_MATRIX — inferrable from what's tested

**Prose contracts in the README are pointers. The contract file is truth.**

### 4.D Topology (how are nodes connected?)

1. `workflow/WF-XX-01_Name.json` — the `connections` block is truth
2. `docs/WF-XX-01_CONNECTION_MAP.md` — human-readable view (CRITICAL only)
3. `docs/WF-XX-01_NODE_MAP.md` — per-node summary (CRITICAL only)
4. If none of the docs exist, infer from the JSON

**Do not write NODE_MAP / CONNECTION_MAP at SMALL or STANDARD tier. They duplicate the JSON and become stale.**

### 4.E Runtime Proof (did this actually run in production?)

1. `reports/LIVE_EXECUTIONS__WF-XX-01.md`
2. `reports/CLOSURE_REPORT__WF-XX-01.md`
3. `reports/VERIFIER_DELIVERY__WF-XX-01.md`
4. `state/STATE__WF-XX-01.json` — `last_verified`, `live_runs`

### 4.F Patches (what has been applied on top of the base JSON?)

1. `workflow/patches/*.json` — the patch files themselves
2. `reports/FIX_LOG__WF-XX-01.md` — chronological log
3. `reports/VERIFIER_DELIVERY__WF-XX-01.md` — what the verifier accepted
4. Fallback: `git log` on `workflow/`

### Priority rule for conflicts (applies to all categories)

```
live-verified CLOSURE_REPORT + current STATE + canonical workflow JSON
  > VERIFIER_DELIVERY
  > patches applied
  > pre-live handoff docs
  > old audits (anything older than last closure)
  > narrative prose anywhere
```

Claude must assume that anything below the highest-priority source is **suspect** until verified against the higher source.

## 5. Missing Artifact Rules

When Claude enters a workflow and detects a missing artifact, it follows these rules **instead of writing placeholder content or skipping**.

### 5.1 Missing `README.md` at workflow root

Claude **creates** it from:
- `workflow/WF-XX-01_Name.json` (for name, node count, triggers, active flag)
- `state/STATE__WF-XX-01.json` (for status/posture)
- `docs/WF-XX-01_CONTRACTS.md` (for inputs/outputs summary)
- `reports/CLOSURE_REPORT__WF-XX-01.md` (for last verified date, if CRITICAL)

Produced README follows §6.1 template. Claude does **not** invent information — missing fields get `TBD` or `unknown`.

### 5.2 Missing `docs/WF-XX-01_CONTRACTS.md`

Claude **creates** it from:
- The validator `jsCode` nodes inside `workflow/WF-XX-01_Name.json` (inputs)
- The return-result and return-error code nodes (outputs + error envelopes)
- `docs/WF-XX-01_TEST_MATRIX.md` (if it exists — tested invariants map to contract clauses)
- `README.md` §Inputs / §Outputs (if they exist — but only as pointers)

Claude does **not** invent fields that are not in the JSON. It lists what it found and marks gaps explicitly.

### 5.3 Missing `workflow/WF-XX-01_blueprint.json`

First: check whether a full `workflow/WF-XX-01_Name.json` already exists. If yes, a blueprint is OPTIONAL and should be a **slim metadata summary**, not a duplicate. The slim blueprint contains only:

```json
{
  "workflow_name": "WF-XX-01 Name",
  "workflow_code": "WF-XX-01",
  "node_count": 14,
  "connection_count": 16,
  "triggers": ["executeWorkflowTrigger", "manualTrigger"],
  "guard_switches": ["RC_Route_Valid", "RC_Route_Context_Ready"],
  "postgres_nodes": ["RC_Load_Execution_Context", "RC_Load_Thread_Context"],
  "code_nodes": 11,
  "posture": "pre_live_ready"
}
```

Never duplicate the full JSON. A blueprint that is a byte-for-byte copy of the workflow JSON is a bug.

If no workflow JSON exists at all, Claude does not fabricate one. It writes a PENDING_WIRING report instead.

### 5.4 README contradicts `workflow/*.json` + `reports/CLOSURE_REPORT`

Claude **updates the README** to match the JSON and the closure report. The README is narrative; the JSON + closure are evidence. Claude never inverts truth to preserve a stale README.

When the contradiction is material (the README claims `active: false` but the JSON has `active: true` and a recent CLOSURE_REPORT), Claude also writes a one-line entry in `reports/FIX_LOG__WF-XX-01.md` noting what it reconciled.

### 5.5 Both `workflow/*.json` and `workflow/patches/*.json` exist

Claude determines relation:

- **Overlay patch** (the patch modifies a subset of nodes on top of the base): keep both. Patch stays in `workflow/patches/`. Base stays at `workflow/WF-XX-01_Name.json`.
- **Superseding patch** (the patch has been applied and represents the new canonical): the old JSON is moved to `workflow/patches/<date>_pre_patch_base.json` (as history) OR to a future `workflow/archive/` subdir. The patch's result becomes `workflow/WF-XX-01_Name.json`. A note goes in `reports/FIX_LOG`.
- **Ambiguous**: Claude marks both and writes a REMEDIATION entry, does not delete.

### 5.6 Subfolder with files but no `README.md`

Claude **creates** the subfolder README per §6.2 template, describing what the files are and what they're NOT the source of truth for.

### 5.7 Missing `state/STATE__WF-XX-01.json`

Claude **creates** it with minimal keys:

```json
{
  "workflow_code": "WF-XX-01",
  "workflow_name": "WF-XX-01 Name",
  "tier": "standard",
  "status": "scaffold",
  "posture": "unknown",
  "last_sync": null,
  "last_verified": null,
  "live_runs": 0,
  "owner": "TBD"
}
```

Fields Claude cannot determine are `null` or `"TBD"`, never invented.

## 6. README Rules

### 6.1 Workflow root `README.md` template (~40–80 lines)

Required sections in this order:

```markdown
# WF-XX-01 <Canonical Name>

> **Status card**
> - code: `WF-XX-01`
> - tier: `small` | `standard` | `critical`
> - n8n_id: `<n8n workflow id>`
> - n8n_active: true | false
> - status: `scaffold` | `populated` | `live_verified` | `archived`
> - posture: `scaffold` | `pre_live_ready` | `live_closed` | `drifted`
> - last_sync: <YYYY-MM-DD> | `none`
> - owner: <name> | `TBD`

## Role

2–4 sentences. What role this workflow plays in the pipeline. No duplication of node-level detail.

## Upstream / Downstream

- Upstream: `WF-YY-01` (expected caller) — summary of what it delivers
- Downstream: `WF-ZZ-01` (next stage) — summary of what is handed off

## Source of truth

- **Implementation**: `workflow/WF-XX-01_<Name>.json`
- **Contracts**: `docs/WF-XX-01_CONTRACTS.md`
- **Tests**: `docs/WF-XX-01_TEST_MATRIX.md` (+ `tests/` if present)
- **Reports**: `reports/` (per-tier files)
- **State**: `state/STATE__WF-XX-01.json`

## NOT source of truth

- Any narrative in this README that conflicts with the JSON or closure report — the README is a pointer, not the contract.
- NODE_MAP / CONNECTION_MAP at SMALL / STANDARD tier (do not exist intentionally).

## Last updated

<YYYY-MM-DD> — <short reason>
```

The README is **stable** and **cheap to maintain**. A `jsCode` tweak does not update the README. Only rarely: role change, status change, source-of-truth change, handoff change.

### 6.2 Subfolder `README.md` template (~15–30 lines)

Required sections in this order:

```markdown
# <subfolder-name>/

## Purpose

1–3 sentences. Why this subfolder exists.

## Contents

Brief listing of what files live here, grouped if many:
- `<file>` — one-line description
- ...

## Canonicality

Which of these files is the source of truth for which kind of information. Example:
- `WF-XX-01_CONTRACTS.md` is the source of truth for the callable interface.
- `WF-XX-01_TEST_MATRIX.md` documents tested invariants, not the contract itself.

## Not source of truth

What this subfolder is NOT authoritative for, so Claude does not overread it:
- Topology (that lives in `workflow/WF-XX-01_Name.json`).
- Status (that lives in `state/STATE__WF-XX-01.json`).
```

### 6.3 What a good README is NOT

- Not a node-by-node walk-through.
- Not a reproduction of the workflow JSON in prose.
- Not an audit report.
- Not a changelog (that's `reports/FIX_LOG`).
- Not a long design rationale (that's in `docs/architecture/`).

## 7. Documentation Slimming Rules

This section exists to prevent bureaucracy. **It is mandatory reading for anyone (or any agent) generating or updating workflow docs.**

### 7.1 What triggers a documentation update

| Change type | README | CONTRACTS | NODE_MAP | CONNECTION_MAP | TEST_MATRIX | FIX_LOG | CLOSURE_REPORT |
|---|---|---|---|---|---|---|---|
| `jsCode` logic tweak, no interface change | no | no | no | no | no | optional | no |
| SQL query tweak (same shape) | no | no | no | no | no | optional | no |
| Switch condition edit | no | no | no | no | no | optional | no |
| New node added | no | no | yes (CRITICAL) | yes (CRITICAL) | no | yes | no |
| Node removed | yes | if interface | yes (CRITICAL) | yes (CRITICAL) | yes | yes | no |
| Input field added/removed | yes | yes | no | no | yes | yes | no |
| Output field added/removed | yes | yes | no | no | yes | yes | no |
| Handoff target change | yes | yes | no | yes (CRITICAL) | yes | yes | yes (CRITICAL) |
| Tier promotion | yes | no | produce if CRITICAL | produce if CRITICAL | no | no | produce if CRITICAL |
| Status change (scaffold → populated → live) | yes | no | no | no | no | no | yes (CRITICAL) |
| Rebase after n8n edit without semantic change | no | no | no | no | no | no | no |

**Default: no update.** Only update when the table above says yes.

### 7.2 Tier-based required minima

| Tier | README | CONTRACTS | TEST_MATRIX | STATE | NODE_MAP | CONNECTION_MAP | IMPORT_PATCH_PLAN | VERIFIER_DELIVERY | LIVE_EXECUTIONS | FIX_LOG |
|---|---|---|---|---|---|---|---|---|---|---|
| SMALL | required | no | no | required | no | no | no | no | no | no |
| STANDARD | required | required | required | required | no | no | no | no | no | no |
| CRITICAL | required | required | required | required | allowed | allowed | allowed | allowed | allowed | allowed |

`allowed` at CRITICAL means: produce if there is a real reason (topology is non-obvious, import requires rebinding, fix log is actively maintained). Do not produce as placeholder-only files.

### 7.3 Reports lifecycle

- Closure reports are **not rewritten** for micro-fixes. A `jsCode` tweak that does not change stage status does not touch the closure report.
- A closure report is updated only when the stage itself changes (`pre_live_ready` → `live_closed`, or `live_closed` → `drifted`).
- FIX_LOG is an **append-only** file. Each entry is 1–3 lines. No entry is rewritten.

### 7.4 Principle of minimum-touch

When editing a workflow, Claude:

1. Computes the **minimum set of files** that must change per §7.1.
2. Edits only those files.
3. Does not re-verify or re-stamp unrelated files.
4. Does not regenerate NODE_MAP / CONNECTION_MAP unless their source (JSON) has structurally changed.

## 8. File Classification Model

Every file in a workflow folder is in exactly one of these classes. Claude labels files during inventory (§9.3).

| Class | Meaning | Example |
|---|---|---|
| `canonical` | The single source of truth for its information category. | `workflow/WF-XX-01_Name.json` (implementation), `docs/WF-XX-01_CONTRACTS.md` (interface), `state/STATE__WF-XX-01.json` (status) |
| `supporting` | Derived view of canonical content. Must not be read as authority. | `docs/WF-XX-01_NODE_MAP.md`, `docs/WF-XX-01_CONNECTION_MAP.md`, slim blueprint.json |
| `patch` | Overlay applied to canonical. Ordered by filename. | `workflow/patches/2026-04-19_add_replay_guard.json` |
| `historical` | Former canonical, preserved for provenance. Not authoritative. | `workflow/patches/pre_patch_base.json`, past closure reports for older stages |
| `stale` | Was current, is now out of date. Pending reconciliation or deletion. | README that contradicts the JSON; a TEST_MATRIX referencing removed nodes |
| `foreign` | Does not belong to this workflow. May be a delivery-pack leftover or a misfile. | `CLAUDE_PROMPT__WF-XX-01.txt` at the root (belongs in `reports/`) |
| `missing_dependency` | Referenced by name but not present. | A report that cites `docs/NODE_MAP.md` but no such file exists |

**Rules.**

- `foreign` files are **moved**, not deleted. Claude finds the correct subfolder and relocates.
- `stale` files are **reconciled first**, then either updated or removed. Claude never overwrites without reconciling.
- `historical` files are preserved indefinitely but excluded from the lookup order in §4.
- `supporting` files are regenerated from the canonical on demand, not edited directly (unless the generator is manual).

## 9. Standard Operating Procedure for Claude

When Claude enters a workflow folder, it follows this sequence. **It may not skip to step 7 or beyond until steps 1–6 are complete.**

### 9.1 Step 1 — Inspect

List everything in the folder. Identify:
- Folder name matches `WF-XX-01_<Name>` pattern (underscored, no spaces, no `/`, no mixed separators).
- Root has a `README.md`.
- Tier is declared in `state/STATE__WF-XX-01.json` → `tier` field (or inferred from node count if state is missing).

### 9.2 Step 2 — Inventory

List every file. Group by subfolder. Record size and modification time. Do NOT read file contents yet.

### 9.3 Step 3 — Classify

Apply §8 labels to every file. Write the classification to a scratch list (not to disk unless asked).

### 9.4 Step 4 — Detect missing artifacts

Against the tier's required-minima table in §7.2, list files that should exist but don't. Apply §5 rules to create each missing artifact — but do not yet write. Collect the pending list.

### 9.5 Step 5 — Reconcile conflicts

For every file labeled `stale` in step 3:

1. Identify the higher-priority source per §4.
2. Determine the correct content.
3. Queue the update (don't write yet).

For files labeled `foreign`:
1. Identify correct subfolder per §3.
2. Queue the move.

### 9.6 Step 6 — Create missing READMEs

For every subfolder containing files but lacking a README:

1. Apply §6.2 template.
2. Populate from what the files actually are (not from assumptions).
3. Queue the write.

### 9.7 Step 7 — Update minimal docs only where required

Apply §7.1. For each queued change from steps 4–6, verify it's in the allowed update set. Execute the writes and moves.

### 9.8 Step 8 — Validate canonicality

Re-check: does each information category (§4) have exactly one canonical source? Are all `supporting` files consistent with their canonical source? Are there remaining `stale` files?

### 9.9 Step 9 — Package only if requested

Packaging (zipping, assembling handoff bundles, producing verifier deliveries) happens only when the user asks explicitly. Claude does not proactively package.

### 9.10 What Claude may NOT do

- Jump directly to cleanup or packaging (skipping steps 1–8).
- Delete `historical` files.
- Overwrite canonical files based on supporting files.
- Invent contract fields or interface claims that are not grounded in the JSON or tests.
- Create NODE_MAP / CONNECTION_MAP at SMALL or STANDARD tier.
- Rewrite a closure report for a micro-fix.
- Mutate files in other workflow folders as a side effect.

## 10. Acceptance Criteria

A workflow folder is **standard-compliant** when ALL of the following hold.

1. **Folder name** matches `WF-XX-01_<PascalCase_or_Snake_role>` with underscores only.
2. **`README.md` exists at root** and conforms to §6.1.
3. **Every subfolder containing files has `README.md`** per §6.2. (Empty subfolders are allowed without README.)
4. **The canonical workflow JSON exists** at `workflow/WF-XX-01_<Name>.json`.
5. **Contracts are localizable** — `docs/WF-XX-01_CONTRACTS.md` exists (STANDARD+) OR README clearly states the workflow has no callable interface (SMALL with no handoff).
6. **State is localizable** — `state/STATE__WF-XX-01.json` exists with at minimum `tier`, `status`, `posture` fields.
7. **Patch rule is applied** — if patches exist, they live in `workflow/patches/` with a README explaining overlay vs. superseding status.
8. **Tier matches content** — a folder claiming `tier: critical` has the CRITICAL reports required by §7.2; a folder claiming `tier: small` does not have forbidden CRITICAL artifacts.
9. **Canonical source can be determined unambiguously** for every information category in §4. No "two CONTRACTS files", no "README contradicts JSON".
10. **Missing artifacts are declared**, not hidden. If something should exist and doesn't, `state/STATE__WF-XX-01.json` has a `missing` list or `reports/PENDING_WIRING.md` documents it.

A failing workflow is not deleted, renamed, or quarantined automatically. It stays in place; the `wf-audit` skill flags it, and Claude fixes it on the next pass per §9.

## 11. Examples

### Example A — SMALL workflow (WF-00 Morning Briefing, hypothetical)

```
WF-00-01_Morning_Briefing/
├── README.md                     (40 lines: role = fire WF-DI-01 at 07:00 daily)
├── workflow/
│   └── WF-00-01_Morning_Briefing.json
└── state/
    └── STATE__WF-00-01.json     ({tier:"small", status:"live_verified", posture:"live_closed"})
```

**No** docs/, reports/, sql/, scripts/, tests/, assets/. None are required at SMALL tier.

When Claude enters this folder:
- Step 1–3: two files + one subfolder with one file. All classified `canonical`.
- Step 4: no missing artifacts (SMALL tier required minima: README, workflow JSON, STATE — all present).
- Step 5–6: no conflicts, no missing READMEs (workflow/ has one file — README is only required when subfolder has content AND the folder has any ambiguity about what it contains; a single obvious file is fine without a workflow/README.md at SMALL tier. For STANDARD+ the subfolder README becomes required.).
- Step 7–9: nothing to do.

**Decision logic.** "This is a cron firing another workflow. It has no callable interface, no side effects of its own, no handoff logic. SMALL tier is correct. Do not create CONTRACTS or TEST_MATRIX."

### Example B — CRITICAL workflow (WF-MO-01 Message Out / Output Gateway, current state)

```
WF-MO-01_Message_Out_Output_Gateway/
├── README.md                                      (populated status card, pack_posture: pre_live_ready)
├── workflow/
│   ├── WF-MO-01_Message_Out.json                  (18 nodes, canonical)
│   └── WF-MO-01_blueprint.json                    (slim metadata, supporting)
├── docs/
│   ├── README.md                                  (missing today — create per §5.6 / §6.2)
│   ├── WF-MO-01_CONTRACTS.md                      (missing today — create per §5.2)
│   ├── WF-MO-01_TEST_MATRIX.md                    (present)
│   ├── WF-MO-01_NODE_MAP.md                       (present, CRITICAL-appropriate)
│   ├── WF-MO-01_CONNECTION_MAP.md                 (present)
│   ├── WF-MO-01_IMPORT_PATCH_PLAN.md              (present)
│   └── ucenicul_claude_handoff_hardened/          (handoff bundle, OK as subdir per §3)
├── sql/
│   ├── README.md                                  (missing — create per §5.6)
│   └── 01..20 *.sql (10 files)
├── scripts/
│   ├── README.md                                  (missing — create)
│   ├── mo_logic.py
│   └── __init__.py
├── tests/
│   ├── README.md                                  (missing — create)
│   ├── test_families.py
│   ├── __init__.py
│   └── results/
├── reports/
│   ├── README.md                                  (missing — create)
│   ├── CLAUDE_PROMPT__WF-MO-01.txt
│   ├── README_APPLY_FIRST.md
│   └── SHA256SUMS.txt
├── state/                                         (missing subfolder — create per §3 / §5.7)
│   ├── README.md
│   └── STATE__WF-MO-01.json                       ({tier:"critical", status:"populated", posture:"pre_live_ready", last_verified:null})
└── assets/                                        (empty — OK)
```

**Classification observations:**
- `workflow/WF-MO-01_Message_Out.json` → **canonical** (implementation)
- `workflow/WF-MO-01_blueprint.json` → **supporting** (slim metadata)
- `docs/ucenicul_claude_handoff_hardened/STATE__WF-MO-01.json` → currently **foreign** (STATE belongs in `state/`, not docs/); relocate during next pass
- `reports/CLAUDE_PROMPT__WF-MO-01.txt` → **canonical** within its category (apply-first instructions)
- `reports/SHA256SUMS.txt` → **supporting** (integrity anchor computed against pre-fold paths; regenerated by wf-sync)

**Decision logic for Claude on next visit.**
1. Inspect + inventory: 40ish files.
2. Classify: most canonical or supporting; 1 foreign (STATE misplaced), 5 missing_dependency (subfolder READMEs + `state/` subtree + CONTRACTS).
3. Detect missing: CONTRACTS, state/STATE.json, 5 subfolder READMEs.
4. Reconcile: relocate STATE from docs/ucenicul_claude_handoff_hardened/ to state/.
5. Create missing READMEs (5) + CONTRACTS + state file.
6. Minimal doc updates: update root README to note state/ subfolder now exists.
7. Validate canonicality: confirmed, MO-01 now fully compliant at CRITICAL tier.
8. Package only if asked.

---

> **Last updated.** 2026-04-19. First version of the canonical standard.
> **Maintained by.** `wf-audit` skill once authored (task #23). Until then, maintained manually.
