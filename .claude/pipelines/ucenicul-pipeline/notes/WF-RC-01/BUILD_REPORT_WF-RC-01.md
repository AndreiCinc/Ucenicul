# BUILD_REPORT — WF-RC-01 (live-implementation pass, 2026-04-18)

## Target
Workflow: `TClXgmO8H8zsSwMb` ("WF-RC-01 (patched)")
Goal: make it match the WF-RC-01 source pack and the closed WF-SU-01
upstream contract.

## Pack fingerprints
- Source pack: `wf-rc-01_full_source_pack.zip`
- Canonical workflow JSON: `workflows/WF-RC-01_Response_Composer.json`
- Expected shell: 14 nodes, 13 main edges, 2 triggers, 2 switches,
  2 Postgres reads, zero business writes.

## Pre-implementation state
- Pre-snapshot: `snapshots/TClXgmO8H8zsSwMb_pre-rc-impl-20260418T122000.json`
- Live nodes: 4 (manualTrigger + langchain.chatTrigger + langchain.agent + lmChatOpenAi)
- Live connections: 3
- Canonical RC_* nodes present on live: 0

## Prepared patch artifact
- File: `snapshots/WF-RC-01_Response_Composer_bound.json`
- Built by: copying the pack JSON and modifying two things only:
  - Rebinding both `credentials.postgres` placeholders to the project's
    real credential (`id: z9nKgToNWvIW7P8f`, `name: "Postgres account 2"`,
    discovered from live `WF-SU-01 State / Persistence Updater`).
  - Replacing the `settings` object with `{"executionOrder":"v1"}` so the
    n8n OpenAPI PUT whitelist does not reject the body.
- Verified locally: 14 nodes, 13 edges total (11 distinct source-node
  connection entries), 2 triggers, 2 switches, 2 Postgres reads, both
  Postgres reads have `alwaysOutputData: true` and `queryReplacement` set.

## Live changes actually applied
None. See `CLOSURE_REPORT_WF-RC-01.md` for blocker detail. One PUT was
attempted as a smoke test (rename one trigger via `mcp__n8n__patch_workflow_nodes`);
it was rejected by the n8n API with HTTP 400 on settings whitelist.

## Off-node test evidence
- `workflows/tests/rc/test_families.py`
- 13 families × 50 tests = **650 / 650 PASS**
- Results persisted under the pack at
  `workflows/tests/rc/results/results.json` and `.md`.
- This proves the RC logic (validator, lineage verifier, composer, output
  envelope, idempotency) is correct as a pure-function mirror of the
  workflow. It is not a substitute for live V1–V6.

## Honest readiness score
- Off-node logic: green.
- Workflow-shell live wiring: not applied.
- Score cap: **8.8 / 10** per `12_STAGE_WF-RC-01.md`.
- Closure: not justifiable on this pass.
