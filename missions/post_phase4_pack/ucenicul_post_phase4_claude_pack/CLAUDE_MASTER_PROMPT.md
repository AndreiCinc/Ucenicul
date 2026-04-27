Ești executorul autonom pentru proiectul Ucenicul.

## Misiune autorizată

`UCENICUL_POST_PHASE4_REMINDER_DELIVERY_AUTONOMOUS_PACK`

Această misiune este un run de 3–4 ore pentru a închide starea post-Phase-4 și a pregăti următoarele frontiere, fără să rulezi producție și fără să trimiți Telegram.

Ai voie să execuți doar următoarele misiuni, în ordine:

1. `REMINDER_DELIVERY_LAYER_POST_PHASE4_DOC_NORMALIZATION`
2. `REMINDER_DELIVERY_LAYER_PHASE4_5_BASELINE_HARDENING`
3. `REMINDER_DELIVERY_LAYER_POST_PHASE4_PRODUCTIZATION_ROADMAP_PACK`
4. `PHASE5_MULTI_TENANT_ROLLOUT_CONTROLLED_EXECUTION_PACK` — prepare-only, nu runtime execution.

Nu ai voie să alegi alte frontiere.

---

# Baseline de confirmat

Confirmă înainte de orice schimbare:

- `REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT_GREEN = TRUE`.
- Pilot tenant: `eee0e2e0-0000-0000-0000-00000000000b`.
- Pilot chat id: `5101664726`.
- Provider message ref Phase 4: `548`.
- Fixture task: `d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde`.
- WF-RD-01 final post-restore versionId: `ff38f3d3-67a5-46d7-b5cf-7dd4b6ec0706`.
- WF-RD-01: 11 nodes / 14 connections.
- WF-RD-01: `active=false`.
- `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`.
- `RD_Live_Build_Body` is currently restored to v1.0 baseline and needs the v1.1 upstream-read fix.
- `RD_Live_Mark_Sent` has Phase 3 false-sent guard.
- `RD_Aggregate_Result` has counts v1.1 fix.
- `public.reminders` count=1, max(created_at)=2026-04-13 20:17:13.620582+00.
- `public.outbound_delivery_ledger_claude_mcp` count=0.
- `task_reminder_deliveries` count=27 and distinct `(tenant_id, task_id, due_occurrence_iso)` count=27.
- Tenants with `metadata.telegram_chat_id`: 0.
- Non-WF-RD workflows byte-identical.
- Memory V2 remains closed.

Dacă acest baseline nu se confirmă, STOP cu:

`POST_PHASE4_PACK_BLOCKED_BY_CURRENT_TRUTH_DRIFT`

---

# Reguli stricte pentru acest run

- Nu activa WF-RD-01.
- Nu trimite Telegram.
- Nu seta `telegram_chat_id` pe niciun tenant.
- Nu crea fixture tasks pentru send.
- Nu modifica `public.reminders`.
- Nu modifica `public.outbound_delivery_ledger_claude_mcp`.
- Nu rula Phase 5 runtime.
- Nu crea workflows duplicate.
- Nu modifica TR/EC/OR/PL/DI/ME/RA/SU/RC/MO.
- Nu redeschide Memory V2.
- Nu folosi Path 5.
- Folosește canalul canonic V2-028 local `n8n-patch` pentru orice WF-RD-01 mutation.
- Orice schema migration este interzisă în acest run.

---

# Context budget

## Layer 0 — obligatoriu

Citește întâi:

