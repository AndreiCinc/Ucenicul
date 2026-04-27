# WF-E2E-01 — Chain Contract Map

**Date:** 2026-04-18
**Authority:** for closed stages, derived from their closure reports +
STATE.json entries. For unclosed stages, taken from
`docs/ucenicul_claude_handoff_hardened/` and the route map and marked
**aspirational** — not verified live.

The canonical chain has 9 directed links:

```
[1] TR → EC      [2] EC → OR     [3] OR → PL     [4] PL → DI
[5] DI → ME      [6] ME → RA     [7] RA → SU     [8] SU → RC
[9] RC → MO
```

Per-link contract authority by status:

| # | Link | Upstream closure | Downstream closure | Contract authority |
|---|------|------------------|--------------------|--------------------|
| 1 | TR → EC | route-map-asserted (re-verify pending) | not closed (active) | aspirational both sides |
| 2 | EC → OR | not closed (active) | not closed | aspirational both sides |
| 3 | OR → PL | not closed | `BLOCKED_WITH_EVIDENCE` 8.3/10 | aspirational both sides |
| 4 | PL → DI | `BLOCKED_WITH_EVIDENCE` 8.3/10 | not closed | aspirational both sides |
| 5 | DI → ME | not closed | not closed | aspirational both sides |
| 6 | ME → RA | not closed | not closed | aspirational both sides |
| 7 | RA → SU | not closed | closed-enough (folded) | downstream authoritative |
| 8 | SU → RC | closed-enough (folded) | closed 10/10 | both authoritative |
| 9 | RC → MO | closed 10/10 | closed 10/10 | **both authoritative** |

Only links 8 and 9 have authoritative contract on both sides.
Link 7 has an authoritative downstream input shape. Links 1–6 are
aspirational and must be re-derived once feeders close.

---

## Link 9 — RC-01 → MO-01 (authoritative both sides)

**Upstream output (RC-01):** terminal node `RC_Return_Result` returns
the response envelope. Per `CLOSURE_REPORT_WF-RC-01.md` and live exec
ids 751..754:

```jsonc
{
  "ok": true,
  "stage": "WF-RC-01",
  "execution_context_id": "<uuid>",
  "thread_id":            "<uuid>",
  "tenant_id":            "<uuid>",
  "idempotency_key":      "<text>",
  "response": {
    "status": "complete" | "partial",
    "text":              "<final composed string for the user>",
    "warnings":          ["<text>", ...],
    "followups":         [ {"action": "<text>", ... }, ... ]
  },
  "lineage": {
    "upstream_stage": "WF-SU-01",
    "validated_at":   "<iso8601>"
  }
}
```

Failure terminals: `RC_Return_Error` (validation) /
`RC_Return_Context_Error` (lineage / context-load) — both return
canonical error envelope:

```jsonc
{
  "ok": false,
  "stage": "WF-RC-01",
  "error": { "code": "<UPPER_SNAKE>", "message": "<text>", "node": "<name>" },
  "execution_context_id": "<uuid|null>",
  "thread_id":            "<uuid|null>"
}
```

**Downstream input (MO-01):** `MO_Validate_Composed_Response_Input`
expects (per `tools/n8n-patch/mo-test-harness/V3.fixture.json` and
mo_logic.py contract):

```jsonc
{
  "execution_context_id": "<uuid>",      // required
  "thread_id":            "<uuid>",      // required
  "tenant_id":            "<uuid>",      // required
  "idempotency_key":      "<text>",      // required, ≤256 chars
  "response": {
    "status": "complete" | "partial",
    "text":   "<text>",                   // required, non-empty
    "warnings": [...]                     // optional
  },
  "lineage": { "upstream_stage": "WF-RC-01", ... }   // upstream_stage MUST be RC-01
}
```

**Mapping (RC-01 output → MO-01 input):**

| RC-01 field | MO-01 field | Transform |
|-------------|-------------|-----------|
| `execution_context_id` | `execution_context_id` | identity |
| `thread_id` | `thread_id` | identity |
| `tenant_id` | `tenant_id` | identity |
| `idempotency_key` | `idempotency_key` | identity |
| `response.status` | `response.status` | identity |
| `response.text` | `response.text` | identity |
| `response.warnings` | `response.warnings` | identity (optional) |
| `lineage.upstream_stage` | `lineage.upstream_stage` | **rewrite to "WF-RC-01"** before handoff (MO-01 lineage check expects WF-RC-01, not WF-SU-01) |

**Critical mismatch to resolve in the connector:** RC-01 currently
sets `lineage.upstream_stage = "WF-SU-01"` because RC-01 is itself
downstream of SU-01. When RC-01 hands off to MO-01, the connector
node must rewrite `lineage.upstream_stage = "WF-RC-01"` so that
MO-01's lineage verifier accepts the input as coming from RC-01. This
is the canonical hand-off pattern.

**Failure path:** if RC-01 returns an error envelope (`ok:false`), the
connector MUST NOT invoke MO-01. The chain terminates at RC-01's error
branch and the caller (SU-01 or above) is responsible for the
error-channel delivery. This must be encoded as a switch upstream of
the new `executeWorkflow` node.

---

## Link 8 — SU-01 → RC-01 (both authoritative)

**Upstream output (SU-01):** per `STATE_WF-SU-01.json` live execs 744,
745, 747, the green terminal `SU_Return_Result1` emits:

