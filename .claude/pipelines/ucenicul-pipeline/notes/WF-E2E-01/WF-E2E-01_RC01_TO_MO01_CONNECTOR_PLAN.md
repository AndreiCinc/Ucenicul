# WF-E2E-01 — RC-01 → MO-01 Connector Plan (NOT YET EXECUTED)

**Date:** 2026-04-18
**Status:** drafted. **Awaiting explicit user GO before live execution.**
**Scope gate:** Option B (limited) — additive only, shell/smoke only,
no chain closure claim.

## Why this plan is paused before execution

Both RC-01 (`TClXgmO8H8zsSwMb`) and MO-01 (`OooZdC0DgsDR6gm0`) are
verified-closed at 10/10. Any mutation to RC-01 is mutation of a
closed production workflow. The user authorised additive connector
work where justified, but I am surfacing the following specific risks
before executing:

### Risk 1 — Real Telegram side-effect on any future RC-01 execution

Today the live chain is not wired. The only way RC-01 executes is
via its `executeWorkflowTrigger` (from an upstream caller that does
not yet exist) or its manual trigger. Adding the connector to MO-01
means:

- Any **future** manual run of RC-01 with a green `RC_Return_Result`
  payload will invoke MO-01 as a sub-workflow.
- MO-01's V3 path fires `n8n-nodes-base.telegram` against the bound
  production credential (`Z0ovMbkHwXEC8ZtF`) and chat id `5101664726`.
- Result: a real Telegram message is sent to the production chat.

This is not a silent change. Anyone who runs RC-01 expecting the
pre-2026-04-18 "return result and stop" behaviour will instead
trigger a real downstream send.

Mitigations available (pick one before GO):

- **M1:** add a boolean guard field `dispatch_to_mo_01` on the
  connector and require it to be `true` for the call to fire. Default
  `false` preserves the "return and stop" behaviour unless a caller
  explicitly opts in. This is the safest option.
- **M2:** gate on `response.status === "complete"` only (skip MO-01
  for `"partial"`). Still fires Telegram on complete paths.
- **M3:** hard-code that the connector only fires when
  `tenant_id` is in an allowlist. Too brittle; not recommended.
- **M4:** stage the connector as **disabled** (n8n node `disabled: true`)
  on add, then user flips it on in the UI when ready. Clean for
  smoke-testing the shell without firing.

I recommend **M4 first** (add disabled) + **M1 ready to go** (with
`dispatch_to_mo_01` defaulting false) so that the structural change
ships without behavioural change on day 1.

### Risk 2 — RC-01 topology already assumes a returning protocol

RC-01's terminal is `RC_Return_Result` which wraps the envelope for
return to the `executeWorkflowTrigger` caller. The caller (SU-01 or
equivalent) is expected to then hand off to MO-01.

Wiring RC-01 → MO-01 internally changes this contract. Today, if a
future SU-01 → RC-01 connector fires and expects `RC_Return_Result`
to return a value, adding an MO-01 call **after** `RC_Return_Result`
changes the return semantics (RC-01 now returns the MO-01 result, not
the RC-01 result, depending on where the new node sits).

Mitigation: place the connector **in parallel** with `RC_Return_Result`
via a fan-out pattern (both nodes receive from `RC_Build_Output_Envelope`),
or add it **strictly after** `RC_Return_Result` with clear documentation
that the n8n sub-workflow return value is still RC-01's envelope, not
MO-01's. The `executeWorkflow` sub-call node captures MO-01's output
in its own output stream; if nothing consumes that stream, the
`executeWorkflowTrigger` caller still sees `RC_Return_Result` as the
return. This needs to be verified in a fresh shell test — not assumed.

### Risk 3 — Re-activation cost

RC-01 has no webhook/telegram/form/mcp trigger. Per CLAUDE.md
`reactivate` is only mandatory for those trigger types. A plain
`replace` without `--reactivate` is acceptable. But the workflow was
active at the time of the change and must stay active after.

## Proposed mutation (EXECUTION PENDING GO)

### Node to add

```jsonc
{
  "parameters": {
    "workflowId": { "__rl": true, "value": "OooZdC0DgsDR6gm0", "mode": "list", "cachedResultName": "WF-MO-01 Message Out / Output Gateway" },
    "mode": "once",
    "options": {}
  },
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1.2,
  "name": "RC_Dispatch_To_MO_01_SUBCALL",
  "disabled": true,                                  // M4: ships disabled
  "position": [<right of RC_Return_Result>],
  "id": "<new uuid>"
}
```

