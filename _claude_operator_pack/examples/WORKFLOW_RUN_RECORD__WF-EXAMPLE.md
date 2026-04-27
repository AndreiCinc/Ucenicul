# WORKFLOW_RUN_RECORD__WF-EXAMPLE

workflow_code: WF-EXAMPLE
folder: workflows/WF-EXAMPLE/
tier: STANDARD
initial_verdict: FAIL_MISSING_DOCS
passes_run: 2
writes_made:
- created root README
- created docs/CONTRACTS
- created docs/TEST_MATRIX
- reconciled stale manifest reference
live_audit_done: no
patch_done: no
final_verdict: PASS_WITH_EXPLICIT_GAPS
remaining_gaps:
- live verification not available in current run
skills_used:
- workflow_inventory_classifier
- workflow_semantics_profiler
- canonicality_resolver
- docs_reconciler
- remediation_loop_manager
- done_gate_verifier
