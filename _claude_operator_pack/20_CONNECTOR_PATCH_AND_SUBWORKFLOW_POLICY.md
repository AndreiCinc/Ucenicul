# 20 — CONNECTOR PATCH AND SUBWORKFLOW POLICY

This file governs how the operator persistently connects workflows for E2E testing and real usage.

## Default connector strategy

Inside n8n, use:
- **Execute Workflow** for direct workflow-to-workflow connections,
- synchronous wait semantics,
- explicit input mapping from source output to target expected input.

This is the default unless higher-precedence docs require another mechanism.

## Persistent patch rule

If a canonical edge is missing, patch the live workflow persistently.
Do not use a hidden one-off harness as the final state unless the canonical docs explicitly say the edge is for testing only.

## Subworkflow callability rule

If the target workflow is not callable as a subworkflow:
1. preserve its standalone entry behavior,
2. add or refactor an input path compatible with subworkflow invocation,
3. normalize the returned output shape,
4. document the callable contract,
5. add runtime smoke validation.

## Mapping rule

Every source → target connector must have a written mapping file that describes:
- source fields,
- target input fields,
- required transforms,
- defaults,
- null-handling,
- validation gates,
- blocking vs non-blocking failure behavior,
- DB assertions if the edge implies persistence semantics.

## Connector patch sequence

1. capture pre-patch JSON snapshot,
2. define required edge and mapping,
3. patch workflow locally,
4. patch live workflow,
5. re-fetch live workflow,
6. verify patch persisted,
7. run smoke chain case,
8. record post-patch snapshot,
9. emit a connector patch record,
10. proceed to full chain testing.

## Rollback rule

Rollback must be possible, but default behavior is **not** automatic rollback when the patch is canonical and correct.
Rollback is for:
- wrong patch,
- unstable patch,
- accidental non-canonical mutation,
- blocker investigation.

Correct canonical connector patches should remain in place.
