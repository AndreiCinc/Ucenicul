# F9 — OR Live Execution Gating · Discovery

> **Source-of-truth audit** of every consumer of the OR-side
> `orchestrator_input.{planning_mode, module_execution_allowed,
> response_generation_allowed, domain_writes_allowed}` fields across the
> 10 canonical workflows.

## 1. Producer

`WF-OR-01.OR_Build_Handoff_Payload` (n8n-nodes-base.code), within the
`payload.orchestrator_input` block:

```js
orchestrator_input: {
  planning_mode: 'plan_only',
  module_execution_allowed: false,
  response_generation_allowed: false,
  domain_writes_allowed: false
}
```

The four fields are **literal constants** in the producer node. They are
set unconditionally for every successful OR handoff and never set to any
other value in this code.

OR's contract doc
(`workflows/WF-OR-01_Orchestrator/docs/WF-OR-01_CONTRACTS.md` §4) describes
the four flags as statements about OR's own stage behavior:

> §4.1 No Planning — OR stage produces no plan steps
> §4.2 No Module Dispatch — `module_execution_allowed: false`
> §4.3 No Response Generation — `response_generation_allowed: false`
> §4.4 No Domain Writes — `domain_writes_allowed: false`

That is, OR is asserting "during my own stage, I do not plan / dispatch /
respond / write" — these are descriptive, not gating, statements.

## 2. Sole downstream consumer

A live SQL grep across every Code/Switch node body in TR / EC / OR / PL /
DI / ME / RA / SU / RC / MO finds only one downstream node that even
references `orchestrator_input`:

| Workflow | Node | Hits |
|---|---|---|
| WF-OR-01 | OR_Build_Handoff_Payload | 3 (producer) |
| WF-OR-01 | OR_Return_Error | 1 (error envelope shape only) |
| **WF-PL-01** | **PL_Validate_OR_Handoff** | **4** |

`PL_Validate_OR_Handoff` (full code captured in this mission's exec log)
references `orchestrator_input` only inside the `requiredPayload` array
(presence check) and inside the normalised passthrough:

```js
const requiredPayload = ['tenant_id','thread_id','execution_id',
  'trigger_message_id','idempotency_key','execution_status',
  'planning_allowed','allowed_next_stage','orchestrator_input'];
for (const key of requiredPayload) { if (!(key in payload)) missing.push(`payload.${key}`); }
…
return [{
  json: {
    _valid: 'true',
    _normalized_or_handoff: {
      …
      payload: {
        …
        orchestrator_input: payload.orchestrator_input || {},
        …
      }
    }
  }
}];
```

It enforces *presence* of the `orchestrator_input` key, then **passes the
whole object through unchanged**. It does not read any sub-field.
Downstream PL nodes (`PL_Build_Planner_Input`, `PL_Generate_Plan`,
`PL_Build_DI_Envelope`, etc.) do not reference `orchestrator_input` at all.

## 3. The other downstream `*_allowed` reads are different fields

A second grep looked for any read of the four field NAMES across the
chain (regardless of which envelope they belong to). Hits exist in many
nodes (DI / ME / RA / SU / RC / MO), but every one of them refers to a
**different envelope**:

- `dispatcher_input.response_generation_allowed` — set by PL_Generate_Plan, validated by ME_Validate_Dispatcher_Result, propagated through RA_Build_Downstream_Envelope → SU. PL's contract.
- `aggregation_input.response_generation_allowed` — RA's flag, distinct producer/consumer.
- `state_update_input.response_generation_allowed` — SU's flag, distinct producer/consumer.

These are PL/RA/SU's own contracts. They are NOT reads of OR's
`orchestrator_input.*`. The earlier framing in
`docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`
("the canonical chain runs in plan_only mode by default and never writes
side-effects") confused OR's `orchestrator_input.planning_mode='plan_only'`
descriptive flag with a downstream gating mechanism that does not exist.

## 4. The flags `module_execution_allowed`, `domain_writes_allowed`, and `planning_mode` are write-only

The grep shows exactly **one** producer (OR_Build_Handoff_Payload) for
each of these three. There is **no consumer** anywhere in the 10
workflows. They are never read:

| Field | Producer | Downstream readers |
|---|---|---|
| `planning_mode` | OR_Build_Handoff_Payload | none |
| `module_execution_allowed` | OR_Build_Handoff_Payload | none |
| `domain_writes_allowed` | OR_Build_Handoff_Payload | none |
| `orchestrator_input.response_generation_allowed` | OR_Build_Handoff_Payload | none (the downstream `response_generation_allowed` reads target separately-emitted envelopes) |

In other words: the four fields exist in the OR handoff payload purely as
**telemetry / documentation** of OR's stage behavior. They have **zero
gating effect** on the rest of the chain.

## 5. Empirical confirmation (predecessor missions)

The two missions closed earlier today wrote real DB rows through the chain
while OR was emitting `orchestrator_input.{module_execution_allowed:false,
domain_writes_allowed:false}`:

- `TASK-MODULE-LIVE-EXECUTION-USER-READY` produced 5 chain-created `tasks`
  rows in default tenant + 1 in tenant A.
- `PROJECT-E2E-RICH-TEST-MATRIX-TASK-CORRIDORS-PHASE1` produced 46
  chain-created `tasks` rows across default + tenants A and B.

Memory V2's prior phases produced `memory_items` rows through the same
chain. None of these would have succeeded if OR's flags were enforced
gates.

## 6. Classification

`F9 = F9_TELEMETRY_ONLY_MISMATCH`

`orchestrator_input.{planning_mode, module_execution_allowed,
domain_writes_allowed, response_generation_allowed}` are **descriptive**
statements about OR's own stage behavior, embedded in the handoff
envelope as documentation. They are **not** read as gates by any
downstream workflow. The earlier reconciliation framing — "the canonical
chain runs in plan_only mode by default and never writes side-effects" —
was a category error: the flags do not enforce that mode. The actual
blocker for non-task domain writes was F13 (ME stub handlers), now closed
for `task_module`; remaining domain modules (`improvement_module`,
`reminder_module-{list,update,cancel}`) remain stubs by their own design,
not because of F9.

## 7. Implications for the full E2E rich matrix

The corridors C1..C5, C7..C9 in the rich matrix are **not blocked by
F9**. They are blocked, where they fail, by:

- the corridor's required module's stub state (improvement_module → still stub; F14 PL.intentMap missing `store_memory`);
- intent-mapping fixture coverage in the harness;
- the MO `MISSING_DELIVERY_TARGET` known fixture limitation (already
  classified as KNOWN_FIXTURE_LIMITATION in `e2e/harness/e2e_oracle.mjs`).

None of these are addressed by an OR patch. F9 itself does not block any
corridor.

## 8. Recommendation

**Doc-only reconciliation**, no workflow patch. Specifically:

1. Reclassify F9 in the `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` from
   "OR-side hardcoded-flags blocker" to "telemetry-only / not a gate".
2. (Optional, lower priority) Add a comment block to
   `OR_Build_Handoff_Payload.parameters.jsCode` and to the OR contract doc
   §4 explicitly noting that the four fields are descriptive telemetry,
   not gates. This is *not* required to unblock the matrix.
3. Pick up the actual remaining frontiers (`improvement_module`
   implementation, F14 `store_memory` PL.intentMap addition) as separate
   missions when product priority warrants.

**No workflow mutation in this mission.**
