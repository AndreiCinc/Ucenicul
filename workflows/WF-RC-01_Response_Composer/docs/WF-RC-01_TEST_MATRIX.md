# WF-RC-01 Test Matrix

| V | Goal | Expected |
|---|---|---|
| V1 | Shell integrity | 14 nodes / 13 edges / 2 triggers / 2 switches / 2 Postgres |
| V2 | Invalid SU envelope | `INVALID_RESPONSE_COMPOSITION_INPUT` |
| V3 | Happy path success | `composed_response`, `allowed_next_stage=MESSAGE_OUT` |
| V3b | Happy path partial | partial response text remains honest |
| V4 | Follow-up / warnings rendering | response includes followups and warnings |
| V5 | Lineage mismatch | `LINEAGE_MISMATCH`, fail-closed |
| V6 | DB drift | read-only drift = 0 on owned tables |

## Oracle types per vector

| V | Oracle type(s) | Authoritative observation |
|---|---|---|
| V1 | Schema / shape match | n8n workflow JSON node count + edge count + trigger/switch/Postgres type counts |
| V2 | Exact error code match | `module_error.error.code == "INVALID_RESPONSE_COMPOSITION_INPUT"` |
| V3 | Schema match + downstream handoff assertion | `composed_response` present AND `allowed_next_stage == "MESSAGE_OUT"` |
| V3b | Exact output match | `response_status == "partial"`, text preserves honesty preamble |
| V4 | Schema match + content predicate | followups array non-empty; warnings rendered in response body |
| V5 | Exact error code match + routing invariant | `error.code == "LINEAGE_MISMATCH"` AND routed via `RC_Return_Context_Error` |
| V6 | DB side-effect assertion | `SELECT`-only; row-count delta = 0 on `execution_contexts`, `threads`, any RC-owned tables |

Off-node harness (650 tests) uses: exact output match per fixture + schema match on envelope structure.
