# 07_DONE_CRITERIA_PER_MODE

## bootstrap_only
Done when:
- mission file exists
- queue exists
- read order is clear

## review_only
Done when:
- audit artifacts exist
- no writes outside review scope happened
- verdict is explicit per workflow

## docs_standardization
Done when:
- mandatory README/doc artifacts exist by tier
- contradictions are reduced to explicit gaps
- no over-documentation for SMALL workflows

## repo_reconcile
Done when:
- foreign/stale/archive/sensitive classifications are explicit
- restructure actions are logged
- shared manifests are reconciled only from stronger truth

## workflow_semantics_rebuild
Done when:
- semantics card exists
- contracts reflect actual behavior
- public behavior is distinguishable from internal logic

## n8n_alignment_audit
Done when:
- live vs repo verdict exists
- drift type is explicit
- no patch happened

## live_patch
Done when:
- pre-patch audit exists
- snapshot/rollback path exists
- patch plan exists
- patch is applied
- roundtrip verification passes
- post-patch report exists

## package_final
Done when:
- manifest exists
- exclusions are explained
- no sensitive files included
- stale/foreign artifacts excluded

## full_autonomous_batch
Done when:
- every workflow in queue has final verdict
- unresolved ones are quarantined, not ignored
- global summary exists
- no pending silent contradictions remain
