# BUILD_REPORT — WF-EC-01

**Stage:** WF-EC-01 Execution Context Init
**Target workflow:** `v9jih4jqeXpOJOiH` — "WF-EC-01"
**Cycle:** LIVE_IMPLEMENTATION_PASS (Phase 4 of 7-phase closure method)
**Date:** 2026-04-18 (build), 2026-04-19 (test sweep & closure)
**Operator:** autonomous, under user mandate *"Close WF-EC-01 at 10/10, honestly, with live proof, while preserving all previously established E2E-01 structural progress."*

This report documents the single live mutation applied to EC-01 in the
Phase 4 closure cycle and the byte-level preservation proof for every
pre-existing canonical node.

---

## 1. Mutation summary

Exactly one live PUT was applied to `v9jih4jqeXpOJOiH`. No subsequent
live mutations occurred during the V1-V7 sweep (snapshot sha256 identical
pre and post sweep — see §5).

### Shell delta

| Field                 | Pre-mutation | Post-mutation | Delta |
|-----------------------|--------------|---------------|-------|
| Node count            | 9            | 10            | +1    |
| Edge count            | 8            | 9             | +1    |
| `active`              | true         | true          | 0     |
| `availableInMCP`      | true         | true          | 0     |
| chatTrigger `disabled`| (unset)      | `true`        | +1 flag flip (additive — webhook surface suppressed, node retained) |

### New node added

```
name:         EC_Input
type:         n8n-nodes-base.executeWorkflowTrigger
typeVersion:  1
parameters:   {}
id:           ec01-input-ewt-20260419
position:     [368, -416]
```

The `executeWorkflowTrigger` uses typeVersion 1 with empty parameters —
the form proven to work live under the SU-01 callable-as-sub smoke
(execution 763 on `ENiYNfL3ul8AmmCB`, 2026-04-18).

### New edge added

```
EC_Input  →  EC_Validate_Input   (main, index 0)
```

This routes sub-workflow input directly to the existing validator,
bypassing no intermediate logic. The validator's shape-adapter
(nested `{request:{...}}` fallback + flat top-level fallback) handles
the TR-01 envelope pattern that downstream callers will use.

### Trigger suppression (additive)

```
node:   When chat message received
type:   @n8n/n8n-nodes-langchain.chatTrigger (typeVersion 1.4)
change: disabled: true
```

The chatTrigger was publicly attached to a `/webhook/chat/...` URL. This
is an EC-01 contract violation — EC-01 is a pure sub-workflow, not a
public message entry point. Setting `disabled: true` additively
suppresses the webhook surface without deleting the node, preserving
rollback parity.

---

## 2. Preservation proof — pre-existing canonical nodes

Every one of the 7 non-trigger canonical nodes carries byte-identical
`parameters` pre- and post-mutation, verified by sha256 of the serialised
parameters object. No code body was touched. No edge between these nodes
was touched.

| Node                       | pre sha256-12 | post sha256-12 | Status |
|----------------------------|---------------|----------------|--------|
| EC_Validate_Input          | 3fe34c3609d0  | 3fe34c3609d0   | SAME   |
| EC_Route_Valid             | 3037d0e7de37  | 3037d0e7de37   | SAME   |
| EC_Build_Init_Payload      | 9549ad5eb053  | 9549ad5eb053   | SAME   |
| EC_Upsert_Context          | af2becf33d33  | af2becf33d33   | SAME   |
| EC_Load_Existing_Context   | 7d73ca36c480  | 7d73ca36c480   | SAME   |
| EC_Return_Result           | d3b5a83b54f7  | d3b5a83b54f7   | SAME   |
| EC_Return_Error            | 5a7398e9d450  | 5a7398e9d450   | SAME   |

Also byte-identical (non-canonical but retained):
- `When clicking 'Execute workflow'` (manualTrigger, for UI debugging).

Also byte-identical except for the additive `disabled: true` flip:
- `When chat message received` (chatTrigger — see §1).

---

## 3. Credentials

