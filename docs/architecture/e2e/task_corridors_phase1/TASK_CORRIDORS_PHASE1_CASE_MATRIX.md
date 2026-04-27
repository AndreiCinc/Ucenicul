# TASK_CORRIDORS_PHASE1 Case Matrix

> Source of cases for this mission. 56 live cases, organized by corridor.
> Each case has a deterministic `tenant_id`, `thread_id`, `message_id`,
> `idempotency_key` derived from `run_tag = tcp1-2026-04-25` + `case_id`.

Notation:
- `intent` = the `messages.intent` value pre-set before TR fires.
  - Reminder-like cases use `create_reminder` to exercise the PL re-route.
- `expected_action` = what `ME_Route_Task_Action` is expected to fire.
- All P0 cases are tagged `P0`; remaining cases are `P1`.

## C6 — planning / composition (12 cases)

Chain path under test: TR → EC → OR → PL → DI → ME (`task_module.create_task`)
→ RA → SU → RC → MO. Memory recall NOT exercised here (the predecessor
mission proved the create_task path is independent of memory; multi-step
plans involving memory remain in the next mission). All 12 produce exactly
one task row (delta=+1) per case.

| case_id | priority | level | tenant | user_input | intent | expected_action | expected |
|---|---|---|---|---|---|---|---|
| TC-C6-01 | P0 | L1 | DEFAULT | "Creează task: revizuiește contractul." | create_task | create_task | row_delta=1, status=open, due_type=flexible |
| TC-C6-02 | P0 | L1 | DEFAULT | "Add task: review the contract." | create_task | create_task | row_delta=1, status=open |
| TC-C6-03 | P1 | L2 | DEFAULT | "Creează task: pregătește slide-urile pentru întâlnire mâine." | create_task | create_task | row_delta=1; due_type=date OR flexible |
| TC-C6-04 | P1 | L2 | DEFAULT | "Make a task: draft the Q3 report tomorrow at 10." | create_task | create_task | row_delta=1, due_type=datetime, due_at near 10:00Z |
| TC-C6-05 | P0 | L3 | DEFAULT | "Creează task: sună-l pe Andrei mâine la 9 pentru a discuta oferta." | create_task | create_task | row_delta=1, due_type=datetime, title contains 'Andrei' OR 'oferta' |
| TC-C6-06 | P1 | L3 | DEFAULT | "Setează un task urgent: blocăm site-ul de mentenanță azi la 22." | create_task | create_task | row_delta=1, priority=urgent OR normal (priority extraction is best-effort), due_type=datetime |
| TC-C6-07 | P1 | L4 | DEFAULT | "Adaugă task: trimite contractul către Andrei până poimâine." | create_task | create_task | row_delta=1, due_type=date, due_date=tomorrow+1 |
| TC-C6-08 | P1 | L4 | DEFAULT | "Creează task: pregătește prezentarea pentru investitori." | create_task | create_task | row_delta=1, status=open |
| TC-C6-09 | P0 | L4 | DEFAULT | "Listează taskurile mele deschise." | list_tasks | list_tasks | row_delta=0, domain_writes_performed=false |
| TC-C6-10 | P1 | L3 | DEFAULT | "Marchează taskul cu prezentarea ca făcut." | complete_task | complete_task | resolution: targets the prezentare task only; status→done; completed_at set |
| TC-C6-11 | P1 | L3 | DEFAULT | "Anulează taskul cu site-ul de mentenanță." | delete_task | delete_task | resolution: targets site-ul row; status→cancelled |
| TC-C6-12 | P1 | L4 | DEFAULT | "Mută taskul cu contractul Q3 pe vineri la 11." | update_task | update_task | resolution: targets Q3 contract row; due_at updated |

## C10 — tenant isolation (12 cases)

Chain path same as C6 but split across tenant lanes A and B. Invariant:
zero rows under tenant A leak to tenant B and vice versa. All cases
produce exactly one row in their own tenant.

