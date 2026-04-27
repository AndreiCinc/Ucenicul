# n8n MCP Playbook

## Canonical rule

Treat **live native n8n workflow JSON** as canonical truth.

Do not treat SDK helper output, builder abstractions, or generated wrappers as canonical if live reads disagree.

## Workflow shell safety

For the active stage workflow:
- the user-created shell is canonical shell identity
- you may replace nodes, connections, and settings inside it
- you must not delete the workflow record
- you must not leave it blank
- you must not treat write success as proof without live re-read

## Mandatory sequence for any workflow edit

1. Read live workflow
2. Capture before-snapshot
3. Identify patch target fields
4. Apply minimal patch
5. Persist change
6. Re-read live workflow immediately
7. Compare:
   - workflow id
   - workflow name
   - node count
   - connection count
   - target fields
   - draft vs active if available
8. Only then continue

Any edit without round-trip verification is failed.

## Write-surface priority

When choosing a workflow write surface, use this order:

1. verified native live JSON patch path
2. verified shell-preserving replacement path using native live JSON
3. verified alternate API path that writes native workflow truth
4. `BLOCKED_WITH_EVIDENCE`

Use SDK-style write surfaces only if:
- they are explicitly required by the available tool
- they round-trip cleanly against live state
- they do not collapse node count or connection count
- an authoritative grammar example exists

If any of the above is missing, SDK is not the canonical write path.

## Current known blocker posture

For the current stage, the previously observed failure mode is:
- `update_workflow(code)` accepted raw JSON as "valid"
- validator returned `nodeCount: 0`
- no real native node graph was persisted

This classifies the SDK path as:
- `unsafe_for_current_stage`
until a verified native write surface or authoritative SDK grammar is available

Do not keep probing the same path.

## If MCP/SDK write path misbehaves

If a write reports success but:
- node count collapses
- connections disappear
- draft becomes empty
- active version remains unchanged
- raw JSON is "accepted" but no nodes survive

Then:
- classify as `false success`
- ban the current write strategy for this stage
- preserve evidence in reports
- switch to the smallest safer verified JSON-based path
- if no verified JSON path exists, emit `BLOCKED_WITH_EVIDENCE`

## Browser-bridge rule

A browser-extension bridge is not a required write surface.

If a Chrome extension, browser session bridge, or browser-cookie path is unavailable:
- do not block the stage waiting for browser tooling
- do not redesign the stage around the extension
- classify the browser path as unavailable
- continue only if another verified write surface exists
- otherwise emit `BLOCKED_WITH_EVIDENCE`

## Switch-node checklist

For each routing node, verify:
- `dataType`
- `value1`
- `value2`
- rules
- default branch behavior
- runtime type alignment from upstream output

No routing fix is accepted before executed branch proof.

## Postgres-node checklist

For each SQL node, verify:
- operation
- query text
- query parameter surface
- parameter order
- `alwaysOutputData` when downstream depends on row shape
- returned row shape

No parameterized query is accepted without a real execution path when the stage reaches runtime.

## Expression-mode rule

In n8n:
- Expression mode: raw JS only
- Text mode: `{{ ... }}` only where appropriate

Do not mix these modes.
Do not use assignment syntax inside UI expression fields.

## Workflow classification rule

Before publish or exposure logic, classify the workflow as exactly one:
- entry workflow
- internal sub-workflow
- MCP-exposed workflow

Do not force publishability assumptions from one class onto another.

## Runtime discipline

Separate and report distinctly:
- design-level correctness
- persisted live workflow correctness
- runtime execution correctness

All three are required for closure.