- `docs/architecture/reminder_delivery_layer/phase4_controlled_single_tenant_pilot/CLOSEOUT.md`
- `docs/architecture/reminder_delivery_layer/phase4_controlled_single_tenant_pilot/ACTIVATION_LOG.md`
- `docs/architecture/reminder_delivery_layer/phase4_controlled_single_tenant_pilot/FIRST_TICK_RESULTS.md`
- `docs/architecture/reminder_delivery_layer/phase4_controlled_single_tenant_pilot/OBSERVATION_WINDOW_RESULTS.md`
- `docs/architecture/reminder_delivery_layer/phase4_controlled_single_tenant_pilot/SQL_INVARIANTS.md`
- `docs/architecture/reminder_delivery_layer/phase4_controlled_single_tenant_pilot/WORKFLOW_PATCH_LOG.md`
- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`

## Layer 1 — front-door docs

Citește după Layer 0:

- `docs/architecture/n8n_Workflow_Mapping.md`
- `docs/architecture/Module_Registry_Ucenicul.md`
- `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
- `docs/architecture/decisions/ADR-REMINDER-AS-TASK-LAYER.md`
- `docs/architecture/reminder_delivery_layer/phase3_tenant_onboarding_production_gate/CLOSEOUT.md`
- `docs/architecture/reminder_delivery_layer/phase3_tenant_onboarding_production_gate/PRODUCTION_GATE_RUNBOOK.md`
- `docs/architecture/reminder_delivery_layer/phase3_tenant_onboarding_production_gate/PHASE4_CONTROLLED_PILOT_PLAN.md`

## Layer 2 — doar dacă Layer 0/1 se bat cap în cap

- workflow snapshot actual WF-RD-01;
- DB inspection for `public.tasks`, `public.tenants`, `public.task_reminder_deliveries`;
- grep pentru `PHASE4`, `PHASE5`, `RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP`, `telegram_chat_id`, `WF-RD-01`.

## Layer 3 — doar pentru contradiction/lineage audit

Dacă documentele se contrazic, marchează claims vechi ca `SUPERSEDED`. Nu șterge istorie utilă.

---

# MISSION 1 — POST PHASE 4 DOC NORMALIZATION

Mission name:

`REMINDER_DELIVERY_LAYER_POST_PHASE4_DOC_NORMALIZATION`

## Obiectiv

Normalizează documentația după Phase 4 green.

## Scope permis

Doc-only:

- `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`
- `Module_Registry_Ucenicul.md`, doar dacă trebuie
- `n8n_Workflow_Mapping.md`, doar dacă trebuie să reflecte versionId final / follow-up
- current truth / session handoff docs dacă există
- mission-local docs noi

## Scope interzis

- Nu modifica workflow-uri.
- Nu modifica schema.
- Nu modifica DB.
- Nu trimite Telegram.
- Nu activa scheduler.

## Folder output

Creează:

`docs/architecture/reminder_delivery_layer/post_phase4_doc_normalization/`

Cu:

1. `READ_STATUS.md`
2. `DRIFT_REGISTER.md`
3. `NORMALIZATION_PLAN.md`
4. `DOC_DIFF_SUMMARY.md`
5. `CURRENT_TRUTH_AFTER_PHASE4_GREEN.md`
6. `CLOSEOUT.md`

## Current truth obligatoriu

Documentația finală trebuie să spună:

- `REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT_GREEN = TRUE`.
- Scheduler-active reminder delivery is proven for one controlled tenant.
- One Telegram message delivered, provider ref `548`.
- Replay tick produced 0 duplicates.
- WF-RD-01 restored to NoOp, active=false.
- `public.reminders` and outbound ledger unchanged.
- `RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP` is open and must be closed before Phase 5.
- Next frontier is `REMINDER_DELIVERY_LAYER_PHASE4_5_BASELINE_HARDENING`, not Phase 5 directly.

## Grep/audit

Grep pentru:

- `REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT`
- `REMINDER_DELIVERY_LAYER_PHASE4_CONTROLLED_SINGLE_TENANT_PILOT_GREEN`
- `REMINDER_DELIVERY_LAYER_PHASE5_MULTI_TENANT_PILOT`
- `RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP`
- `WF-RD-01`
- `task_reminder_deliveries`
- `public.reminders`

Clasifică aparițiile ca current / historical / superseded / drift.

## Verdict

Green:

`REMINDER_DELIVERY_POST_PHASE4_DOC_NORMALIZATION_READY = TRUE`

Blocked:

`REMINDER_DELIVERY_POST_PHASE4_DOC_NORMALIZATION_BLOCKED_BY_<REASON>`

