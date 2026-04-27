# PHASE_GATE_CHECKLIST.md

| Phase | Name | Gate | Status |
|---|---|---|---|
| 0 | workspace control | control docs exist and resume protocol is defined | done |
| 1 | focus + divergence freeze | focus pack and divergence register exist | done |
| 2 | action contracts freeze | all 5 actions have stable contracts | done |
| 3 | design doc freeze | design doc exists and matches frozen contracts | done |
| 3.5 | walker / oracle freeze | test oracle, fixture manifest, and walker conventions exist | done |
| 4 | schema + migration freeze | schema rationale and migration SQL exist, both scored ≥ 9.6/10, migration live-dry-run green | **done (2026-04-20)** |
| 5 | patch planning freeze | patch plan exists with strict write fence and node-level implementation scope | **done (2026-04-20)** |
| 6 | patch implementation | approved patch plan has been executed within write fence and implementation artifacts updated | **done (2026-04-20, artefact-freeze; live PUT deferred to operator per D-M-009)** |
| 7 | walker execution freeze | walker implementation exists and test execution strategy is frozen | **done (2026-04-20)** |
| 8 | final verification | verification doc exists with residuals / v2 follow-ups | **done (2026-04-20)** |
| — | closeout refresh | `MODULE_CLOSEOUT.md` exists and re-verifies live state + D-M-009 still binding | **done (2026-04-21)** |
| — | live rollout | `WF-ME-01` patched live via `n8n-patch.mjs`; 7/7 verify invariants pass; D-M-009 closed | **done (2026-04-21)** |

## Advancement rule

Do not advance a phase without:
- updating `IMPLEMENTATION_STATE.md`
- checking for open bugs
- confirming no authority conflict was introduced
