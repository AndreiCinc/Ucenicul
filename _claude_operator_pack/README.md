# Ucenicul — Claude Autonomous Workflow Operator Pack v4

Acest pachet este versiunea întărită pentru autonomie reală pe 3–4 ore fără input uman curent.
Ținta lui nu este doar audit sau documentație izolată, ci un operator disciplinat care:

- ia workflow-urile **unul câte unul**
- face audit inițial
- remediază doar ce este permis și justificat
- rulează audit din nou
- intră într-o buclă de remediation până când verdictul devine `PASS`, `PASS_WITH_EXPLICIT_GAPS`, sau `QUARANTINED`
- continuă cu următorul workflow fără să ceară intervenție umană pentru cazurile obișnuite
- folosește subprocese doar pentru task-uri paralele sigure

## Ce aduce v4 peste v3
- `RUN_MISSION.md` și `RUN_MISSION.template.md`
- `WRITE_BOUNDARIES.md`
- `FAILSAFE_DECISION_TREE.md`
- `DONE_CRITERIA_PER_MODE.md`
- `WORKFLOW_BY_WORKFLOW_EXECUTION_LOOP.md`
- `PARALLEL_SUBPROCESS_POLICY.md`
- `QUARANTINE_AND_CONTINUATION_POLICY.md`
- skill-uri noi pentru queue management, remediation loop, parallel subprocess coordination, done gate verification și escalationless resolution
- template-uri noi pentru `WORKFLOW_RUN_RECORD`, `REMEDIATION_PASS_LOG`, `QUARANTINE_NOTE`, `RUN_QUEUE`, `GLOBAL_RUN_SUMMARY`

## Principiul central
Claude nu are voie să se blocheze pe ambiguități locale dacă restul lotului poate continua.
Dacă un workflow nu poate fi închis corect fără dovezi suplimentare, îl marchează `QUARANTINED`, explică de ce și continuă cu următorul.

## Ordinea de citire recomandată
1. `CLAUDE_START_HERE.md`
2. `RUN_MISSION.md` (sau template-ul dacă nu există)
3. `00_OPERATING_MODEL.md`
4. `01_UCENICUL_REPO_PROFILE.md`
5. `02_AGENT_AND_SKILL_SYSTEM.md`
6. `03_WORKFLOW_BY_WORKFLOW_EXECUTION_LOOP.md`
7. `04_PARALLEL_SUBPROCESS_POLICY.md`
8. `05_WRITE_BOUNDARIES.md`
9. `06_FAILSAFE_DECISION_TREE.md`
10. `07_DONE_CRITERIA_PER_MODE.md`
11. `08_WORKFLOW_STANDARD_AND_TIERS.md`
12. `09_CANONICALITY_AND_EVIDENCE_POLICY.md`
13. `10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md`
14. `11_DB_AND_CONTRACT_POLICY.md`
15. `12_SENSITIVE_FILES_AND_PACKAGE_POLICY.md`
16. `13_QUARANTINE_AND_CONTINUATION_POLICY.md`
17. `14_STOP_RECOVERY_AND_TOOL_FAILURE_POLICY.md`
18. `15_REPORTING_AND_OUTPUTS.md`
19. `skills/README.md`
20. `templates/README.md`

## Moduri de lucru
- `bootstrap_only`
- `review_only`
- `docs_standardization`
- `repo_reconcile`
- `workflow_semantics_rebuild`
- `n8n_alignment_audit`
- `live_patch`
- `package_final`
- `full_autonomous_batch`

## Rezultatul minim pe care trebuie să îl lase după un run lung
- `STANDARDIZATION_DECISION.md`
- `INVENTORY_CLASSIFICATION.md`
- `CANONICALITY_DECISION.md`
- `RUN_QUEUE.md`
- câte un `WORKFLOW_RUN_RECORD__<WF>.md` pentru fiecare workflow procesat
- `GLOBAL_RUN_SUMMARY.md`
- `QUARANTINE_NOTE__<WF>.md` pentru fiecare caz nerezolvabil sigur
