# protocol_operator_run_cli.md

> **SUPERSEDED 2026-04-23 by `MEMORY_V2_DECISION_LEDGER.md` entry `V2-028`.**
> Current canonical rollout protocol for `WF-ME-01` structural mutations is **autonomous agent-run local `n8n-patch` pack**, frozen in `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md`. The agent in the Cowork sandbox runs the CLI directly against the n8n API using the pack's local `.env`; no operator hand-off on apply.
> This file is retained verbatim as the audit-trail record of the **prior** rule (2026-04-21 → 2026-04-23) and must not be rewritten. Ledger entry `V2-025` (which opened this protocol) stays in the ledger; `V2-028` supersedes it on the apply-ownership clause only. V2-025's retirement of Path 5 (DB-bypass) and V2-026's 8-condition escape-hatch remain in force.
> Do not invoke this protocol for new work. Use `protocol_agent_run_local_patch.md` instead. If a fresh session lands here first, read the new protocol and the V2-028 ledger entry before anything else.

---

Opened: 2026-04-21.
Status: SUPERSEDED 2026-04-23 — preserved for audit. Prior status was: FROZEN — canonical rollout protocol for v2 structural patches when the Cowork sandbox cannot reach the n8n API directly.

Authority: Subordinate to `MEMORY_V2_MISSION.md` and `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md`. Invoked by `MEMORY_V2_DECISION_LEDGER.md` entry `V2-025`; superseded on the apply-ownership clause by `V2-028`.

## Purpose

Define the exact handshake between the memory-module agent (running inside the Cowork sandbox) and the human operator (running a local shell on their laptop with egress to `n8n-production-d688.up.railway.app`), so that future structural patches on `WF-ME-01` can be landed via the canonical `n8n-patch.mjs` CLI without bypassing the n8n PUT validator or the CLI's settings whitelist.

This protocol retires Path 5 (Postgres direct UPDATE on `public.workflow_entity`, used once for F5 under `DIVERGENCE D-M-014`) as a rollout channel. Path 5 is permanently off the table for structural patches going forward.

## Scope

- Applies to: `WF-ME-01` (memory module) structural patches requiring `patch-node` or `replace` via `n8n-patch.mjs`.
- Out of scope: read-only operations (MCP `verify_workflow`, `execute_workflow`, `get_execution`, `get_workflow`, `mcp__postgres__execute_sql` for SELECT) — these continue unchanged, run by the agent directly from the sandbox.
- Out of scope: any non-memory workflow.

## Pre-conditions (operator side, one-time per machine)