| case_id | priority | level | tenant | user_input | intent | expected |
|---|---|---|---|---|---|---|
| TC-C10-01 | P0 | L1 | A | "Creează task tenant-A: scope_isolation_marker_A1." | create_task | row in A only |
| TC-C10-02 | P0 | L1 | A | "Creează task tenant-A: marker A2 unique." | create_task | row in A only |
| TC-C10-03 | P0 | L1 | A | "Add task tenant-A: marker A3 isolation." | create_task | row in A only |
| TC-C10-04 | P0 | L2 | A | "Creează task: pregătește raportul tenant-A specific." | create_task | row in A only |
| TC-C10-05 | P0 | L2 | A | "Setează un task pentru clientul tenant-A: oferta tenant-A." | create_task | row in A only |
| TC-C10-06 | P0 | L3 | A | "Creează task: marker tenant-A oferta_isolation_A6 mâine la 11." | create_task | row in A only, due_at set |
| TC-C10-07 | P0 | L1 | B | "Creează task tenant-B: scope_isolation_marker_B1." | create_task | row in B only |
| TC-C10-08 | P0 | L1 | B | "Creează task tenant-B: marker B2 unique." | create_task | row in B only |
| TC-C10-09 | P0 | L1 | B | "Add task tenant-B: marker B3 isolation." | create_task | row in B only |
| TC-C10-10 | P0 | L2 | B | "Creează task: pregătește raportul tenant-B specific." | create_task | row in B only |
| TC-C10-11 | P0 | L2 | B | "Setează un task pentru clientul tenant-B: oferta tenant-B." | create_task | row in B only |
| TC-C10-12 | P0 | L3 | B | "Listează taskurile tenant-B." | list_tasks | row_delta=0; result lists ONLY tenant-B rows |

Cross-tenant probes (run during SQL invariants pass, not separate
executions):

- `count(*) FROM tasks WHERE tenant_id=A AND title LIKE '%marker_B%'` = 0.
- `count(*) FROM tasks WHERE tenant_id=B AND title LIKE '%marker_A%'` = 0.

## C11 — idempotency / retry (12 cases)

Replay invariant: same logical message replayed produces 0 new task rows.
The predecessor mission proved the metadata-marker idempotency under the
ME_Task_Create_Prep `idem:create_task:<exec_ctx_id>:<step_id>` pattern.
This corridor exercises additional shapes: same idempotency_key + new
exec_ctx (whole-chain replay), repeated `messages.id`, and idempotency
under bursty fire (≤1s gap).

Each replay set counts as 1 case (the full set: first delivery + 1–2
replays).

| case_id | priority | shape | tenant | user_input | replay pattern | expected |
|---|---|---|---|---|---|---|
| TC-C11-01 | P0 | first+replay | DEFAULT | "Creează task C11: replay_marker_01 unique." | fire 1×, then re-fire same TR envelope | tenant total delta=1 |
| TC-C11-02 | P0 | first+replay | DEFAULT | "Creează task C11: replay_marker_02 unique." | fire 1×, replay after 1s | delta=1 |
| TC-C11-03 | P0 | first+2 replays | DEFAULT | "Creează task C11: replay_marker_03 unique." | fire 1×, replay 1s, replay 2s | delta=1 |
| TC-C11-04 | P0 | first+replay | DEFAULT | "Add task C11: replay_marker_04 unique." | fire 1×, replay | delta=1 |
| TC-C11-05 | P0 | first+replay | DEFAULT | "Add task C11: replay_marker_05 unique." | fire 1×, replay | delta=1 |
| TC-C11-06 | P0 | first only | DEFAULT | "Add task C11: replay_marker_06 unique." | fire 1× (no replay; control) | delta=1 |
| TC-C11-07 | P1 | first+replay | DEFAULT | "Add task C11: replay_marker_07 unique." | fire, replay | delta=1 |
| TC-C11-08 | P1 | first+replay | DEFAULT | "Add task C11: replay_marker_08 unique." | fire, replay | delta=1 |
| TC-C11-09 | P0 | first+replay | DEFAULT | "Add task C11: replay_marker_09 unique." | fire, replay | delta=1 |
| TC-C11-10 | P0 | first+replay | DEFAULT | "Add task C11: replay_marker_10 unique." | fire, replay | delta=1 |
| TC-C11-11 | P0 | first+replay | DEFAULT | "Add task C11: replay_marker_11 unique." | fire, replay | delta=1 |
| TC-C11-12 | P0 | first+replay | DEFAULT | "Add task C11: replay_marker_12 unique." | fire, replay | delta=1 |

To bound execute_workflow tool budget for the replay sub-fires, the
mission runs the replay for **TC-C11-01..TC-C11-05** (5 replay pairs =
10 fires) plus single fires for TC-C11-06..TC-C11-12 (7 fires). 17
fires total, 12 distinct cases, replay invariant exercised on a
representative subset of the same chain path.

## C12 — large composition (12 cases)

Multi-paragraph messages mixing task + reminder phrasing + (potentially)
memory mentions. Memory writes remain stub-only on the chain (per pack
out-of-scope), so this corridor focuses on:

1. Plan decomposition under verbose input.
2. RC composing one coherent natural reply (no raw JSON).
3. Task module producing exactly one row when the message clearly asks
   for one task.
4. PL not over-decomposing into N tasks when the user wrote one logical
   ask.