Both postgres nodes bind credential **`z9nKgToNWvIW7P8f` / "Postgres
account 2"** on both the pre-mutation and post-mutation snapshots. No
credential rebind was performed as part of the closure cycle.

```
EC_Upsert_Context          → postgres / z9nKgToNWvIW7P8f
EC_Load_Existing_Context   → postgres / z9nKgToNWvIW7P8f
```

---

## 4. Tooling & safety discipline

All mutations went through `tools/n8n-patch/n8n-patch.mjs` — the sanctioned
GET → mutate → PUT pipeline. No direct `curl .../api/v1/workflows/...`
calls were made at any point.

- `n8n-patch get v9jih4jqeXpOJOiH --out …pre-closure-mutation…` ← rollback
  baseline created **before** any mutation.
- `n8n-patch replace v9jih4jqeXpOJOiH …post-closure-mutation-body.json
  --reactivate` ← single live write. Reactivation was performed because
  the workflow retains an active `chatTrigger` (even though now disabled),
  per the `n8n-patch` rule for webhook-bearing workflows.
- `n8n-patch audit --tail` ← verified the entry appears in
  `.audit.jsonl` with both snapshot paths.

No hooks were bypassed. No workflow was deactivated without
re-activation. No sibling workflow was edited in the same window.

---

## 5. Post-sweep drift verification

After the V1-V6 sweep (5 live child executions of EC-01 from an ephemeral
caller, plus read-only V7 DB drift probe) a final live snapshot was taken:

```
tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-post-vsweep-20260419.json
sha256: 4b598160b158f63600c76eb88af2c8cf351e8e3a49cbfdea31028df8e43ffbdc
```

This matches the post-mutation snapshot sha256 **byte-for-byte**:

```
tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-post-closure-mutation-20260419.json
sha256: 4b598160b158f63600c76eb88af2c8cf351e8e3a49cbfdea31028df8e43ffbdc
```

**Conclusion:** the V-sweep produced zero live-shell drift. Every test
ran through the exact same built artefact that was promised in Phase 3.

---

## 6. Rollback plan

If EC-01 regresses under load and a rollback is authorised, the
pre-mutation snapshot is:

```
tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-pre-closure-mutation-20260419.json
sha256: 01da182efd0b1d8a65fed7f9e4bdc712acd46001b5c6968644ac0e0d916038f7
```

To roll back:

```
n8n-patch replace v9jih4jqeXpOJOiH \
  tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-pre-closure-mutation-20260419.json \
  --reactivate
```

This will restore EC-01 to its pre-closure state (9 nodes, 8 edges,
chatTrigger enabled, EC_Input absent). No downstream workflow depends on
the EC_Input trigger yet, so rollback is currently zero-impact on live
chain traffic (Link 1 TR→EC is structurally absent from the TR-01 side
anyway).

---

## 7. Artefact references

| Artefact | Path |
|---|---|
| Closure contract (Phase 1) | `WF-EC-01_CLOSURE_CONTRACT.md` |
| Live reality check (Phase 2) | `WF-EC-01_LIVE_REALITY_CHECK.md` |
| Closure plan (Phase 3) | `WF-EC-01_CLOSURE_PLAN.md` |
| PUT body used | `tools/n8n-patch/ec-closure-harness/WF-EC-01_post-closure-mutation.json` |
| Ephemeral caller JSON | `tools/n8n-patch/ec-closure-harness/EC-01_caller.json` |
| Pre-mutation snapshot | `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-pre-closure-mutation-20260419.json` |
| Post-mutation snapshot | `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-post-closure-mutation-20260419.json` |
| Post-V-sweep snapshot | `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-post-vsweep-20260419.json` |
| Phase-2 verification snapshot | `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-phase2-20260419.json` |
| Pre-cycle discovery snapshot | `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-precycle-20260418.json` |

---

## 8. Summary

One additive live mutation. One disabled chatTrigger flag. Seven
canonical nodes proven byte-identical. Credentials intact. Tooling
audit clean. Rollback snapshot on disk. Zero drift between build and
post-sweep. Ready for V-evidence review in `CLOSURE_REPORT_WF-EC-01.md`.
