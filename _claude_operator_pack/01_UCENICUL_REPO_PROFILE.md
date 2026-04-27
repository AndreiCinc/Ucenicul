# 01_UCENICUL_REPO_PROFILE

## Ucenicul-specific map
- `prompts/` = playbooks, mission prompts, operator instructions
- `manifests/` = index / stage / build memory de nivel macro
- `notes/WF-*` = workflow-specific truth, audits, handoff, per-stage evidence
- `notes/tools/n8n-patch` = tooling zone, not business workflow
- `archive/` = historical / backup / recovery / superseded bundles
- `workflow/` or workflow folders = implementation artifacts
- `state/` = posture/status snapshots when present

## Known repo risks
- missing README drift in subfolders
- stale generic manifests
- historical snapshots mistaken for current truth
- mixed doc quality across workflows
- `.env` or tool configs accidentally packaged
- closure claims that outpace evidence
- partial hotfixes that never got reconciled back into canonical docs

## Required interpretation rules
- prefer workflow-specific evidence over stale macro manifests
- never classify tooling folders as workflow business truth
- never treat archive as current truth unless a recovery analysis explicitly proves it
- never trust a single summary file when more specific evidence exists
