# REMAINING CORRIDORS PHASE 1 · Case Matrix

> 56 total fires (55 unique + 1 explicit replay). Run-tag `rcp1-2026-04-25`.
> Distribution: C1=5, C2=8+1replay=9, C3=7, C4=3, C5=5, C7=7, C8=6, C9=7,
> REG=7 (REG-08 is SQL-only). Source-of-truth file:
> `artifacts/build_rcp1_fixtures.mjs`.

## C1 — Response-only / simple Q&A (5)

| case_id | tenant | intent | user_input |
|---|---|---|---|
| RC-C1-01 | DEFAULT | briefing | "Bună, cum funcționează agentul în general?" |
| RC-C1-02 | DEFAULT | briefing | "Hi, can you summarize what you can do?" |
| RC-C1-03 | DEFAULT | briefing | "Care e capitala Franței?" |
| RC-C1-04 | DEFAULT | briefing | "Cât e 2+2?" |
| RC-C1-05 | DEFAULT | briefing | "What is the difference between a task and a reminder for you?" |

Expected per case: chain reaches MO; **no domain row** in `tasks` /
`memory_items` / `improvement_requests` / `reminders`; natural Romanian
or English answer; no raw JSON.

## C2 — Memory write (8 + 1 replay = 9)

| case_id | tenant | intent | user_input |
|---|---|---|---|
| RC-C2-01 | DEFAULT | store_memory | "Ține minte că prefer întâlnirile online via Google Meet, nu Zoom." |
| RC-C2-02 | DEFAULT | store_memory | "Notează că Andrei este partenerul nostru tehnic principal." |
| RC-C2-03 | DEFAULT | store_memory | "Remember that our quarterly review meeting is on Mondays at 9am." |
| RC-C2-04 | DEFAULT | store_memory | "Salvează că biroul meu preferat pentru clienți VIP este sala 3." |
| RC-C2-05 | DEFAULT | store_memory | "Memorează că deadline-ul fiscal pentru declarații este 25 ale lunii." |
| RC-C2-06 | A       | store_memory | "Ține minte că tenant-A folosește exclusiv RON ca monedă oficială." |
| RC-C2-07 | B       | store_memory | "Ține minte că tenant-B funcționează în EUR și are sediul în Cluj." |
| RC-C2-08 | DEFAULT | store_memory | "Note that the legal contact email is legal@ucenicul.test." |
| RC-C2-01-replay | DEFAULT | store_memory | (re-fire of RC-C2-01 envelope; idempotency probe) |

Expected: 8 new `memory_items` rows (5 default + 1 A + 1 B + 1 default with EN content);
replay produces 0 additional rows; cross-tenant memory invariant holds.

## C3 — Memory recall / search (7)

Pre-seeded recall fixtures:

| seed_id | tenant | content |
|---|---|---|
| 99000001-0001-… | DEFAULT | "Culoarea preferată a echipei pentru branding este albastru navy (#1B2A4E)." |
| 99000001-0002-… | DEFAULT | "Orele standard de lucru ale echipei sunt 09:00-18:00 ora României." |
| 99000001-0003-… | DEFAULT | "Investor preference is quarterly written reports rather than monthly calls." |
| 99000002-0001-… | A       | "Tenant-A moneda oficială este RON conform configurației iniţiale." |

| case_id | tenant | intent | user_input | expected |
|---|---|---|---|---|
| RC-C3-01 | DEFAULT | search_memory | "Ce știi despre culoarea preferată a echipei?" | recall albastru navy seed |
| RC-C3-02 | DEFAULT | search_memory | "Caută în memorie pentru orele standard de lucru." | recall 09:00-18:00 seed |
| RC-C3-03 | DEFAULT | search_memory | "What do you know about our investor preference?" | recall investor seed |
| RC-C3-04 | A       | search_memory | "Ce știi despre moneda oficială tenant-A?" | recall RON seed (own tenant) |
| RC-C3-05 | B       | search_memory | "Ce știi despre culoarea preferată tenant-A?" | **must NOT recall** A's or default's memory |
| RC-C3-06 | DEFAULT | search_memory | "Ce știi despre xyz_marker_inexistent_qwerty?" | empty / friendly no-result reply |
| RC-C3-07 | DEFAULT | search_memory | "Tot ce știi despre programul nostru de revisit." | semantic miss; safe friendly reply |

Expected per case: read-only (zero `memory_items` row delta from search);
no cross-tenant leak; no hallucinated facts.

## C4 — Memory update / supersede (3 — DEFLECTION ONLY)

`supersede_memory` is **NOT** in `PL.PL_Build_Planner_Input.intentMap`.
PL deflects with `INSUFFICIENT_PLANNING_CONTEXT`. Cases here probe the
deflection — no DB mutation expected.

| case_id | tenant | intent | user_input | expected |
|---|---|---|---|---|
| RC-C4-01 | DEFAULT | supersede_memory | "Corectează: nu mai prefer Google Meet, prefer Microsoft Teams începând de azi." | PL deflects; **0 supersede** |
| RC-C4-02 | DEFAULT | supersede_memory | "Update memory: legal contact email is now legal-new@ucenicul.test." | PL deflects; **0 supersede** |
| RC-C4-03 | A       | supersede_memory | "Corectează: tenant-A folosește acum EUR, nu RON." | PL deflects; **0 supersede** |

Tracking item: `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`.

## C5 — No-memory social / filler (5)

