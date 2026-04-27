# ACTIVE STAGE LOCK

## Locked stage
No stage is currently active-locked. `WF-ME-01` is **CLOSED at 10/10**. `WF-RA-01` is the next candidate but has not been activated yet.

## Previous locked stage
`WF-ME-01` — STAGE_CLOSED at 10/10 on v1.3-cross-tenant-guard. Live V1–V5 PASS (execs 729/730/731/732/733). V6 zero DB drift.

## Next candidate
`WF-RA-01` — Result Aggregator (PLANNED). Activation requires the normal pack application + hardened-handoff doc scaffolding + script harness green + live V1-V6 proof cycle. No carry-forward defects from upstream.

## WF-ME-01 closure summary
- Cycle 1: source pack applied (34 files, SHA256 verified); script harness 650/650 PASS
- Cycle 1b: source-completion port applied; `versionId` bumped to `wf-me-01-source-pack-v1.0-completed`; topology 15 / 20
- Cycle 2: switch-format fix to `typeVersion 3.2`; `versionId` bumped to `wf-me-01-source-pack-v1.1-switch-format-fix`; topology 15 / 20
- Cycle 3: chatTrigger harness enablement; `versionId` bumped to `wf-me-01-source-pack-v1.2-chat-trigger-added`; topology 16 / 21
- Cycle 4: cross-tenant isolation guard; `versionId` bumped to `wf-me-01-source-pack-v1.3-cross-tenant-guard`; topology 18 / 24
- Final score: **10 / 10**

## Carry-forward canonical rules (for all future stages)
- Chat-input JSON.parse adapter preamble on every stage-entry validator from day one.
- Cross-Postgres reference pattern: downstream code / switch nodes that logically depend on upstream validator output must reference the validator explicitly via `$('<ValidatorNode>').first().json`.
- Postgres credential in source packs may ship as `CREDENTIAL_PLACEHOLDER` with `name: "Postgres account 2"`; n8n resolves the binding on import.
- n8n switch-node shape: MUST ship at `typeVersion: 3.2` with `rules.values[].conditions.conditions[]` and `options.fallbackOutput: "extra"`.
- Cross-tenant isolation gate: any stage that loads a tenant-scoped row from Postgres with `alwaysOutputData: true` MUST follow the DB node with a code-node fail-closed assertion and a `typeVersion 3.2` switch with `fallbackOutput: "extra"` routing failures to the canonical error emitter.

## Advancement status
- advance_allowed: true
- advance_gate: CLOSED_10_OF_10
- next_stage_activation_pending: WF-RA-01
