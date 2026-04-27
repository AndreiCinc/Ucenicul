# protocol_agent_run_local_patch.md

Opened: 2026-04-23.
Status: **FROZEN — current canonical rollout protocol** for `WF-ME-01` structural mutations.

Authority: Subordinate to `MEMORY_V2_MISSION.md` and `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md`. Invoked by `MEMORY_V2_DECISION_LEDGER.md` entry `V2-028`. Supersedes `protocol_operator_run_cli.md` (V2-025) on the apply-ownership clause only. V2-025's retirement of Path 5 and V2-026's 8-condition DB-bypass escape hatch remain in force under this protocol.

---

## Purpose

Define the exact behaviour the memory-module agent follows when landing a structural patch on `WF-ME-01` from inside the Cowork sandbox. Under this protocol the agent is the actor on the apply step: it runs the local `n8n-patch` pack (`n8n-patch.mjs`) directly via `Bash`, using the pack's local `.env` for n8n API credentials. MCP is reserved for read / verify / analysis / smoke / SELECT.

This change reflects the de-facto channel already used for V2-014 (2026-04-22T15:30Z) and V2-OBS (2026-04-22) closures: both were applied via the local `n8n-patch` pack from the sandbox even while the prior protocol doc described an operator-run handshake. V2-028 aligns the rule with the practice.

## Scope

- Applies to: `WF-ME-01` (memory module, id `uq26nh1grIpnHju0`) structural patches requiring `patch-node` or `replace` via `n8n-patch.mjs`.
- Out of scope: read-only operations (MCP `get_workflow`, `verify_workflow`, `execute_workflow`, `get_execution`, `mcp__postgres__execute_sql` for SELECT) — these continue unchanged.
- Out of scope: any non-memory workflow.

## Pre-conditions (verified once per session)

Before the first apply in a session the agent verifies:

