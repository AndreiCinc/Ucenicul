# V2-014 Fix Log

### V2-014-FIX-001 — Add `promotion_target: 'long_term'` to V2-014 rerun payload

- bucket: BAD_TEST_DEFINITION (rerun payload, not workflow)
- detected in: Phase 8 primary proof first attempt (executionId 3872)
- root cause: my V2-014 chatInput envelope omitted `promotion_target: 'long_term'` from `dispatcher_input.step.inputs`. Workflow node `ME_Memory_Promote_Prep` validates that field and emits `INVALID_PROMOTION_TARGET / missing_fields=[promotion_target]`. F3.1's `flattenPromoteInputs` does set this field; I built the V2-014 payload by hand and missed line 76 of `f31_runner.mjs`.
- change made: include `promotion_target: 'long_term'` in the inputs object for all V2-014 promote reruns.
- files touched: rerun payload only; no workflow change, no SQL change, no builder change. Patch payload `patchV2_014_params.json` is unchanged.
- rerun scope: re-run primary proof with corrected payload under fresh idempotency key `mem-v2014-primary-f31-promote-012-r2`. Apply same fix to safety-rerun payloads.
- rerun verdict: see Phase 8 attempt #2 below.

Note: execution 3872 left zero DB mutation (verified post-run); `ME_Memory_Promote_DB` ran with `_error=true` queryReplacement `[null,null,2,false,false]` so no row was touched. Pre-state for memory_id 8fb20b75 remains tier=recent / user_confirmed=true / evidence_validated=false / corr=1 / last_reconfirmed_at=null.
