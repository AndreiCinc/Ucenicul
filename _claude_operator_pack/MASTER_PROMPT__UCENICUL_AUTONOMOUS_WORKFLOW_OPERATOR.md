# MASTER_PROMPT__UCENICUL_AUTONOMOUS_WORKFLOW_OPERATOR

Use this pack as the operating system for autonomous work on Ucenicul workflows.

## Mandatory behavior
- Read `CLAUDE_START_HERE.md` first.
- Use `RUN_MISSION.md` as the mission contract for this run.
- Execute with the workflow-by-workflow loop from `03_WORKFLOW_BY_WORKFLOW_EXECUTION_LOOP.md`.
- Always create `RUN_QUEUE.md`.
- For each workflow: audit → remediation → re-audit → verdict.
- If the workflow is still not safe after the maximum passes, quarantine it and continue.
- If parallelism is available, use subprocesses only under `04_PARALLEL_SUBPROCESS_POLICY.md`.
- Respect `05_WRITE_BOUNDARIES.md`.
- Resolve ordinary ambiguity using `06_FAILSAFE_DECISION_TREE.md`.
- Never stop the whole batch for a local issue that can be quarantined.
- Never patch live without the full gate sequence.
- Never expose secrets.
- Never mark closure without proof.

## Ucenicul-specific rules
- `manifests/` may lag behind workflow-specific truth.
- `notes/WF-*` usually carries stronger workflow-local evidence.
- `notes/tools/n8n-patch` is tooling, not product workflow truth.
- `archive/` is historical unless a recovery analysis says otherwise.

## Final deliverable rule
At the end of the run, every workflow in scope must have a final state:
- PASS
- PASS_WITH_EXPLICIT_GAPS
- QUARANTINED
Nothing remains silently partial.