```jsonc
{
  "ok": true,
  "stage": "WF-SU-01",
  "execution_context_id": "<uuid>",
  "thread_id":            "<uuid>",
  "tenant_id":            "<uuid>",
  "idempotency_key":      "<text>",
  "applied_write_classes": [
    "execution_state_update",
    "thread_state_update",
    "memory_candidate_persistence",
    "audit_persistence"
  ],
  "allowed_next_stage": "WF-RC-01",
  "response_generation_allowed": true,
  "downstream_envelope": {
    "execution_context_id": "<uuid>",
    "thread_id":            "<uuid>",
    "tenant_id":            "<uuid>",
    "idempotency_key":      "<text>",
    "aggregated_result":    { ... },             // SU-01's view of RA-01 output
    "lineage": { "upstream_stage": "WF-SU-01" }
  }
}
```

**Downstream input (RC-01):** `RC_Validate_State_Update_Input` expects
`downstream_envelope` as its top-level input. Per
`CLOSURE_REPORT_WF-RC-01.md` V3 fixture:

```jsonc
{
  "execution_context_id": "<uuid>",
  "thread_id":            "<uuid>",
  "tenant_id":            "<uuid>",
  "idempotency_key":      "<text>",
  "aggregated_result":    { ... },
  "lineage": { "upstream_stage": "WF-SU-01" }
}
```

**Mapping (SU-01 output → RC-01 input):**

The mapping is "send `downstream_envelope` as-is". The connector node
should call RC-01 with `payload = $json.downstream_envelope`. If
`response_generation_allowed === false`, the connector MUST NOT invoke
RC-01 (this is the SU-01-side gate for context-error).

**Critical alignment:** SU-01 already produces a `downstream_envelope`
field designed to be the RC-01 input. This link is structurally clean.

---

## Link 7 — RA → SU (downstream authoritative; upstream aspirational)

**Downstream input (SU-01):** `SU_Validate_Aggregated_Input1` expects
(per `STATE_WF-SU-01.json` V3 fixture and SU pack):

```jsonc
{
  "execution_context_id": "<uuid>",
  "thread_id":            "<uuid>",
  "tenant_id":            "<uuid>",
  "idempotency_key":      "<text>",
  "aggregated_result": {
    "modules_run":         [ { "module": "<name>", "status": "<ok|error|skipped>" }, ... ],
    "module_outputs":      { "<module>": { ... }, ... },
    "write_classes_requested": [
      "execution_state_update",
      "thread_state_update",
      "memory_candidate_persistence",
      "audit_persistence"
    ]
  },
  "lineage": { "upstream_stage": "WF-RA-01" }
}
```

Forbidden write classes (e.g., `domain_event_write`) trigger
`FORBIDDEN_WRITE_CLASS` error per V4 exec 745.

**Upstream output (RA-01):** RA-01 is not closed. Aspirational shape
(from canonical docs and pack):

```jsonc
{
  "ok": true,
  "stage": "WF-RA-01",
  "execution_context_id": "<uuid>",
  "thread_id":            "<uuid>",
  "tenant_id":            "<uuid>",
  "idempotency_key":      "<text>",
  "modules_run":         [ ... ],
  "module_outputs":      { ... },
  "write_classes_requested": [ ... ]
}
```

**Mapping:** the RA-01 → SU-01 connector wraps RA-01's output into
`{ ..., aggregated_result: { modules_run, module_outputs, write_classes_requested }, lineage: { upstream_stage: "WF-RA-01" } }`.

Until RA-01 closes, this contract is aspirational.

---

## Links 1–6 — aspirational only

Per closure-first: do not freeze contracts that depend on shells.
Each link below is a placeholder; the contract will be authored when
its feeder closes.

### Link 1 — TR → EC
Aspirational. TR-01 produces a normalized message envelope keyed by
`(tenant_id, thread_id, source_message_ref)`. EC-01 should consume it
and emit an `execution_context_id`. Re-verify TR-01 first per user rule.

### Link 2 — EC → OR
Aspirational. EC-01 should emit a fresh `execution_context_id` plus
all keys needed for orchestration. OR-01 should consume the context
and emit a routing decision.

### Link 3 — OR → PL
Aspirational. OR-01 emits the orchestration intent; PL-01 builds the
plan. PL-01's input shape is documented in
`workflows/scripts/pl/pl_logic.py` and `06_STAGE_WF-PL-01.md` HDR-1..5.

### Link 4 — PL → DI
Aspirational. PL-01 emits `{ steps: [ ... ], step_id, status }`; DI-01
dispatches each step.

### Link 5 — DI → ME
Aspirational. DI-01 invokes ME-01 once per dispatchable step. ME-01
already has `executeWorkflowTrigger`, so the entry-point shape exists
but is unverified.

### Link 6 — ME → RA
Aspirational. ME-01 returns per-module results; RA-01 aggregates. RA-01
already has `executeWorkflowTrigger`.

---

## What this map can support today

- **Link 9 (RC → MO):** safe to author the connector node. Both contracts
  authoritative. Plan in `WF-E2E-01_RC01_TO_MO01_CONNECTOR_PLAN.md`.
  Production-side-effect concern documented in plan.
- **Link 8 (SU → RC):** could be authored, but requires modifying SU-01
  (closed-enough, not 10/10-verified in this session). Defer until at
  least a re-shell-check on SU-01.
- **Links 1–7:** must wait on feeder closure.

This map is the contract reference for any future E2E-01 work.
