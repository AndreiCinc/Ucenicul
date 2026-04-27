# WF-E2E-01 — RC-01 → MO-01 Connector: Activation Path

**Date:** 2026-04-18
**Status:** SHIPPED DISABLED on `TClXgmO8H8zsSwMb` (RC-01).
No behavioural change today. No live handoff closure claim is made for
RC → MO under this document; closure is explicitly deferred to a future
stage of work per user direction (rule 6 of 2026-04-18 GO).

This document is the activation recipe. Do not activate without going
through every section.

---

## 1. What is currently shipped (read before activating)

Live on `TClXgmO8H8zsSwMb` as of 2026-04-18T12:34:01Z:

- 2 new nodes, both `disabled: true`.
- 2 new edges fanning off `RC_Build_Output_Envelope`.
- 0 existing edges removed. 0 existing nodes modified (all 8 jsCode
  bodies byte-identical pre/post — verified by sha256).
- Workflow is still `active: true`.
- Shell counts: 14 → 16 nodes, 13 → 15 edges.

Node 1 — `RC_Prepare_MO_01_Handoff`

- Type: `n8n-nodes-base.code`, typeVersion 2, `disabled: true`.
- Position: `[2700, 360]`.
- jsCode logic summary:
  - Reads `$input.first().json`.
  - Early-exit `[]` if `env.ok !== true`.
  - Early-exit `[]` if `env.dispatch_to_mo_01 !== true` (gate).
  - Otherwise emits `{ json: mo_in }` where `mo_in` is:
    `{ execution_context_id, thread_id, tenant_id, idempotency_key, response, lineage: { upstream_stage: "WF-RC-01", validated_at: <iso> } }`.
  - Note the lineage rewrite from `"WF-SU-01"` (RC-01's own upstream)
    to `"WF-RC-01"` (MO-01's expected `lineage.upstream_stage`),
    per `WF-E2E-01_CHAIN_CONTRACT_MAP.md` Link 9 mapping table.

Node 2 — `RC_Dispatch_To_MO_01_SUBCALL`

- Type: `n8n-nodes-base.executeWorkflow`, typeVersion 1.2,
  `disabled: true`.
- Position: `[2940, 360]`.
- Parameters:
  ```
  workflowId: { __rl: true, value: "OooZdC0DgsDR6gm0", mode: "list",
                cachedResultName: "WF-MO-01 Message Out / Output Gateway" }
  mode:    "once"
  options: {}
  ```

New edges:

- `RC_Build_Output_Envelope → RC_Return_Result` (existing, preserved).
- `RC_Build_Output_Envelope → RC_Prepare_MO_01_Handoff` (new, additive
  fan-out).
- `RC_Prepare_MO_01_Handoff → RC_Dispatch_To_MO_01_SUBCALL` (new,
  terminal since `RC_Dispatch_To_MO_01_SUBCALL` has no outgoing edges).

## 2. Preconditions for activation

Satisfy all of these before flipping either node to enabled:

1. **Feeder stages closed:** EC-01, OR-01, PL-01, DI-01, ME-01, RA-01
   each individually at 10/10 closure, with live V2..V6 executions
   recorded in STATE.json. If any is still open, the chain hand-off
   test is a premature integration test and will mask stage-local
   defects.
2. **TR-01 re-verified:** per user direction 2026-04-18, TR-01 is
   route-map-asserted CLOSED but lacks a top-level closure report.
   Re-verify with V2..V6 and promote into STATE.json as
   `tr_01_live_impl`.
3. **SU-01 trigger re-added:** SU-01 currently has a -1 node delta vs
   its pack (missing `SU_Input executeWorkflowTrigger`). Until that is
   restored, nothing upstream can invoke SU-01 as a sub-workflow, so
   nothing will ever pass a full chain payload into RC-01 live.
4. **DB side-effect awareness:** enabling the dispatch fires MO-01,
   which on a green payload issues a **real Telegram message** to
   production chat id `5101664726` and writes a row to
   `public.outbound_delivery_ledger_claude_mcp`. Confirm the intended
   tenant, chat id, and test window before enabling.
5. **Caller opt-in documented:** the gate requires the caller's
   envelope to carry `dispatch_to_mo_01: true`. All callers that are
   expected to produce chain handoffs must be updated to set this
   flag — otherwise the gate closes and MO-01 is not invoked even if
   the nodes are enabled.

## 3. Activation recipe

Once §2 preconditions are met:

### 3.1 Pre-activation snapshot

```
cd /sessions/dreamy-blissful-pascal/mnt/ucenicul-pipeline
node tools/n8n-patch/n8n-patch.mjs get TClXgmO8H8zsSwMb \
  --out tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_pre-activate-<timestamp>.json
```

### 3.2 Build activation payload

Start from the current post-ship snapshot
(`tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_post-e2e-connector-20260418.json`)
and set `disabled: false` on both new nodes only. **Do not touch
anything else.**

```python
import json
src = "tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_pre-activate-<timestamp>.json"
dst = "tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_activate-payload.json"
d = json.load(open(src))
for n in d["nodes"]:
    if n["name"] in ("RC_Prepare_MO_01_Handoff", "RC_Dispatch_To_MO_01_SUBCALL"):
        n["disabled"] = False
json.dump(d, open(dst, "w"), indent=2)
```

### 3.3 Apply

```
node tools/n8n-patch/n8n-patch.mjs replace TClXgmO8H8zsSwMb \
  tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_activate-payload.json
```

No `--reactivate` needed — RC-01 has no webhook/telegram/form/mcp
trigger that needs re-registering.

### 3.4 Shell verification post-activate

```
node tools/n8n-patch/n8n-patch.mjs get TClXgmO8H8zsSwMb \
  --out tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_post-activate-<timestamp>.json
```

Assertions:
- `nodes.length === 16`, edges = 15.
- For both new nodes: `disabled === false`.
- All other existing jsCode bodies: sha256 unchanged from pre-activate.
- `settings.availableInMCP === true`.

### 3.5 Gated smoke test (no real Telegram)

Manual-trigger RC-01 with a V3-style fixture in which
`dispatch_to_mo_01 === false` (or simply missing). Expected:

- Terminal: `RC_Return_Result` (unchanged behaviour).
- `RC_Prepare_MO_01_Handoff`: runs, returns `[]` because gate is
  closed.
- `RC_Dispatch_To_MO_01_SUBCALL`: not invoked (no input items from
  prep node).
- DB drift zero.

### 3.6 Handoff smoke test (fires real Telegram — requires a fresh GO)

Manual-trigger RC-01 with a V3-style fixture in which
`dispatch_to_mo_01 === true` and a valid tenant/thread lineage.
Expected:

- Terminal for RC-01: `RC_Return_Result` (still).
- `RC_Prepare_MO_01_Handoff` emits one item with `lineage.upstream_stage === "WF-RC-01"`.
- `RC_Dispatch_To_MO_01_SUBCALL` invokes MO-01.
- MO-01's V3 green path fires and sends the Telegram message.
- One row added to `public.outbound_delivery_ledger_claude_mcp`
  keyed by `(tenant_id, idempotency_key)`.
- A second run with the same idempotency_key must produce
  `REPLAY_BLOCKED` — same behaviour as MO-01 V6 exec `761`.

Only after this handoff smoke passes may the link be considered
provisionally verified. Full RC → MO closure also requires the rest
of the chain to be wired and behaving, so "provisionally verified"
is the best one should claim even after §3.6 succeeds.

## 4. Rollback paths

### 4.1 Fast rollback to disabled-shipped state (this doc's starting state)

```
node tools/n8n-patch/n8n-patch.mjs replace TClXgmO8H8zsSwMb \
  tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_post-e2e-connector-20260418.json
```

Restores `disabled: true` on both connector nodes. Behaviour reverts
to the post-ship state.

### 4.2 Full rollback to pre-E2E-01 state (strip the connector entirely)

```
node tools/n8n-patch/n8n-patch.mjs replace TClXgmO8H8zsSwMb \
  tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_pre-e2e-connector-20260418.json
```

Restores RC-01 to its closed-10/10 shape exactly as it was before
the 2026-04-18 connector work. 14 nodes, 13 edges, zero E2E-01
artefacts in the workflow.

Audit log entries to check after any rollback:
```
node tools/n8n-patch/n8n-patch.mjs audit --tail 3
```

## 5. Related files

- Pre-mutation snapshot:
  `tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_pre-e2e-connector-20260418.json`
- Post-mutation snapshot:
  `tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_post-e2e-connector-20260418.json`
- PUT-ready payload used:
  `tools/n8n-patch/snapshots/TClXgmO8H8zsSwMb_e2e-connector-payload.json`
- Contract map (Link 9):
  `WF-E2E-01_CHAIN_CONTRACT_MAP.md`
- Pre-GO plan (risks + option menu):
  `WF-E2E-01_RC01_TO_MO01_CONNECTOR_PLAN.md`
- Audit log: `tools/n8n-patch/.audit.jsonl`
  (relevant entry: `"op":"replace","id":"TClXgmO8H8zsSwMb","before_hash":"684aa046102e","after_hash":"1fd4cf9ac92c"`
  at `2026-04-18T12:34:01.318Z`).

## 6. Non-closure acknowledgement

Per user rule 6 of 2026-04-18:

> Do not claim live handoff closure for RC->MO yet.

Nothing in this document should be read as a closure claim. The
connector is shipped structurally, gated by two guards (n8n
`disabled` + payload `dispatch_to_mo_01`), and has undergone zero
end-to-end execution. Closure of the RC→MO link requires §3.5 + §3.6
plus the feeder backlog in §2, and then belongs under a future,
explicitly-named E2E-01 closure pass — not under this document.
