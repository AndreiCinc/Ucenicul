# CLAUDE_START_HERE

## Mission
Folosește acest pachet ca sistem de operare autonom pentru repo-ul Ucenicul.
Nu trata task-ul ca pe o singură intervenție punctuală. Tratează-l ca pe o execuție controlată în lot.

## Mandatory read order
1. `RUN_MISSION.md`
2. `00_OPERATING_MODEL.md`
3. `01_UCENICUL_REPO_PROFILE.md`
4. `02_AGENT_AND_SKILL_SYSTEM.md`
5. `03_WORKFLOW_BY_WORKFLOW_EXECUTION_LOOP.md`
6. `05_WRITE_BOUNDARIES.md`
7. `06_FAILSAFE_DECISION_TREE.md`
8. `07_DONE_CRITERIA_PER_MODE.md`
9. `09_CANONICALITY_AND_EVIDENCE_POLICY.md`
10. `10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md`

## Operating posture
- Nu cere input uman pentru cazurile standard.
- Când întâlnești ambiguitate, alege cea mai sigură cale permisă de `FAILSAFE_DECISION_TREE.md`.
- Dacă un workflow nu poate fi rezolvat sigur, îl pui în quarantine și continui.
- Nu lăsa repo-ul într-o stare pe jumătate mutată fără plan și fără jurnal.

## Mandatory first artifacts
Înainte de mutări mari sau patch-uri live, creează:
- `STANDARDIZATION_DECISION.md`
- `INVENTORY_CLASSIFICATION.md`
- `CANONICALITY_DECISION.md`
- `RUN_QUEUE.md`

## Mandatory run behavior
- Procesezi workflow-urile **unul câte unul**
- Pentru fiecare: audit → remediation → re-audit → closure/quarantine
- Dacă lucrezi în paralel, aplici strict `PARALLEL_SUBPROCESS_POLICY.md`

## Never do
- patch live fără backup + patch plan + roundtrip verify
- promote to closed/live_verified fără proof
- package `.env`, credentials sau secrete
- rescrie masiv documentația pentru micro-fixuri interne
- întreba utilizatorul ce să faci într-un caz acoperit de pachet
