# n8n MCP Playbook

## Canonical rule

Treat **live n8n workflow JSON** as canonical.

Do NOT treat SDK helper output (`workflow()`, `trigger()`, `node()`, or similar abstraction) as canonical if live reads show mismatch.

## Workflow shell safety

For the active stage workflow (currently `WF-EC-01`):
- the user created a shell workflow
- you may replace nodes/connections/settings inside it
- you must NOT delete the workflow record itself
- you must NOT blank the workflow unintentionally
- after every update, verify the workflow still exists and still has the expected node count

## Mandatory sequence for any workflow edit

1. Read live workflow
2. Save local JSON snapshot
3. Patch minimally
4. Persist change
5. Re-read live workflow
6. Compare:
   - node count
   - connection count
   - exact patched fields
   - active vs draft version
7. Only then continue

Any edit without round-trip verification is considered failed.

## If MCP/SDK write path misbehaves

If update succeeds but:
- node count drops unexpectedly
- connections disappear
- draft is empty
- active version remains unchanged

Then:
- declare MCP/SDK write path unreliable for this attempt
- stop SDK exploration after one failed validation pass
- switch to canonical JSON patch / direct workflow replacement strategy
- preserve evidence in `AUDIT_REPORT.md`

## Switch-node checklist

For every routing node audit:
- verify `dataType`
- verify `value1`
- verify `value2`
- verify rules
- verify fallback / branch behavior
- verify runtime type alignment from upstream code nodes

Never declare routing fixed before runtime branch proof.

## Postgres-node checklist

For every parametrized SQL node:
- confirm `$1/$2/...` placeholders match configured query replacements/parameters
- confirm order matches the SQL
- run a small real execution when possible
- verify returned row shape if downstream logic depends on it

## Expression-mode rule

In n8n UI:
- if the field is in Expression mode -> write raw JS only
- do not wrap with `={{ }}` or `{{ }}`
- do not write assignment syntax inside the field

In text mode:
- use `{{ ... }}` only where appropriate

## Workflow classification rule

Before publish/exposure decisions, classify each workflow as exactly one:
- entry workflow
- internal sub-workflow
- MCP-exposed workflow

If it is a sub-workflow:
- do not force direct MCP publishability onto it
- use the entry shell / mock wrapper if needed

## Current stage rule for WF-EC-01

- use the user-created shell workflow named `WF-EC-01`
- remove/replace the placeholder internals as needed
- do not keep irrelevant trigger clutter once a canonical testable shell exists
- preserve the shell as the stable target for future updates

## Runtime discipline

Separate:
- design-level correctness
- persisted live workflow correctness
- runtime execution correctness

All three are required for closure.
