# Impediments and Guardrails

This file converts observed failures into mandatory prevention rules.

## 1. SDK / MCP rabbit-hole risk

Observed issue:
- too much time was spent exploring helper abstractions instead of shipping the stage

Guardrail:
- allow one validation attempt only on a known degraded SDK path
- after that, switch to verified native JSON discipline or blocked evidence capture
- do not reverse-engineer SDK grammar during an active stage

## 2. False-positive workflow persistence

Observed issue:
- save appeared successful
- active workflow did not reflect the intended change

Guardrail:
- every workflow write must be followed by immediate live re-read
- verify node count, connection count, shell identity, and target fields
- no round-trip verification means no successful write

## 3. Canonical JSON vs generated helper confusion

Observed issue:
- native n8n JSON was structurally correct
- helper-generated representations drifted from live truth

Guardrail:
- native live workflow JSON is canonical
- helper abstractions are secondary and disposable
- never let helper shape override live workflow truth

## 4. Missing schema alignment

Observed issue:
- workflow logic relied on columns or states not verified in live DB

Guardrail:
- no DB-backed runtime path begins before schema reality check
- no inferred schema from error text
- status mismatches must be mapped explicitly

## 5. Ownership / privilege blocker

Observed issue:
- direct schema change could stall the stage

Guardrail:
- detect ownership early
- if blocked, use `_claude_mcp` fallback
- do not wait for human intervention unless every safe fallback is exhausted

## 6. Legacy data confusion

Observed issue:
- old rows obscured stage truth and polluted runtime interpretation

Guardrail:
- isolate stage evidence with fixtures
- classify legacy data explicitly
- do not use ambiguous legacy rows as proof

## 7. Switch-node configuration failures

Observed issue:
- routing nodes failed because of missing fields or wrong type assumptions

Guardrail:
- audit `value1`, `value2`, `dataType`, rule set, and runtime branch proof
- no routing fix is accepted on config inspection alone

## 8. Type mismatch between code and routing nodes

Observed issue:
- strings and booleans were mixed incorrectly

Guardrail:
- verify runtime type from actual upstream output
- align routing to observed type, not UI assumption

## 9. Postgres parameter misconfiguration

Observed issue:
- `$1/$2/...` queries failed because parameter surface was broken

Guardrail:
- every parameterized SQL node must be checked for:
  - parameter surface
  - parameter order
  - actual execution
  - downstream row-shape compatibility

## 10. Expression mode confusion

Observed issue:
- raw JS and templated expressions were mixed incorrectly

Guardrail:
- Expression mode: raw JS only
- Text mode: `{{ ... }}` only where appropriate

## 11. Workflow-type assumption failures

Observed issue:
- sub-workflow and entry-workflow assumptions were mixed

Guardrail:
- classify workflow type before publishability logic
- do not impose entry constraints on internal sub-workflows

## 12. Design vs runtime confusion

Observed issue:
- optimistic claims were made before runtime proof

Guardrail:
- every report must separate:
  - read-based verification
  - DB-query verification
  - runtime verification
  - inference
  - unknowns

## 13. Premature completion claims

Observed issue:
- stage was treated as nearly closed while the real blocker remained unresolved

Guardrail:
- no closure without:
  - live workflow truth
  - live DB truth
  - runtime proof where required
  - post-test DB verification
  - written audit
  - final score 10/10

## 14. Browser bridge dependency drift

Observed issue:
- a browser extension or session bridge was treated as if it were a required automation surface

Guardrail:
- browser bridges are optional convenience paths
- their absence must not trigger architecture redesign
- if no non-browser verified write surface exists, classify correctly and stop the path

## 15. Tooling blocker misclassification

Observed issue:
- a tooling write-surface failure risked being treated as a product decision blocker

Guardrail:
- tooling write-surface failure is usually `BLOCKED_WITH_EVIDENCE`
- it becomes `HUMAN_DECISION_REQUIRED` only when all verified fallback paths are exhausted and a real decision is needed

## Top continuous risk classes

1. unstable workflow write path
2. schema misalignment
3. ownership / privilege mismatch
4. routing type mismatch
5. parameterized SQL misconfiguration
