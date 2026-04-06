# TESTING RULES & ANTI-RABBIT-HOLE PROTOCOL
**Created:** 2026-04-02
**Purpose:** Reguli stricte pentru testarea brain_main_inbound_mvp

---

## REGULI DE EXECUȚIE

### R1: Un test = un singur input + un singur output așteptat
Nu combina teste. Nu testa 3 lucruri simultan. Dacă un test pică, știi exact ce a picat.

### R2: Faze stricte — nu sări
1. **Parser-only** (fără LLM) — testezi funcțiile JS izolat cu mock LLM output
2. **LLM mock** — testezi cu răspunsuri LLM pre-definite
3. **Integration** — testezi flow complet doar după ce Faza 1+2 trec

### R3: Maximum 3 încercări de fix per bug
- Încercare 1: fix direct
- Încercare 2: fix alternativ
- Încercare 3: STOP — documentează în TEST_RESULTS.md, treci mai departe
- Revii la bug-urile blocate doar după ce termini toate celelalte

### R4: Agent protocol
- Agent-ul de test RULEAZĂ teste, nu fixează cod
- Agent-ul de fix FIXEAZĂ cod, nu rulează teste
- Niciodată ambele simultan — previne loops

### R5: Tracking obligatoriu
După fiecare batch de teste:
- Scrie rezultatele în TEST_RESULTS.md
- Format: Test ID | Status | Detalii
- Nu rula batch-ul următor până nu ai scris rezultatele celui curent

### R6: Batch size maxim = 10 teste
Nu rula 50 teste odată. Rulează 10, scrie rezultatele, apoi următoarele 10.

### R7: Dacă > 5 teste pică din același motiv → STOP
E o problemă de arhitectură, nu de test case. Documentează root cause-ul, propune fix structural.

### R8: Nu modifica parser-ul ȘI testele în același pas
Modifici parser → rulezi testele vechi. Sau scrii teste noi → rulezi pe parser-ul vechi. Niciodată ambele simultan.

---

## STRUCTURA FIȘIERELOR DE TEST

```
testing/
├── TESTING_RULES.md          ← acest fișier
├── TEST_SUITE.md             ← toate cazurile de test (human readable)
├── TEST_RESULTS.md           ← tracking rezultate per run
├── fixtures/
│   └── test_context.json     ← fixture standard (tasks, reminders, memories)
├── test_parser.js            ← test harness Node.js
└── test_cases/
    ├── suite_a_list_tasks.json
    ├── suite_d_list_reminders.json
    ├── suite_e_create_tasks.json
    ├── suite_f_create_reminders.json
    ├── suite_g_task_vs_reminder.json
    ├── suite_h_duplicates.json
    ├── suite_i_semantic_actions.json
    ├── suite_j_memory.json
    ├── suite_k_improvement.json
    ├── suite_l_conversational.json
    └── suite_ec_edge_cases.json
```

---

## VARIAȚII DE SCRIERE — MATRICE OBLIGATORIE

Pentru orice cuvânt-cheie românesc, parser-ul TREBUIE să acopere:

### Reminder keywords:
| Canonical | Variații care TREBUIE acceptate |
|-----------|-------------------------------|
| amintește-mi | aminteste-mi, amintestemi, amintește mi, aminteste mi, reaminteste-mi, reamintește-mi |
| adu-mi aminte | adumi aminte, adu mi aminte, adumiaminte |
| nu uita să-mi amintești | nu uita sa-mi amintesti, nu uita sa mi amintesti, nu uita sami amintesti |
| reminder | remind, remindere |
| să nu uit | sa nu uit, sanuuit |

### Task keywords:
| Canonical | Variații |
|-----------|---------|
| trebuie să | trebuie sa, trb sa, trb să |
| pune-mi task | punemi task, pune mi task |
| creează task | creeaza task, creeaza-mi task, fa-mi task, fă-mi task, fami task |
| am de făcut | am de facut |

### Filter keywords:
| Canonical | Variații |
|-----------|---------|
| mâine | maine, miine (typo comun) |
| poimâine | poimaine |
| astăzi | azi, astazi |
| săptămâna asta | saptamana asta, saptamina asta |
| restante | restant, intarziate, întârziate |
| urgente | urgent, urgenta |
| prioritate mare | prioritate inalta |

### Weekday keywords:
| Canonical | Variații |
|-----------|---------|
| luni | Luni, LUNI |
| marți | marti, Marti |
| miercuri | Miercuri |
| joi | Joi |
| vineri | Vineri |
| sâmbătă | sambata, Sambata, simbata |
| duminică | duminica, Duminica |

### Action keywords:
| Canonical | Variații |
|-----------|---------|
| șterge | sterge, sterg |
| anulează | anuleaza |
| modifică | modifica |
| finalizează | finalizeaza |
| completează | completeaza, gata, am terminat |

---

## EXIT CONDITIONS

### Când oprești testarea:
1. Toate testele Faza 1 trec → treci la Faza 2
2. > 50% din teste pică → STOP, fix structural needed
3. Același bug apare > 5 ori → STOP, root cause analysis
4. > 10 tool calls fără progres → STOP, recapitulează

### Când consideri un test PASS:
- intent corect
- filter_scope corect (dacă e list)
- task_action/reminder_action structurally correct
- nu are câmpuri interzise

### Când consideri un test PARTIAL:
- intent corect dar un câmp minor greșit
- filter_scope default (all) când ar trebui specific

### Când consideri un test FAIL:
- intent greșit
- clarify când nu ar trebui
- câmpuri interzise prezente
- crash/eroare JS
