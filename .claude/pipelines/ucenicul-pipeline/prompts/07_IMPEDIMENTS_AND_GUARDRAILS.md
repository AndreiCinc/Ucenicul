# Impediments and Guardrails

This file captures the lessons from the first workflow and converts them into mandatory prevention rules.

## 1. SDK / MCP rabbit-hole risk

Observed issue:
- Claude spent too much time exploring `workflow()`, `trigger()`, `node()`, and helper behavior instead of shipping the patch.

Guardrail:
- if the defect is already known, allow only **one** validation attempt on the SDK path
- after that, switch to patch-minimally -> persist -> re-read -> runtime test
- do not reverse-engineer the SDK further during a live stage

## 2. False-positive workflow persistence

Observed issue:
- save appeared successful
- draft became empty
- active workflow stayed unchanged

Guardrail:
- after every workflow update, re-read and verify:
  - node count
  - connection count
  - exact patched fields
  - draft vs active

No round-trip verification -> update considered failed.

## 3. Canonical JSON vs generated workflow confusion

Observed issue:
- real n8n JSON was good
- SDK reconstruction introduced drift and loss

Guardrail:
- raw workflow JSON is canonical
- patch existing structure; do not rebuild by helper abstraction unless explicitly required

## 4. Missing schema alignment

Observed issue:
- workflow relied on DB columns that did not exist

Guardrail:
- run schema reality check before end-to-end testing
- no stage testing before table-column-query alignment is verified

## 5. Missing DB privileges / ownership blocker

Observed issue:
- direct ALTER could not be executed under the current DB user

Guardrail:
- detect ownership early
- if blocked, create parallel table with `_claude_mcp` suffix and continue
- do not block waiting for human intervention

## 6. Legacy data confusion

Observed issue:
- old data polluted testing and obscured stage truth

Guardrail:
- explicitly classify whether old data is:
  - preserved
  - migrated
  - ignored
  - cleaned

Do not silently preserve ambiguous legacy data.

## 7. Switch-node configuration failures

Observed issue:
- missing `value1`
- wrong `dataType`
- branch routing failures

Guardrail:
- audit all routing nodes for:
  - `value1`
  - `dataType`
  - rules
  - branch outputs
  - runtime behavior

## 8. Type mismatch between Code nodes and Switch nodes

Observed issue:
- upstream values were strings while switch logic expected booleans

Guardrail:
- verify runtime type alignment between code output and routing conditions
- do not declare fixed routing without executed branch proof

## 9. Postgres parameter misconfiguration

Observed issue:
- `$1/$2/...` queries without working replacements/parameters caused runtime failure

Guardrail:
- every parametrized Postgres node must be checked for:
  - replacement list existence
  - order
  - actual execution

## 10. Expression mode confusion in n8n UI

Observed issue:
- expression syntax was mixed incorrectly between raw JS and templated text

Guardrail:
- in Expression mode -> raw JS only
- in text mode -> `{{ ... }}` where appropriate
- never use assignment syntax inside UI fields

## 11. Wrong publishability assumptions

Observed issue:
- sub-workflow publishing assumptions did not match MCP/public trigger reality

Guardrail:
- classify workflow type before publish logic:
  - entry
  - sub-workflow
  - MCP-exposed

## 12. Design vs runtime confusion

Observed issue:
- optimistic claims were made before runtime proof

Guardrail:
- every report must separate:
  - read-based verification
  - DB-query verification
  - runtime execution verification
  - not yet executed

## 13. Premature completion claims

Observed issue:
- stage was close, but the real blocker was not yet closed

Guardrail:
- closure requires:
  - live schema validated
  - live workflow validated
  - patch persisted
  - runtime tests passed
  - post-test DB state checked
  - final report emitted

## Top 5 risk classes to watch continuously

1. unstable MCP/SDK write path
2. schema misalignment
3. DB privilege/ownership mismatch
4. routing type mismatch
5. missing Postgres query parameters