### Optional pre-transform node (M1)

A Code node between `RC_Build_Output_Envelope` and the new subcall that:

- Checks `dispatch_to_mo_01 === true`. If false, early return without
  calling MO-01.
- Rewrites `lineage.upstream_stage` from `"WF-SU-01"` to `"WF-RC-01"`
  (per `WF-E2E-01_CHAIN_CONTRACT_MAP.md` link 9 mapping rule).
- Drops nothing else.

```js
// RC_Prepare_MO_01_Handoff  (disabled on initial ship)
const env = $input.first().json;
if (env && env.ok === true && env.dispatch_to_mo_01 === true) {
  const mo_in = {
    execution_context_id: env.execution_context_id,
    thread_id:            env.thread_id,
    tenant_id:            env.tenant_id,
    idempotency_key:      env.idempotency_key,
    response:             env.response,
    lineage: { upstream_stage: 'WF-RC-01', validated_at: new Date().toISOString() }
  };
  return [{ json: mo_in }];
}
// Otherwise emit nothing (or a sentinel) so the subcall does not fire.
return [];
```

### Connections to add

- `RC_Build_Output_Envelope` → `RC_Return_Result` (existing, preserved)
- `RC_Build_Output_Envelope` → `RC_Prepare_MO_01_Handoff` (new, additive fan-out)
- `RC_Prepare_MO_01_Handoff` → `RC_Dispatch_To_MO_01_SUBCALL` (new)

The existing edge `RC_Build_Output_Envelope → RC_Return_Result` is not
removed. RC-01's sub-workflow return value to its caller remains
`RC_Return_Result`, which is the behaviour preserved today.

### Shell/smoke verification plan (after execution)

1. V1 shell match:
   - Post-replace snapshot node count = 14 + 2 = 16, edge count = 13 + 2 = 15.
   - `RC_Return_Result` terminal preserved with existing incoming edge.
   - `RC_Dispatch_To_MO_01_SUBCALL.disabled === true`.
2. V2 shell-only invocation:
   - Manual trigger RC-01 with the V3 fixture that produced exec `751`.
   - Expect terminal = `RC_Return_Result` (unchanged).
   - Expect `RC_Dispatch_To_MO_01_SUBCALL` to show status `skipped`
     (because `disabled`) in the execution trail.
   - Expect **zero rows** added to `outbound_delivery_ledger_claude_mcp`
     (DB drift probe).
3. No V3 / smoke-invoke with the subcall enabled in this session.
   That smoke run fires a real Telegram and is a separate GO.

### Rollback

If anything looks wrong post-replace:

```
node tools/n8n-patch/n8n-patch.mjs replace TClXgmO8H8zsSwMb \
  tools/n8n-patch/snapshots/e2e-01-discovery/RC_TClXgmO8H8zsSwMb.json
```

This restores the exact pre-E2E shape (14 nodes, 13 edges).

## What I need from the user before executing

Pick one of the following:

**(A)** GO with Ship-Disabled: apply the connector + the prep node,
both shipped with `disabled: true`. No behaviour change. Only the
V1/V2 shell-only checks run. Enabling and the first real Telegram run
is a separate future GO.

**(B)** GO with Gate-and-Enable: apply the connector + the prep node,
ship with `disabled: false`, but gate on `dispatch_to_mo_01: true` in
the payload. No current caller sets this flag, so no behaviour change
today. V1/V2 shell checks run. A first real dispatch (V3-style) is
still a separate GO.

**(C)** STOP: do not execute this connector in this session. Leave the
plan on file for when the full feeder closures are complete and
E2E-01 transitions out of `BLOCKED_ON_FEEDER_STAGES`.

My recommendation is **(A)** — safest, most reversible, and consistent
with "shell/smoke only, no false-green E2E". It also matches CLAUDE.md's
"additive, no deletions" rule perfectly.

## Until GO: no live mutation performed

No `n8n-patch replace TClXgmO8H8zsSwMb` has been issued under E2E-01.
The pre-mutation snapshot
`tools/n8n-patch/snapshots/e2e-01-discovery/RC_TClXgmO8H8zsSwMb.json`
is the authoritative pre-state if we do go.