Operator confirms on their laptop:
1. `node --version` is ≥ 18 (the CLI uses `fetch`).
2. Repo is cloned and at the HEAD the agent is working from (`git pull` before each run).
3. File exists: `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`.
4. Egress to `n8n-production-d688.up.railway.app` is reachable (no corporate proxy blocking).
5. n8n API credential is available in the environment the CLI expects (the CLI reads `N8N_API_KEY` or equivalent — consult the tool's README on first run).

No credentials or API keys are ever copied into the sandbox or into any file the agent reads.

## Handshake

### Step 1 — agent produces artefacts

For each structural patch the agent:
1. Writes `docs/architecture/memory/v2/<frontier>/artifacts/patch<N>_params.json` with the minimal payload that `n8n-patch.mjs patch-node` (or `replace`) consumes. Minimal = only the fields being changed; everything else flows through the CLI's merge.
2. Writes `docs/architecture/memory/v2/<frontier>/artifacts/build_patch<N>.mjs` — a deterministic builder that regenerates the same JSON from source-of-truth jsCode payloads (so the operator can verify byte-identity without trusting the checked-in JSON).
3. Pins sha256 of both files in the frontier's `WORK_LOG_*.md` or equivalent.
4. Captures pre-state via MCP `verify_workflow` + `mcp__postgres__execute_sql` (workflow_entity row + memory_items baseline) and writes it to `apply_evidence_<frontier>_<date>.md` §Pre-state.
5. Writes the exact command line as a copy-pastable block in §Command (see §Command contract below).
6. Commits all of the above to the branch the operator will pull.

### Step 2 — operator runs the command

Operator:
1. `git pull` on their local clone.
2. Optional: `node docs/architecture/memory/v2/<frontier>/artifacts/build_patch<N>.mjs` and diff its output against the checked-in `patch<N>_params.json` (expect zero diff; if diff appears, STOP and report).
3. Runs the exact command from §Command. Captures stdout + stderr verbatim.
4. If the CLI exits non-zero: STOP, report full output, do NOT retry (the CLI is idempotent on matching versionId preflight, so a failure usually means the workflow drifted or the payload is malformed).
5. On success: reports back the new `versionId` (printed by the CLI) + the `updatedAt` timestamp.

### Step 3 — agent verifies

Agent, from the sandbox:
1. `mcp__n8n__verify_workflow` with probes on the exact jsCode / settings surface the patch touched — asserts byte-identity against the payload.
2. Byte-diff the post-state workflow against pre-state on all non-touched nodes (zero structural drift on nodes outside the patch scope).
3. `connections` byte-identical pre/post unless the patch explicitly changed them (only `replace` may change connections).
4. Writes §Post-state to `apply_evidence_<frontier>_<date>.md` with the reported versionId, updatedAt, and diff-surface verification.

### Step 4 — smoke

Agent runs the smoke envelopes via `mcp__f2e8be41__execute_workflow` and validates DB invariants via `mcp__postgres__execute_sql`. No operator involvement.

### Step 5 — close frontier

Agent updates `MEMORY_V2_PHASE_GATES.md`, `MEMORY_V2_STATE.md`, `MEMORY_V2_CLOSEOUT.md`, and the frontier's own evidence doc. Operator is not in the loop for this step.

## Command contract (§Command)

The agent writes the command block in the evidence doc in exactly this format (no variations):

```bash
# Frontier: <name>
# Expected pre-state versionId: <versionId>
# Expected post-state node(s) changed: <nodeName1>, <nodeName2>, ...

node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  patch-node \
  uq26nh1grIpnHju0 \
  <NodeName> \
  --params docs/architecture/memory/v2/<frontier>/artifacts/patch<N>_params.json
```

For `replace` (structural changes with new nodes/connections):

```bash
# Frontier: <name>
# Expected pre-state versionId: <versionId>
# Change class: structural (new nodes / new connections)

node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  replace \
  uq26nh1grIpnHju0 \
  --file docs/architecture/memory/v2/<frontier>/artifacts/wf_me_01_patch<N>_full.json
```

Rules:
- Workflow id `uq26nh1grIpnHju0` is hard-coded in the command. If the agent is ever patching a different workflow, this protocol does not apply.
- No flags beyond what is shown. If the CLI supports additional flags (dry-run, yes-prompt), the agent does not suggest them; the operator adds them only if they want an extra safety check.
- No shell pipelines, no redirects, no `&&` / `||` chains. One command per invocation.

## Rollback

Every structural patch must ship with a rollback command that reverses the change using the same `patch-node` / `replace` channel. The rollback params file lives at `docs/architecture/memory/v2/<frontier>/artifacts/rollback_patch<N>_params.json` and is generated from the captured pre-state. If smoke fails, the agent requests the operator run the rollback command; no DB-level rollback is authorised.

## What this protocol forbids

- Direct Postgres UPDATE on `public.workflow_entity`. Path 5 is retired (see V2-025).
- MCP `patch_workflow_nodes` writes against WF-ME-01 until sub-B (settings-whitelist filter) is fixed.
- CLI runs from the Cowork sandbox until sub-A (egress allowlist) is fixed.
- Any mutation that is not preceded by a `verify_workflow` pre-state capture and followed by a post-state verification.

## Residual open items (infra, non-blocking)

- Sub-A — sandbox egress allowlist. Resolves by adding `n8n-production-d688.up.railway.app` to the Cowork egress allowlist. When resolved, the agent can run the CLI itself from the sandbox and this protocol degrades to a "nice-to-have for audit" rather than a necessity.
- Sub-B — MCP `patch_workflow_nodes` settings filter. One-line fix on the MCP server (apply n8n PUT OpenAPI whitelist before submitting body). When resolved, MCP becomes a third canonical path alongside CLI.

Both are tracked in `MEMORY_V2_BUG_LEDGER.md` under the `BLOCKER-V2-F5-01` resolution subsection.

## Cross-references

- `MEMORY_V2_DECISION_LEDGER.md` — `V2-020`, `V2-021`, `V2-023`, `V2-024`, `V2-025`
- `DIVERGENCE_REGISTER_MEMORY.md` — `D-M-014` (F5 Path 5, retired)
- `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md` — canonical n8n mutation policy
- `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs` — the CLI itself
