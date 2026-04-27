# Route Map — WF-ME-01 Closed at 10/10, WF-RA-01 Next Candidate

## Runtime chain
Message In
-> WF-TR-01 Thread Resolver
-> WF-EC-01 Execution Context Init
-> WF-OR-01 Orchestrator Input Handoff
-> WF-PL-01 Plan Generation
-> WF-DI-01 Dispatcher
-> WF-ME-01 Module Execution
-> WF-RA-01 Result Aggregator
-> WF-SU-01 State Update
-> WF-RC-01 Response Composer
-> Message Out

## Stage statuses
- WF-TR-01 — CLOSED
- WF-EC-01 — CLOSED
- WF-OR-01 — CLOSED
- WF-PL-01 — CLOSED
- WF-DI-01 — CLOSED
- WF-ME-01 — **CLOSED at 10/10** (v1.3-cross-tenant-guard; execs 729/730/731/732/733; V6 zero DB drift)
- WF-RA-01 — NEXT CANDIDATE
- WF-SU-01 — PLANNED
- WF-RC-01 — PLANNED

## Closure evidence references
- WF-DI-01 live verifications: execs 716 (V1), 717 (V2), 718 (V3), 719 (V4), 720 (V5); DB drift hash identical pre/post (V6)
- WF-DI-01 closure score: 10 / 10
- WF-ME-01 live verifications (on v1.3-cross-tenant-guard): exec 730 (V1 happy path create_task), 731 (V2 missing dispatcher_input → INVALID_DISPATCH_INPUT), 732 (V3 reminder_module → UNSUPPORTED_MODULE), 733 (V4 task_module.noop → UNSUPPORTED_ACTION), 729 (V5 cross-tenant spoof → CONTEXT_MISMATCH via new fail-closed guard); V6 ec_hash ed9487e781cfc75856228f052cbf3a15 and tasks_hash 08b959749b4ce167e1ff42dcd24ea0f3 identical pre- and post- V1-V5
- WF-ME-01 closure score: 10 / 10
- module execution output contract confirmed: canonical `module_result` with `allowed_next_stage: WF-RA-01` on success; canonical `module_error` with `{INVALID_DISPATCH_INPUT | CONTEXT_MISMATCH | UNSUPPORTED_MODULE | UNSUPPORTED_ACTION | MISSING_REQUIRED_FIELDS}` on failure

## Notes
Chat-input adapter pattern (`if (typeof input.chatInput === 'string' && !input.dispatcher_input) { candidate = JSON.parse(input.chatInput); }`) is canonical for every stage-entry validator. Applied in WF-PL-01 v1.1, WF-DI-01 v1.1, and WF-ME-01 v1.0-completed from day one.

Cross-Postgres reference pattern (canonical): downstream switch / code expressions that depend on upstream validator output must reference the validator via `$('<ValidatorNode>').first().json`, not `$json`, because n8n replaces `$json` with the Postgres result row.

n8n switch-node shape (canonical from WF-ME-01 Cycle 2): switch nodes MUST ship at `typeVersion: 3.2` with `rules.values[].conditions.conditions[]` (`leftValue/rightValue/operator.{type, operation}`) and `options.fallbackOutput: "extra"`. The legacy `conditions.string[]` (`value1/value2/operation`) shape is silently rewritten to empty on import and MUST NOT be shipped. WF-DI-01 is the live-known-good template.

Cross-tenant isolation gate (canonical from WF-ME-01 Cycle 4): any stage that loads a tenant-scoped row from Postgres with `alwaysOutputData: true` MUST follow the DB node with a code-node fail-closed assertion (`_context_ok: 'true' | 'false'`) and a `typeVersion 3.2` switch with `fallbackOutput: "extra"` routing failures to the canonical error emitter. Rationale: without this gate an empty result row passes through, and downstream switches that route on the validator envelope (not the DB row) will produce success envelopes for spoofed tenants. Same defect class as WF-OR-01 Cycle 2. WF-ME-01 Cycle 4 is the live-known-good template for this gate.