1. Local pack exists at `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`.
2. Pack's `.env` exists at `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env` and contains the n8n API credential variables the CLI expects (`N8N_API_KEY`, `N8N_API_URL`, or equivalent — consult the tool's README on first session).
3. `node --version` reports ≥ 18 (the CLI uses `fetch`).
4. The sandbox can invoke `node` on that file (standard `Bash` tool works — egress is handled by the pack's own `fetch` call, which has been demonstrated operational in prior apply events).

No credentials are copied anywhere else. The agent never reads the value of `N8N_API_KEY` into chat context and never writes it to any doc.

## Handshake

### Step 1 — agent produces artefacts

For each structural patch the agent:
1. Writes `docs/architecture/memory/v2/<frontier>/artifacts/patch<N>_params.json` (for `patch-node`) or `WF-ME-01_post_<frontier>.json` (for `replace`) with the exact payload the CLI will submit.
2. Writes `docs/architecture/memory/v2/<frontier>/artifacts/build_patch_<frontier>.mjs` — a deterministic builder that regenerates the payload from source-of-truth jsCode + pre snapshot so reviewers can verify byte-identity by re-running it.
3. Pins sha256 of both files in the frontier's state JSON + dispatch log.
4. Captures pre-state via MCP `verify_workflow` + MCP `get_workflow` + `mcp__postgres__execute_sql` (SELECT-only probes) and writes it to `apply_evidence_<frontier>_<date>.md §Pre-state`.
5. Writes the exact command line as a copy-pastable block in the frontier's `<frontier>_APPLY_COMMAND.md`.

### Step 2 — agent runs the command

Agent runs the CLI from the repo root via `Bash`:

For `patch-node` (single-node code/params swap):
```bash
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  patch-node \
  uq26nh1grIpnHju0 \
  <NodeName> \
  --params docs/architecture/memory/v2/<frontier>/artifacts/patch<N>_params.json
```

For `replace` (structural changes — new nodes, new connections, multi-node param changes):
```bash
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  replace \
  uq26nh1grIpnHju0 \
  docs/architecture/memory/v2/<frontier>/artifacts/WF-ME-01_post_<frontier>.json
```

Rules that carry over from V2-025 (still in force):
- Workflow id `uq26nh1grIpnHju0` is hard-coded in the command. If ever patching a different workflow, this protocol does not apply.
- No flags beyond what is shown. The agent does not invent flags.
- No shell pipelines, no redirects, no `&&` / `||` chains. One command per invocation.
- Before running, the agent emits a one-sentence plain-language preamble describing what the command will do (consistent with the user's approval-gated command-preamble feedback).

### Step 3 — agent verifies

Immediately after CLI returns zero:
1. `mcp__n8n__verify_workflow` with probes on the exact jsCode / SQL / params surface the patch touched — asserts byte-identity against the payload.
2. `mcp__n8n__get_workflow` dump; byte-diff the post-state workflow against the pre snapshot on every non-target node (zero structural drift).
3. `connections` byte-identical pre/post unless the patch explicitly changed them (only `replace` may change connections).
4. Writes §Post-state to `apply_evidence_<frontier>_<date>.md` with the reported versionId, `updatedAt`, and diff-surface verification (one explicit evidence line per invariant).

### Step 4 — smoke

Agent runs the smoke envelopes via `mcp__f2e8be41__execute_workflow` and validates DB invariants via `mcp__postgres__execute_sql` SELECT. Unchanged from V2-025.

### Step 5 — close frontier

Agent updates `MEMORY_V2_PHASE_GATES.md`, `MEMORY_V2_STATE.md`, `MEMORY_V2_CLOSEOUT.md`, `SESSION_HANDOFF_NEXT.md`, `CURRENT_TRUTH_POST_F5.md`, the decision ledger, and the frontier's own evidence doc. Unchanged from V2-025.

## Rollback

Every structural patch ships with a rollback command that reverses the change using the same CLI channel. For `replace`-class patches, the rollback is `replace` re-applied with the captured pre snapshot (`WF-ME-01_pre_<frontier>.json`). For `patch-node`, the rollback is `patch-node` re-applied with `rollback_patch<N>_params.json` generated from the captured pre-state. The agent runs the rollback itself; DB-level rollback remains unauthorised (except under V2-026's escape-hatch conditions, which require explicit documentation).

## What this protocol forbids

- Using `mcp__n8n__patch_workflow_nodes` against `WF-ME-01` while sub-B (settings-whitelist filter) is unfixed.
- Direct Postgres UPDATE on `public.workflow_entity` as a default channel (Path 5 stays retired per V2-025). V2-026 retains it only as a last-resort escape hatch under 8 conditions — not a default.
- Any mutation that is not preceded by a `verify_workflow` pre-state capture and followed by a post-state verification + byte-diff.
- Running the CLI with credentials fetched from anywhere other than the pack's own `.env`.

## Relationship to prior decisions

- **V2-025 (2026-04-21)** — opened the operator-run CLI protocol, retired Path 5 as a default channel. V2-028 supersedes the apply-ownership clause (operator → agent) but preserves the Path 5 retirement and every safety property V2-025 named.
- **V2-026 (2026-04-21)** — documented the DB-bypass escape hatch with 8 conditions. V2-028 preserves it; nothing in this protocol re-opens Path 5 as a default.
- **V2-022 (2026-04-21)** — MCP `patch_workflow_nodes` structurally incapable for `WF-ME-01` due to sub-B. V2-028 does not rehabilitate it.
- **Sub-A (sandbox egress allowlist)** — no longer load-bearing under V2-028 because the local `n8n-patch` pack's `fetch` call has demonstrated operational egress from the sandbox for V2-014 and V2-OBS. If sub-A's allowlist is ever tightened in a way that blocks the pack, that is a new blocker to raise at that time; under current conditions it is not on the critical path.

## Residual open items (infra, non-blocking)

- **Sub-B** — MCP `patch_workflow_nodes` settings-whitelist filter. One-line fix on the MCP server (apply n8n PUT OpenAPI whitelist before submitting body). When resolved, MCP becomes a third canonical path alongside the agent-run CLI. Until then, MCP write path remains blocked for `WF-ME-01`.
- **Sub-A** — sandbox egress allowlist (historical). Under V2-028 the agent routes through the local pack's own `fetch`; sub-A is now an audit-only concern, not a blocker.

Both tracked in `MEMORY_V2_BUG_LEDGER.md`.

## Cross-references

- `MEMORY_V2_DECISION_LEDGER.md` — `V2-025` (superseded on apply-ownership), `V2-026` (escape hatch), `V2-028` (current rule).
- `docs/architecture/memory/v2/ops/protocol_operator_run_cli.md` — prior rule, retained as audit-trail record.
- `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md` — canonical n8n mutation policy.
- `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs` — the CLI itself.
- `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env` — credential source (never read into chat / docs).
- `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.audit.jsonl` — append-only audit trail of every CLI apply.
