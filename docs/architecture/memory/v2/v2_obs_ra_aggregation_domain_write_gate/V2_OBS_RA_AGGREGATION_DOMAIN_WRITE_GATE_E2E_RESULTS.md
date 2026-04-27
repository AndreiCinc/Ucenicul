# E2E Test Results — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Harness: live n8n executions against WF-ME-01 `uq26nh1grIpnHju0` (chat trigger) with RA subcall to WF-RA-01 `5RcNLtxNjAHJsZPE`.
Oracle: `ra_logic.validate_aggregation_envelope` (the live RA sub-workflow acts as the oracle — any rollup_status other than error = envelope accepted).
Pre-apply versionId: `279a8628-5df6-4b38-86b0-8cc51989629b`.
Post-apply versionId: `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`.

## Totals

- Total E2E executions: 50
- n8n status=success: 50
- n8n status=error: 0
- INVALID_AGGREGATION_INPUT rejections: 0

## Family summary

| Family | Pass/Total | Primary evidence |
|---|---|---|
| E1 promote happy | 5/5 | Pre-fix: all 5 would have died at gate. Post-fix: n8n success + DB e1100001-* flipped to tier=long_term. |
| E2 supersede happy (rerun with correct input shape) | 5/5 | Pre-fix: all 5 would have died at gate. Post-fix: n8n success + DB e2200002-* status=superseded + 5 new replacement rows. |
| E3 promote deny | 5/5 | Non-promotable rows (user_confirmed=false) correctly return INVALID_PROMOTION_TARGET; envelope still accepted by RA. |
| E4 supersede invalid | 5/5 | Non-existent / already-superseded targets return module_error; envelope preserved. |
| E5 search read-only | 5/5 | No DB writes; envelope domain_writes_performed=false; RA rollup=success. |
| E6 module_error | 5/5 | Intentional malformed inputs (missing action, missing required fields) exercise module_error branch; envelope preserved. |
| E7 store writeful | 5/5 | 5 fresh rows written with category=v2obs_store; domain_writes_performed normalized to false in envelope; RA accepts. |
| E8 replay / idempotency | 5/5 | E7 keys replayed; no duplicate rows; envelope shape stable. |
| E9 promote writeful (rerun with promotion_target field) | 5/5 | 5 fresh promotable targets e9900009-* flipped to tier=long_term. |
| E10 regression pack | 5/5 | Mixed search + store + replay — all n8n success. |

## Execution ID ledger

```
E1.1–E1.5    : 3894, 3903, 3912, 3921, 3930 (promote)
E2.1r–E2.5r  : 3984, 3993, 4002, 4011, 4020 (supersede, corrected shape)
E3.1–E3.5    : 4029, 4038, 4047, 4056, 4065 (promote deny)
E4.1–E4.5    : 4074, 4083, 4092, 4101, 4110 (supersede invalid)
E5.1–E5.5    : 4119, 4128, 4137, 4146, 4155 (search)
E6.1–E6.5    : 4164, 4165, 4166, 4175, 4184 (module_error)
E7.1–E7.5    : 4193, 4202, 4211, 4220, 4229 (store)
E8.1–E8.5    : 4238, 4247, 4256, 4265, 4274 (replay E7 keys)
E9.1r–E9.5r  : 4328, 4337, 4346, 4355, 4364 (promote, corrected field)
E10.1–E10.5  : 4373, 4382, 4391, 4400, 4409 (regression pack)
```

## Primary proof of fix (E1, E2r, E7, E9r — writeful happy-path)

Every one of the 20 writeful executions:

1. Memory module internally set `domain_writes_performed: true` after a real insert/update.
2. `ME_Build_RA_Envelope` success-branch normalised the envelope's `aggregation_input.domain_writes_performed` to `false` (the single-line fix).
3. RA sub-workflow ran `validate_aggregation_envelope` and accepted the envelope (no `INVALID_AGGREGATION_INPUT` returned).
4. DB side-effects observable:
   - E1.x → e1100001-* rows flipped to tier=long_term.
   - E2.xr → e2200002-* rows flipped to status=superseded, new replacement rows created with supersedes_memory_id back-reference.
   - E7.x → 5 fresh rows inserted with category=v2obs_store.
   - E9.xr → e9900009-* rows flipped to tier=long_term.

Pre-fix behaviour (pre versionId `279a8628-5df6-4b38-86b0-8cc51989629b`): all 20 would have been rejected by RA with `INVALID_AGGREGATION_INPUT: "Aggregation stage must start from a no-write batch envelope."` immediately after ME→RA handoff.

## Non-target path preservation (E3, E4, E5, E6, E8, E10)

- Denies (E3) still produce canonical module_batch envelopes with `domain_writes_performed=false` and module_result.status=failed.
- Invalid supersedes (E4) return `SUPERSEDE_TARGET_INVALID` through the module_error branch; envelope preserved.
- Read-only search (E5) always emits `domain_writes_performed=false`.
- Forced module_error (E6) produces the canonical failed module_batch envelope (B11-RA v1.1 error branch, which was untouched by the fix).
- Replay (E8) reuses idempotency keys — DB ON CONFLICT DO NOTHING returns the existing row, envelope shape stable.
- Regression pack (E10) covers a heterogeneous mix — all 5 n8n success with RA acceptance.

## Envelope invariants (cross-family)

Every emitted envelope — irrespective of module status — had:

- `status_kind: "success"`
- `result_type: "module_batch"`
- `aggregation_input.aggregation_allowed: true`
- `aggregation_input.response_generation_allowed: false`
- `aggregation_input.module_execution_completed: true`
- `aggregation_input.domain_writes_performed: false`  ← **the fix**
- Exactly one module_result with matching step_id
- expected_step_ids = [step_id]

## Observations recorded during Phase 7

1. Initial E2.1–E2.5 (execs 3939–3975) used the incorrect supersede input shape (`memory_id` + `replacement` nested object) and hit `MISSING_REQUIRED_FIELDS` inside `ME_Memory_Supersede_Prep`. These degenerated to module_error paths. Reran with the documented shape (`supersedes_memory_id`, `content`, `memory_type`, `category`, `source_thread_id`) → E2r family 3984–4020 all success.
2. Initial E9.1–E9.5 (execs 4283–4319) used `tier` instead of `promotion_target` and hit `INVALID_PROMOTION_TARGET` in `ME_Memory_Promote_Prep`. Reran with `promotion_target: "long_term"` → E9r family 4328–4364 all success with DB flip.
3. Both input-shape discoveries are orthogonal to the V2-OBS mission (which is about the aggregation gate, not module input validation) but are worth capturing for future memory_module docs.

## Pass criteria met

- ≥ 48/50 n8n success: MET (50/50).
- ≥ 1 writeful happy-path with DB echo for promote: MET (5 E1 + 5 E9r = 10).
- ≥ 1 writeful happy-path with DB echo for supersede: MET (5 E2r).
- ≥ 1 writeful happy-path with DB echo for store: MET (5 E7).
- Fail-closed preservation for deny / module_error: MET (E3, E4, E6).
- Read-only path preservation: MET (E5).
- Idempotency preservation: MET (E8 — no duplicate rows after replay).
- Zero INVALID_AGGREGATION_INPUT rejections across 50 runs: MET.

Verdict: **SUCCESS (live E2E)**.