Nu continua cu Mission 2 decât dacă Mission 1 este green.

---

# MISSION 2 — PHASE 4.5 BASELINE HARDENING

Mission name:

`REMINDER_DELIVERY_LAYER_PHASE4_5_BASELINE_HARDENING`

## Obiectiv

Închide follow-up-ul:

`RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP`

Patch-uiește canonical baseline WF-RD-01 astfel încât `RD_Live_Build_Body` să folosească v1.1, citind payloadul de la `$('RD_Classify_And_Build').item.json`, nu din `$json` după `RD_Upsert_Delivery_Row`.

## Motiv

Phase 4 first scheduled tick safe-failed la `RD_Live_Build_Body` v1.0 pentru că `$json` fusese suprascris de Postgres RETURNING. Mid-window patch v1.1 a fost dovedit end-to-end, dar Variant A restore l-a readus la v1.0. Înainte de Phase 5, v1.1 trebuie să intre în baseline.

## Scope permis

- Patch doar WF-RD-01.
- Un singur node: `RD_Live_Build_Body`.
- 0 node delta.
- 0 connection delta.
- Workflow rămâne `active=false`.
- Nu atașa Telegram node.
- `RD_Live_Send_PLACEHOLDER` rămâne NoOp.
- Nu seta `telegram_chat_id`.
- Nu trimite Telegram.

## Output folder

Creează:

`docs/architecture/reminder_delivery_layer/phase4_5_baseline_hardening/`

Cu:

1. `MISSION_BRIEF.md`
2. `READ_STATUS.md`
3. `PATCH_PLAN.md`
4. `WF_RD_PATCH_LOG.md`
5. `FIX_TEST_RESULTS.md`
6. `SQL_INVARIANTS.md`
7. `REGRESSION_RESULTS.md`
8. `P0_STOP_CONDITIONS.md`
9. `CLOSEOUT.md`
10. `artifacts/WF-RD-01_phase4_5_pre.json`
11. `artifacts/WF-RD-01_phase4_5_post.json`

## Preflight

Confirmă:

- WF-RD-01 active=false.
- `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`.
- `RD_Live_Build_Body` is v1.0 and needs fix.
- `RD_Live_Mark_Sent` has false-sent guard.
- `RD_Aggregate_Result` has v1.1 counts fix.
- no tenants with `telegram_chat_id`.

## Patch target

Patch `RD_Live_Build_Body.parameters.jsCode` to v1.1 behavior:

- read source from `$('RD_Classify_And_Build').item.json`;
- build `live_payload.chat_id` from `source.reminder.delivery_target`;
- build `live_payload.text` from `source.response_text` or canonical reminder text;
- preserve `__db`, `reminder`, `classified_outcome`, and status fields needed by downstream nodes;
- do not set false `live_send_status='sent'` before provider result.

## Tests

No external send.

Required tests:

1. Static workflow JSON check: only `RD_Live_Build_Body` changed.
2. Extracted JS/unit test with mock `RD_Classify_And_Build` output containing reminder.delivery_target.
3. Extracted JS/unit test with missing delivery_target returns controlled error or no live payload, not crash.
4. Dry-run workflow execution in default `dry_run_audit` mode: no Telegram, no sent rows.
5. SQL invariants:
   - `public.reminders` unchanged;
   - outbound ledger unchanged;
   - `task_reminder_deliveries` count unchanged unless dry-run explicitly creates known audit row; prefer no new rows;
   - tenants with chat_id remains 0;
   - workflow active=false.
6. Regression audit: non-WF-RD workflows unchanged.

## P0 stop conditions

STOP dacă:

- workflow becomes active=true;
- Telegram node is attached;
- any Telegram send is attempted;
- `public.reminders` changes;
- outbound ledger changes;
- any non-WF-RD workflow changes;
- node/connection delta not zero;
- Path 5 required;
- patch cannot be rolled back.

## Verdicts

Green:

`RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_READY = TRUE`

Blocked:

`RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_BLOCKED_BY_<REASON>`

Nu continua cu Mission 3 decât dacă Mission 2 este green.

---

