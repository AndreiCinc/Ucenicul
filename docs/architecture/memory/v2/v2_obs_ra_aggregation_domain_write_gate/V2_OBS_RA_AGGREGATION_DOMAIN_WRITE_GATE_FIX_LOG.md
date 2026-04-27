# Fix Log — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

## One-line summary

`ME_Build_RA_Envelope` success branch now always emits `aggregation_input.domain_writes_performed: false`, regardless of what the inbound `src.module_result`/`src.domain_writes_performed` signalled. This satisfies RA's `validate_aggregation_envelope` guard on line 80 of `ra_logic.py`.

## Root cause

Pre-fix, when memory_module (or any module executing in `execute` mode) performed a real DB write (promote/supersede/store), its result payload set `domain_writes_performed: true`. `ME_Build_RA_Envelope`'s success branch passed that flag through untouched into the outbound envelope's `aggregation_input.domain_writes_performed`. RA's `validate_aggregation_envelope` then rejected with:

> INVALID_AGGREGATION_INPUT: "Aggregation stage must start from a no-write batch envelope."

The canonical invariant is that the aggregation stage is upstream of domain-write commits — writes happen during module execution but the **envelope that hands off to RA for aggregation must declare `domain_writes_performed: false` because aggregation itself does not write**. The guard was correct; the envelope construction was over-propagating a semantically irrelevant module-level flag.

## The change

File: `WF-ME-01 Module Execution` → node `ME_Build_RA_Envelope` → `parameters.jsCode`

Success branch (old):
```js
aggregation_input: {
  aggregation_allowed: true,
  response_generation_allowed: false,
  module_execution_completed: true,
  domain_writes_performed: !!src.domain_writes_performed,
  ...
}
```

Success branch (new):
```js
aggregation_input: {
  aggregation_allowed: true,
  response_generation_allowed: false,
  module_execution_completed: true,
  domain_writes_performed: false,  // V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE
  ...
}
```

Comment-block header updated to document the fix rationale. Error branch left untouched — it already emitted `domain_writes_performed: false` per B11-RA v1.1.

## Scope

- Node count unchanged (45).
- Connection count unchanged (63).
- Exactly one node touched: `ME_Build_RA_Envelope`.
- Exactly one field inside its jsCode touched: the success-branch `domain_writes_performed` assignment (plus comment-block header).

## Apply channel

Operator-run CLI (V2-025):
```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
    patch-node uq26nh1grIpnHju0 ME_Build_RA_Envelope \
    --params docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/artifacts/patchV2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_params.json
```

Result: `{"id":"uq26nh1grIpnHju0","patched":"ME_Build_RA_Envelope","keys":["jsCode"]}`

Pre-apply versionId: `279a8628-5df6-4b38-86b0-8cc51989629b`.
Post-apply versionId: `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`.

## Verification

- Local harness (50/50 PASS) — `ra_logic_js.mjs` oracle accepts post-patch jsCode output.
- Live n8n (50/50 success) — RA sub-executions accept envelopes for writeful happy-path and fail-closed branches.
- Diff surface audit — only ME_Build_RA_Envelope.parameters.jsCode changed.

## Related decisions

- V2-025 (operator-run CLI canonical): reaffirmed.
- F5 (CLOSED): unaffected.
- F3.1 Stage C / V2-014: unaffected.
- D-M-014 (Path 5 retired, F5-only): unaffected.
