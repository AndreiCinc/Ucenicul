# CHAIN_MAPPING — WF-RA-01 → WF-RC-01 (REJECTED)

## Decision
- decision_code: `EDGE_NON_CANONICAL`
- edge_type: `rejected`
- reason: Prior ledger listed `WF-RA-01 → WF-RC-01` as primary. Live topology contradicts this: `RA_Build_Downstream_Envelope` emits **only** `allowed_next_stage='WF-SU-01'`. The canonical path from RA to RC is indirect: `WF-RA-01 → WF-SU-01 → WF-RC-01`. This folder is retained solely as a ghost for audit.

## Evidence
- `WF-RA-01` (`5RcNLtxNjAHJsZPE`): no emission of `'WF-RC-01'` as `allowed_next_stage`. Only downstream stage advertised is `WF-SU-01`.
- `WF-SU-01` (`ENiYNfL3ul8AmmCB`): emits `allowed_next_stage='WF-RC-01'`, `response_generation_allowed=true`. SU is the actual precursor to RC.

## Action
- Do **not** patch any `Execute Workflow` from RA to RC.
- No connector, no mapping file transforms, no synthetic cases, no runtime runs for this edge.
- Close this folder out by leaving this rejection note; future audits should read it and not re-instate the edge.

## Replacement edges (active)
- `WF-RA-01 → WF-SU-01` — see `tests/generated/chains/WF-RA-01__TO__WF-SU-01/CHAIN_MAPPING.md`
- `WF-SU-01 → WF-RC-01` — see `tests/generated/chains/WF-SU-01__TO__WF-RC-01/CHAIN_MAPPING.md`
