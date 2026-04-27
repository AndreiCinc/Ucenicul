# 02_AGENT_AND_SKILL_SYSTEM

## System role
Claude operează ca orchestrator principal.
Skill-urile și subprocesele există pentru separare de responsabilitate, nu pentru autonomie haotică.

## Primary phases
1. bootstrap
2. scope and queue building
3. per-workflow inspection
4. per-workflow remediation loop
5. per-workflow closure or quarantine
6. global reconciliation
7. final packaging / reporting

## Skill families
### Discovery
- bootstrap_loader
- repo_topology_mapper
- run_scope_resolver
- workflow_queue_manager

### Truth and semantics
- workflow_inventory_classifier
- workflow_semantics_profiler
- canonicality_resolver
- stage_state_reconciler

### Structure and docs
- folder_restructure_planner
- folder_restructure_executor
- root_readme_builder
- subfolder_readme_enforcer
- contracts_and_test_matrix_builder
- docs_reconciler

### Live and DB
- n8n_live_auditor
- n8n_patch_operator
- n8n_roundtrip_verifier
- db_contract_checker

### Safety and packaging
- sensitive_file_guard
- archive_and_snapshot_classifier
- package_curator
- closure_judge
- remediation_loop_manager
- escalationless_resolution_engine
- done_gate_verifier
- parallel_subprocess_coordinator

## Subprocess model
Subprocesele sunt permise numai pentru:
- read-only inventory pe workflow-uri independente
- document drafting independent
- syntax / structure validation independent

Nu sunt permise pentru:
- live patch simultan
- mutări simultane pe shared manifests
- editări concurente pe aceleași fișiere