# MISSION 3 — POST PHASE 4 PRODUCTIZATION ROADMAP PACK

Mission name:

`REMINDER_DELIVERY_LAYER_POST_PHASE4_PRODUCTIZATION_ROADMAP_PACK`

## Obiectiv

Creează un singur set de documente care blochează următoarea secvență de lucru pentru Reminder Delivery Layer.

Claude nu are voie să aleagă alte frontiere până când aceste direcții nu sunt închise sau explicit re-prioritizate de operator.

Direcții, în ordine:

1. `PHASE5_MULTI_TENANT_ROLLOUT_CONTROLLED`
2. `TENANT_ONBOARDING_REAL_TELEGRAM_CHAT_ID`
3. `REMINDER_DELIVERY_OBSERVABILITY_AND_ALERTING`
4. `REMINDER_CHAT_UX_ADVANCED`
   - done / complete from chat;
   - snooze;
   - cancel reminder;
   - update / reschedule reminder;
   - recurring reminders ADR.

Nu construim frontend acum. Totul rămâne chat-first / Telegram-first.

## Folder output

Creează:

`docs/architecture/reminder_delivery_layer/post_phase4_productization_roadmap/`

Cu:

1. `MISSION_BRIEF.md`
2. `READ_STATUS.md`
3. `PHASE4_GATE_AUDIT.md`
4. `PHASE4_5_HARDENING_AUDIT.md`
5. `ROADMAP_MASTER.md`
6. `FRONTIER_LOCK.md`
7. `PHASE5_MULTI_TENANT_ROLLOUT_PLAN.md`
8. `TENANT_ONBOARDING_REAL_CHAT_ID_PLAN.md`
9. `OBSERVABILITY_AND_ALERTING_IMPLEMENTATION_PLAN.md`
10. `REMINDER_CHAT_UX_ADVANCED_PLAN.md`
11. `REMINDER_CHAT_UX_TEST_MATRIX.md`
12. `SCHEMA_AND_MIGRATION_DECISION_LOG.md`
13. `WORKFLOW_IMPACT_MAP.md`
14. `RISK_REGISTER.md`
15. `P0_STOP_CONDITIONS.md`
16. `EXECUTION_SEQUENCE.md`
17. `CLAUDE_AUTONOMOUS_PROMPTS.md`
18. `ACCEPTANCE_CHECKLIST.md`
19. `CLOSEOUT.md`

## Roadmap master

Definește:

- Phase 5: controlled multi-tenant rollout.
- Phase 6: real Telegram tenant onboarding.
- Phase 7: observability and alerting.
- Phase 8: advanced reminder chat UX.

## Frontier lock

Scrie clar:

After Phase 4 green + Phase 4.5 hardening, Claude must only work on:

1. PHASE5_MULTI_TENANT_ROLLOUT_CONTROLLED
2. TENANT_ONBOARDING_REAL_TELEGRAM_CHAT_ID
3. REMINDER_DELIVERY_OBSERVABILITY_AND_ALERTING
4. REMINDER_CHAT_UX_ADVANCED

Claude must not open frontend work, Memory V2 work, unrelated workflow refactors, or unrelated SaaS features unless operator explicitly reprioritizes.

## Phase 5 plan

Plan only, no execution:

- opt-in tenants only;
- allowlist required;
- per-tenant candidate limit = 10;
- global candidate limit = 30;
- 2–3 tenants max for first multi-tenant pilot;
- backlog bootstrap ON;
- 24h observation;
- P0 stop on any wrong-chat / cross-tenant / duplicate / false-sent.

## Tenant onboarding real chat id

Evaluate:

- Option A — manual operator DB onboarding;
- Option B — Telegram `/start` capture;
- Option C — invite code `/start TENANT_INVITE_CODE`.

Default recommendation:

- use Option A for first controlled tenants;
- plan Option C for product-ready onboarding;
- no schema migration without separate ADR + rollback.

## Observability and alerting

Plan:

- SQL audit queries;
- daily summary;
- Telegram/admin alert later;
- alert on failed_count > 0, consecutive_failures >= 3, cross_tenant_rows > 0, false_sent_count > 0, backlog spike, candidate spike.

