# CONNECTOR ACTIVATION PLAN — Ucenicul Autonomous Test & E2E Mission

Run ID: `run_2026-04-19_autonomous_test_e2e`
Scope: persistent activation of Execute-Workflow connectors for all nine canonical primary edges in `CANONICAL_CHAIN_MAP.md`.

## 0. Invariants

1. No canonical-chain workflow may be deleted. All patches are additive (new node + new connection) or non-destructive re-enables of existing infrastructure.
2. Every Execute-Workflow node must run in synchronous mode and forward the caller's full handoff envelope as `mode=passThrough`.
3. Idempotency keys already live on every envelope. No new key logic is to be injected at the connector layer.
4. Source workflows must not lose their existing manual trigger paths. The Execute-Workflow node attaches to the existing `*_Return_Result` (or equivalent terminal) node output.

## 1. Live workflow ID table

| WF | n8n workflow id | `executeWorkflowTrigger` present? |
|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | (n/a — entry stage) |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | **no** — refactor required |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | **no** — refactor required |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | **no** — refactor required |
| WF-DI-01 | `abqYINcXr3JAhGGk` | **no** — refactor required |
| WF-ME-01 | `uq26nh1grIpnHju0` | **yes** |
| WF-RA-01 | `5RcNLtxNjAHJsZPE` | **yes** |
| WF-SU-01 | `ENiYNfL3ul8AmmCB` | **yes** |
| WF-RC-01 | `TClXgmO8H8zsSwMb` | **no** — refactor required |
| WF-MO-01 | `OooZdC0DgsDR6gm0` | **yes** |

## 2. Per-edge patch specification

For each canonical edge, the patch is one of:

- **Connector-only**: add an `n8n-nodes-base.executeWorkflow` node named `<SRC>_Dispatch_To_<TGT>_01_SUBCALL` to the source workflow, wire it after the existing terminal node, and set `workflowId` to the target's id.
- **Target-refactor + connector**: first add an `n8n-nodes-base.executeWorkflowTrigger` node to the target, re-route its first pipeline stage from its existing trigger to the new one, then apply the connector-only patch on the source.

| # | Edge | Source node wired from | Target trigger expected | Patch type | Apply in this cycle? |
|---|---|---|---|---|---|
| 1 | TR→EC | `TR_Return_Result` (or final node at end of TR chain) | `EC_Input` (to be added) | target-refactor + connector | deferred (refactor risk on active WF) |
| 2 | EC→OR | `EC_Upsert_Context_Complete` | `OR_Input` (to be added) | target-refactor + connector | deferred |
| 3 | OR→PL | `OR_Return_Result` | `PL_Input` (to be added) | target-refactor + connector | deferred |
| 4 | PL→DI | `PL_Return_Result` | `DI_Input` (to be added) | target-refactor + connector | deferred |
| 5 | DI→ME | `DI_Return_Result` | `ME_Input` (exists) | connector-only | **yes** |
| 6 | ME→RA | `ME_Return_Result` | `RA_Input` (exists) | connector-only | **yes** |
| 7 | RA→SU | `RA_Build_Downstream_Envelope` | `SU_Input` (exists) | connector-only | **yes** |
| 8 | SU→RC | `SU_Return_Result` | `RC_Input` (to be added) | target-refactor + connector | deferred |
| 9 | RC→MO | `RC_Prepare_MO_01_Handoff` (disabled) | `MO_Input` (exists) | re-enable disabled infrastructure | **yes** |

Edges 5, 6, 7, 9 are the four lowest-risk activations and are scheduled for this cycle. Edges 1, 2, 3, 4, 8 require introducing a new `executeWorkflowTrigger` into currently-active workflows, which alters the primary entry of those workflows. Those five are **scheduled for a follow-up cycle** after a smoke run on the first four proves the envelope passes cleanly.

## 3. Patch dependencies

- Edge 5 (DI→ME): requires nothing else.
- Edge 6 (ME→RA): requires nothing else.
- Edge 7 (RA→SU): requires nothing else.
- Edge 9 (RC→MO): re-enabling existing disabled nodes. No new node shape.

All four can be patched in parallel.

## 4. Patch tool — MANDATORY

**Only tool permitted for live mutation:** `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`.

`mcp__n8n__patch_workflow_nodes`, `mcp__n8n__move_node`, and the SDK-code update route all fail 400 on this n8n instance with `request/body/settings must NOT have additional properties` or `request/body/nodes/N must NOT have additional properties`. The CLI script applies a `SETTINGS_WHITELIST` filter and a strict `{name, nodes, connections, settings}` PUT body per n8n-io/n8n#19587.

See `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md` for the full policy.

## 5. Rollback plan

Each patch is a single `node n8n-patch.mjs replace <id> <file.json> --reactivate` call performing GET → mutate → PUT. The tool auto-snapshots `snapshots/<id>_{before,after}_<ts>.json` and appends to `.audit.jsonl`. Rollback is `node n8n-patch.mjs replace <id> snapshots/<id>_before_<ts>.json --reactivate`. No DDL is involved.

## 6. Safety gates

- Before patching each edge, capture a full `n8n-patch get <id> --out tests/generated/workflows/snapshots/<WF>_pre_phase4.json` snapshot.
- After patching, capture the post-snapshot to `tests/generated/workflows/snapshots/<WF>_post_phase4.json`.
- Any patch that changes more than the intended fields (shape drift) triggers an immediate rollback via `replace` with the before-snapshot.

## 6. Envelope pass-through contract

All Execute-Workflow nodes use `options.waitForSubWorkflow = true` and send a JSON body whose top-level keys match the canonical envelope emitted by the source's terminal `Return_Result` node. No envelope mutation happens at the connector layer.