| case_id | tenant | intent | user_input |
|---|---|---|---|
| RC-C5-01 | DEFAULT | briefing | "Mulțumesc, ești foarte util!" |
| RC-C5-02 | DEFAULT | briefing | "Bună dimineața!" |
| RC-C5-03 | DEFAULT | briefing | "Scuze, greșeala mea de mai devreme." |
| RC-C5-04 | DEFAULT | briefing | "Thanks, that was helpful!" |
| RC-C5-05 | DEFAULT | briefing | "OK, am înțeles." |

Expected: same as C1 — no domain writes; natural reply.

## C7 — Ambiguous request / clarification (7)

| case_id | tenant | intent | user_input | expected |
|---|---|---|---|---|
| RC-C7-01 | DEFAULT | create_task | "Fă chestia aia pentru mine." | task created with vague description (PL accepts anything; user-ready guard is at NLU layer above PL — out of scope here). Documented as best-effort behavior. |
| RC-C7-02 | DEFAULT | update_task | "Mută-l pe altă dată." | resolution returns NOT_FOUND or AMBIGUOUS — no DB mutation |
| RC-C7-03 | DEFAULT | complete_task | "Marchează ca făcut." | resolution returns NOT_FOUND or AMBIGUOUS — no DB mutation |
| RC-C7-04 | DEFAULT | delete_task | "Anulează-l." | resolution returns NOT_FOUND or AMBIGUOUS — no DB mutation |
| RC-C7-05 | DEFAULT | store_memory | "Ține minte asta." | empty content after strip → ME stores literal "asta" or PL handles gracefully (worst case: low-quality row stored — to verify) |
| RC-C7-06 | DEFAULT | save_suggestion | "Sugestie:" | ME_Improvement_Capture_Prep returns AMBIGUOUS_OR_EMPTY_FEEDBACK; **0 row** |
| RC-C7-07 | DEFAULT | create_reminder | "Amintește-mi." | task created with description "Amintește-mi" (best-effort fallback); flagged in closeout limitations |

## C8 — Thread continuity (6 across 2 thread clusters)

Cluster A (3 messages reuse the same thread):

| case_id | tenant | thread_alias | intent | user_input |
|---|---|---|---|---|
| RC-C8-01 | DEFAULT | C8-cluster-A | create_task | "Creează task: pregătește contractul cu clientul X mâine la 10." |
| RC-C8-02 | DEFAULT | C8-cluster-A | update_task | "Mută taskul cu contractul X pe poimâine la 11." |
| RC-C8-03 | DEFAULT | C8-cluster-A | list_tasks | "Listează taskurile mele deschise." |

Cluster B (independent thread):

| RC-C8-04 | DEFAULT | C8-cluster-B | create_task | "Creează task: pregătește prezentarea pentru investitori vineri." |
| RC-C8-05 | DEFAULT | C8-cluster-B | complete_task | "Marchează taskul cu prezentarea pentru investitori ca făcut." |
| RC-C8-06 | DEFAULT | C8-cluster-B | list_tasks | "Ce am rămas deschis acum?" |

Expected: cluster A's update/list see cluster A's task; cluster B's
complete/list see cluster B's task; the chain attaches each fire to the
correct thread (no thread mix-up).

## C9 — Cross-thread durable vs session (7)

| case_id | tenant | thread_alias | intent | user_input | expected |
|---|---|---|---|---|---|
| RC-C9-01 | DEFAULT | C9-store         | store_memory  | "Ține minte că our annual planning session is in November." | new memory row |
| RC-C9-02 | DEFAULT | C9-recall-1      | search_memory | "When is our annual planning session?" | recall (cross-thread within same tenant) |
| RC-C9-03 | DEFAULT | C9-recall-2      | search_memory | "Ce știi despre planificarea anuală?" | recall (cross-thread within same tenant) |
| RC-C9-04 | DEFAULT | C9-recall-3      | search_memory | "Caută în memorie planificarea sesiunii anuale." | recall |
| RC-C9-05 | A       | C9-cross-tenant-A | search_memory | "When is our annual planning session?" | **must NOT recall** default's memory |
| RC-C9-06 | B       | C9-cross-tenant-B | search_memory | "Ce știi despre planificarea anuală?" | **must NOT recall** default's memory |
| RC-C9-07 | DEFAULT | C9-session-only   | briefing      | "Apropo, miercuri am o ședință scurtă cu echipa." | no store; not durable; subsequent search must NOT recall |

## REG — Regression pack (7 + 1 SQL probe = 8)

| case_id | tenant | intent | user_input | regression class |
|---|---|---|---|---|
| RC-REG-01 | DEFAULT | create_task | "Creează task: regression smoke pentru chain post-improvement." | task_module create |
| RC-REG-02 | DEFAULT | create_reminder | "Remind me tomorrow at 17 to validate regression smoke." | reminder→task |
| RC-REG-03 | DEFAULT | save_suggestion | "Sugestie: rapoarte săptămânale automate sunt utile pentru manageri." | improvement capture |
| RC-REG-04 | DEFAULT | log_improvement_request | "Feature request: please add CSV export for improvement_requests." | log_improvement_request alias |
| RC-REG-05 | DEFAULT | store_memory | "Ține minte că adresa noastră de billing este billing@ucenicul.test." | memory store |
| RC-REG-06 | DEFAULT | search_memory | "Ce știi despre adresa noastră de billing?" | memory search read-only |
| RC-REG-07 | DEFAULT | list_tasks | "Listează taskurile mele deschise." | task list read-only |
| **RC-REG-08** | — | (no fire — SQL probe) | — | reminders unchanged invariant: `count(public.reminders) = 1`, `last_updated = 2026-04-13T20:17:13Z` |

## Total firing budget

55 unique cases + 1 replay (RC-C2-01-replay) = **56 fires** through
`mcp__f2e8be41-…__execute_workflow`. Plus per-corridor SQL invariant
batches (read-only).