No frontend.

## Advanced reminder chat UX

Plan chat-first features:

1. Done/complete from chat.
2. Snooze simple.
3. Cancel/update/reschedule.
4. Recurring reminders ADR.

Include test matrix:

- single match;
- zero match;
- multiple matches;
- replay;
- cross-tenant;
- ambiguous utterances;
- timezone;
- recurring no infinite loop.

## Schema decision log

Classify:

Likely no migration:

- done/complete via task_module;
- cancel/update via task_module;
- simple snooze via task due_at update;
- delivery audit via task_reminder_deliveries.

Likely migration / ADR:

- recurring reminders;
- invite codes;
- per-user chat ids;
- notification preferences;
- snooze history if not safe in metadata;
- alerting ledger.

## Autonomous prompts

Write full future prompts for:

1. Phase 5 controlled multi-tenant rollout.
2. Tenant onboarding real chat id.
3. Observability/alerting.
4. Reminder chat UX done/complete.
5. Reminder chat UX snooze.
6. Reminder chat UX cancel/update.
7. Recurring reminders ADR.

Each prompt must include:

- context budget;
- scope;
- non-goals;
- schema policy;
- workflow patch policy;
- test strategy;
- SQL invariants;
- P0 stop conditions;
- expected docs;
- final verdict options.

## Verdict

Green:

`REMINDER_DELIVERY_POST_PHASE4_PRODUCTIZATION_ROADMAP_READY = TRUE`

Blocked:

`REMINDER_DELIVERY_POST_PHASE4_PRODUCTIZATION_ROADMAP_BLOCKED_BY_<REASON>`

---

# MISSION 4 — PHASE 5 EXECUTION PACK, PREPARE-ONLY

Mission name:

`PHASE5_MULTI_TENANT_ROLLOUT_CONTROLLED_EXECUTION_PACK`

## Obiectiv

Pregătește pachetul concret pentru Phase 5, dar nu îl executa.

## Important

Nu rula Phase 5, deoarece operatorul trebuie să dea explicit:

- lista tenant IDs;
- chat ids autorizate;
- activation window;
- dacă pilotul rămâne activ 24h sau se restaurează NoOp.

## Output

Creează:

`docs/architecture/reminder_delivery_layer/phase5_multitenant_rollout_execution_pack/`

Cu:

1. `PHASE5_OPERATOR_INPUT_TEMPLATE.md`
2. `PHASE5_MISSION_BRIEF.md`
3. `PHASE5_CANDIDATE_SQL.md`
4. `PHASE5_BOOTSTRAP_BACKLOG_SQL.md`
5. `PHASE5_RUNBOOK.md`
6. `PHASE5_TEST_MATRIX.md`
7. `PHASE5_SQL_INVARIANTS.md`
8. `PHASE5_P0_STOP_CONDITIONS.md`
9. `PHASE5_ROLLBACK_PLAN.md`
10. `PHASE5_AUTONOMOUS_CLAUDE_PROMPT.md`
11. `CLOSEOUT.md`

## Verdict

Green:

`PHASE5_MULTI_TENANT_ROLLOUT_EXECUTION_PACK_READY = TRUE`

Blocked:

`PHASE5_MULTI_TENANT_ROLLOUT_EXECUTION_PACK_BLOCKED_BY_<REASON>`

---

# Final report required

La final raportează:

1. Mission 1 verdict.
2. Mission 2 verdict.
3. Mission 3 verdict.
4. Mission 4 verdict.
5. Files created.
6. Files changed.
7. WF-RD-01 versionId before/after Phase 4.5.
8. Node/connection delta.
9. Whether workflow active=false.
10. Whether Telegram was sent: must be 0.
11. SQL invariant summary.
12. P0 stop conditions summary.
13. Final next frontier.
14. Exact prompt/operator inputs needed next.

Expected final overall verdict:

`UCENICUL_POST_PHASE4_REMINDER_DELIVERY_AUTONOMOUS_PACK_READY = TRUE`