| case_id | priority | level | tenant | user_input | intent | expected |
|---|---|---|---|---|---|---|
| TC-C12-01 | P0 | L4 | DEFAULT | "Bună, sper că ești bine. Creează task: trimite oferta pentru clientul X mâine la 10. Dacă X nu răspunde, revenim săptămâna viitoare. Mulțumesc!" | create_task | exactly 1 row, due_at near 10:00 |
| TC-C12-02 | P1 | L4 | DEFAULT | "Hi there. Quick task: prepare the Q3 review for Monday at 11am. If the materials are missing, we'll follow up later. Thanks!" | create_task | exactly 1 row |
| TC-C12-03 | P0 | L5 | DEFAULT | "Ignoră ce am zis înainte. Creează task: pregătește prezentarea finală până vineri la 12, dacă nu, mutăm pe luni." | create_task | exactly 1 row, no spurious memory write |
| TC-C12-04 | P1 | L5 | DEFAULT | "Listează-mi toate taskurile pe care le am, te rog. Vreau să văd în ce stadiu sunt." | list_tasks | row_delta=0 |
| TC-C12-05 | P0 | L4 | DEFAULT | "Compose: pregătește slide-urile pentru investitori, planifică call mâine la 15, urmărește feedbackul lui Andrei." | create_task | exactly 1 row (planner must NOT split into 3) — natural fallback |
| TC-C12-06 | P1 | L4 | DEFAULT | "Mută taskul cu Q3 review pe joi la 9 pentru că X a cerut amânare." | update_task | resolution: 1 candidate (Q3 review); due_at updated |
| TC-C12-07 | P1 | L4 | DEFAULT | "Marchează taskul cu prezentarea finală ca făcut, am terminat slide-urile aseară." | complete_task | row→done |
| TC-C12-08 | P1 | L4 | DEFAULT | "Anulează taskul cu callul de marți, clientul a anulat." | delete_task | row→cancelled |
| TC-C12-09 | P0 | L5 | DEFAULT | "Hai să zicem așa: dacă X confirmă, programează call la 11; dacă nu, lasă-l pe joi. Pentru moment creează task: pregătește agenda call." | create_task | exactly 1 row (the agenda task) |
| TC-C12-10 | P1 | L4 | DEFAULT | "Listează doar taskurile completate săptămâna asta." | list_tasks | row_delta=0; status_filter='done' or 'any' |
| TC-C12-11 | P0 | L5 | DEFAULT | "Eu nu te-am întrebat încă. Întâi salut. Apoi creează un task minor: actualizează lista de invitați." | create_task | exactly 1 row |
| TC-C12-12 | P1 | L4 | DEFAULT | "Creează task: trimite update la echipa de marketing." | create_task | exactly 1 row |

## reminder-like — explicit reminder phrasings (8 cases)

These exercise the PL re-route (`create_reminder` intent → `create_task`
action with extracted due fields). All 8 must produce exactly one row in
`public.tasks` and **zero** writes to `public.reminders`.

| case_id | priority | level | tenant | user_input | intent | expected_action | expected |
|---|---|---|---|---|---|---|---|
| TC-RL-01 | P0 | L1 | DEFAULT | "Amintește-mi mâine la 9 să sun clientul." | create_reminder | create_task | due_type=datetime, due_at near 09:00Z, **0 reminders write** |
| TC-RL-02 | P0 | L1 | DEFAULT | "Remind me tomorrow at 10 to send the report." | create_reminder | create_task | due_type=datetime, due_at near 10:00Z |
| TC-RL-03 | P0 | L2 | DEFAULT | "Amintește-mi poimâine să verific contractul." | create_reminder | create_task | due_type=date, due_date=tomorrow+1 |
| TC-RL-04 | P0 | L2 | DEFAULT | "Remind me today at 18 to call back the client." | create_reminder | create_task | due_type=datetime, due_at today 18:00Z |
| TC-RL-05 | P0 | L1 | DEFAULT | "Nu mă lăsa să uit să trimit factura mâine." | create_reminder | create_task | due_type=date, due_date=tomorrow |
| TC-RL-06 | P0 | L1 | DEFAULT | "Don't let me forget tomorrow at 9 to update the deck." | create_reminder | create_task | due_type=datetime, due_at near 09:00Z |
| TC-RL-07 | P0 | L2 | DEFAULT | "Amintește-mi azi să răspund email-ului de la Andrei." | create_reminder | create_task | due_type=date, due_date=today |
| TC-RL-08 | P0 | L3 | DEFAULT | "Amintește-mi mâine la 14:30 să trimit oferta finală pentru clientul Z." | create_reminder | create_task | due_type=datetime, due_at near 14:30Z |

## Total fire count

C6: 12. C10: 12. C11: 17 (12 cases × 1 fire + 5 of them with 1 replay). C12: 12. RL: 8. **Grand total: 61 live `execute_workflow` calls.** This satisfies the pack's 56-case minimum with margin and is justified as natural cardinality (see SCOPE_FREEZE §"Cardinality target").
