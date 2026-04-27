# Memory Module — Planning Chat Context Manifest (v1.1)

Scop: predă acest manifest (+ fișierele enumerate) unui chat nou care va
proiecta ȘI implementa `memory_module`. Ordinea de încărcare merge de la
autoritate maximă (decide aici pe egalități) la artefacte operaționale.

Schimbări față de v1.0:
- Toate pattern-urile tip `{9,10,11,...}` și `WF-*_pre/put.json` au fost
  înlocuite cu liste concrete de fișiere.
- `brain_contract.json` este marcat explicit ca **referențiat în CLAUDE.md
  dar absent din repo** (nu mai apare în "What NOT to send" ca și cum ar
  exista).
- S-a adăugat o notă de arhivă: folderul `me_handlers_current/` a fost
  creat la 2026-04-20; dacă lucrezi dintr-o arhivă veche, trebuie
  re-exportată de la `/sessions/amazing-festive-maxwell/mnt/Ucenicul/`.

Scope confirmat de user (2026-04-20):
- Chat-ul produce atât design doc **cât și** implementare (patch-uri n8n +
  migrații DB + teste), în stilul expansiunii ME din Phase-11.
- Din istoric e nevoie doar de **sumarul final de stare** (nu per-fază
  Phase-9 → 12.3).
- Realitățile DB și privacy sunt în scop (tiering, promovare, pgvector,
  `normalized_content` → `llm_safe_content`, `source_context` pe thread).
- Codul ME actual (plan-describer memory) și template-ul de patch n8n
  sunt în scop (chat-ul trebuie să știe ce înlocuiește și cum expediază).

---

## TIER 0 — Autoritate (citire obligatorie, în ordine)

Per `CLAUDE.md` §Authority Hierarchy:

1. `CLAUDE.md` — instrucțiuni Level-3 + pointers de autoritate.
   Critic: PostgreSQL Query Policy, brain_contract.json scope,
   source-of-truth table. (59 linii)
2. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` — Level-1
   canonical. Secțiunile relevante pentru memory (nu încărca tot
   documentul de 907 linii dacă nu e necesar):
   - §F.9 Memory Item (field contract — ~linia 213)
   - §M Memory Model (working / recent / long-term — ~linia 365)
   - §V Privacy Contracts (~linia 583)
   - §X Schema Gap Register (~linia 659) — spune exact ce e
     implementat vs target pentru `memory_items`
   - §Y.4 Thread vs Execution Context vs Memory vs Operational DB
     Boundary Map (~linia 760)
   - §Y.9 Privacy Boundary Diagram (~linia 867)
3. `docs/migration/Migration_Plan_Ucenicul.md` — autoritate Level-1
   pentru migrații (pentru orice schimbare de schemă pe care
   memory_module o cere).

## TIER 1 — Specuri canonice memory

4. `docs/architecture/Memory_Model_Spec.md` — tiering, promovare, decay,
   supersede. (124 linii)
5. `docs/architecture/Module_Spec_Memory.md` — contract input/output
   pentru `memory_module` (enum de action, câmpuri obligatorii per
   action: `store_memory`, `recall_memory`, `search_memory`,
   `promote_memory`, `supersede_memory`). Autoritativ pentru validare.
   (89 linii)
6. `docs/architecture/Module_Registry_Ucenicul.md` — entry-ul
   `memory_module` (inputs_expected, outputs_produced, can_read_from,
   can_write_to, activation_rules, privacy_profile,
   idempotency_requirements). (187 linii, focus pe blocul
   memory_module ~linia 77)

## TIER 2 — Realitate DB (curentă) + schema gap

7. `db/README.md` — **CRITIC**. Documentează `memory_items` așa cum e
   acum implementat (pgvector-enabled dar minimal) ȘI delta-ul față de
   schema-țintă (`memory_type`, `category`, `confidence`, `importance`,
   `durability`, `source_message_id`, `source_thread_id`, `entity_id`,
   `evidence_refs`, `status`, `supersedes_memory_id` — toate marcate
   `NOT YET IMPLEMENTED`). Implementarea memory_module trebuie să
   decidă ce delta de schemă livrează întâi. (238 linii)
8. `db/schema/README.md` — pointer source-of-truth pentru schema
   implementată. (49 linii)

## TIER 3 — Specuri cross-cutting

9. `docs/architecture/Thread_Resolution_Spec.md` — cum se rezolvă
   `thread_id` și cum se populează `source_context` pentru un memory
   item (memory items sunt thread-aware).
10. `docs/architecture/n8n_Workflow_Mapping.md` — §5 PostgreSQL Query
    Policy (reguli parameterized vs inline interpolation — scrierile
    memory TREBUIE să se conformeze) + tabelul de acronime WF
    (memory_module e un sub-workflow dispecerizat de `WF-ME-01`).
    (196 linii)

## TIER 4 — Stare curentă (un singur fișier)

11. `tests/generated/reports/FINAL_TEST_AND_E2E_SUMMARY.md` — zero
    blockers; documentează lanțul TR→MO ca fiind verde pe cele patru
    intenții canonice (inclusiv `search_memory`); listează toate
    căile de artefacte. Chat-ul NU are nevoie de record-urile
    Phase-9→12.3. (375 linii)

## TIER 5 — Codul ME de bază (plan-describer, de înlocuit)

Handlerele memory ale ME returnează în prezent `status:"success"` fără a
atinge DB-ul — sunt placeholder-uri plan-describer din Phase-11.
Memory_module înlocuiește aceste implementări cu unele reale (upsert
pgvector, RAG recall, promovare). Chat-ul trebuie să știe contractul pe
care acestea îl respectă deja (`status_kind`, forma `module_result`,
câmpurile `tenant`/`thread`/`execution_context`).

> **Notă de arhivare**: folderul `tests/generated/workflows/me_handlers_current/`
> a fost creat la 2026-04-20 20:40. Dacă lucrezi dintr-o arhivă/dump
> generat(ă) înainte de această dată, folderul lipsește — re-exportează
> de la `/sessions/amazing-festive-maxwell/mnt/Ucenicul/` sau de la
> rădăcina repo-ului.

12. `tests/generated/workflows/me_handlers_current/ME_Validate_Dispatcher_Result.js`
    — cum extrage ME `step`, `execution_context_id`, `thread_id`,
    `tenant_id`, `module_name` pentru handler. Handlerele memory citesc
    din `$('ME_Validate_Dispatcher_Result').first().json` — acesta e
    contractul upstream. (3230 B)
13. `tests/generated/workflows/me_handlers_current/ME_Memory_Search_Result.js`
    — baseline pentru `action: search_memory`. În prezent validează
    `inputs.query`; returnează `recall_results[]` gol. De înlocuit cu
    căutare pgvector reală. (1262 B)
14. `tests/generated/workflows/me_handlers_current/ME_Memory_Store_Result.js`
    — baseline pentru `action: store_memory`. De înlocuit cu insert +
    embedding real. (1575 B)
15. `tests/generated/workflows/me_handlers_current/ME_Build_RA_Envelope.js`
    — cum împachetează ME output-ul handler-ului în `module_batch`
    (happy path) sau `module_batch` failed (error path, B11-RA v1.1).
    Output-ul handler-ului memory trebuie să încapă în acest envelope
    neschimbat. (2715 B)

## TIER 6 — Template-uri de implementare (cum expediezi)

16. `docs/architecture/ME_Module_Expansion_Plan.md` — design doc Phase-11
    (Level-2 subordinate canonical). Șablon excelent pentru design-ul
    memory_module: goals, scope, routing map, tabel I/O per-handler,
    plan de implementare pe pași, rollback. (375 linii)
17. `tests/generated/workflows/snapshots/_patch_pl_field_align_phase12_3.mjs`
    — cel mai recent template de patch-via-PUT n8n. Arată procedura
    canonică de ship: load env, GET, snapshot pre, deactivate → PUT
    (cu `SETTINGS_WHITELIST`) → activate, verificare markers post-PUT.
18. `tests/generated/workflows/snapshots/_patch_me_build_ra_envelope_phase12.mjs`
    — exemplu de patch ME-specific (același template, targetând un
    node din WF-ME-01). Util dacă handlerele memory au nevoie de o
    modificare jsCode in-place.

## Opțional / nice-to-have

- `db/queries/README.md` + `db/migrations/README.md` — în prezent stub-uri;
  dacă devin non-goale, documentează cum sunt livrate migrațiile.
- `tests/generated/workflows/_walk_phase12_3_chains.mjs` — pattern-ul
  walker (descoperire sub-execuție prin proximitate de timestamp +
  aserțiuni pe `aggregated_result`). Șablon pentru testul de lanț pe
  care memory_module va trebui să-l aibă (prove `status:"success"` pe
  hit-uri reale DB pentru round-trip `store_memory` → `search_memory`).

---

## What NOT to send (liste concrete, nu pattern-uri)

**Record-uri per-fază** (sunt la `tests/generated/edges/`; NU le trimite
— scope-ul confirmat de user e "doar sumarul final"):

- `PHASE_5_EDGE_RUN_RECORD.md`
- `PHASE_6_CHAIN_SMOKE_RECORD.md`
- `PHASE_7_FINAL_SUMMARY.md`
- `PHASE_8_EDGE_1_4_ACTIVATION_RECORD.md`
- `PHASE_9_FULL_PRIMARY_CHAIN_RECORD.md`
- `PHASE_10_OR_PATCH_RECORD.md`
- `PHASE_10_RERUN_RECORD.md`
- `PHASE_11_ME_EXPANSION_RECORD.md`
- `PHASE_12_B11_FIXES_RECORD.md`
- `PHASE_12_3_FIELD_ALIGN_RECORD.md`
  *Excepție*: trimite `PHASE_12_3_FIELD_ALIGN_RECORD.md` numai dacă
  noul chat cere un exemplu concret de diagnose→fix.

**Snapshot-uri mari de workflow** (sunt la
`tests/generated/workflows/snapshots/`; notație corectă:
`WF-<WF>_phase<N>_{pre,put}.json` — perechi `_pre.json`/`_put.json`, nu
un subfolder `_pre/` cu `put.json` înăuntru; fișierele concrete
relevante pentru memory sunt):

- `WF-ME-01_phase5_pre.json` / `WF-ME-01_phase5_put.json`
- `WF-ME-01_phase11_pre.json` / `WF-ME-01_phase11_put.json`
- `WF-ME-01_phase11b_pre.json` / `WF-ME-01_phase11b_put.json`
- `WF-ME-01_phase12_pre.json` / `WF-ME-01_phase12_put.json`
- `WF-PL-01_phase8_pre.json` / `WF-PL-01_phase8_put.json`
- `WF-PL-01_phase11_pre.json` / `WF-PL-01_phase11_put.json`
- `WF-PL-01_phase12_pre.json` / `WF-PL-01_phase12_put.json`
- `WF-PL-01_phase12_3_pre.json` / `WF-PL-01_phase12_3_put.json`
  Motiv: sunt JSON-uri workflow-ENTITY, nu human-readable; chat-ul
  trebuie să citească JS-urile de node individuale din folderul
  `me_handlers_current/` (TIER 5).

**`brain_contract.json`** — referențiat în `CLAUDE.md` §Source of Truth
Boundaries ȘI dedicată o secțiune întreagă ("brain_contract.json
Scope"), dar **fișierul nu există în repo** (verificat cu `find`,
zero rezultate la 2026-04-20). E o discrepanță între CLAUDE.md și
starea reală a repo-ului, pe care o poți semnala noului chat, dar nu
e ceva ce să încerci să trimiți. Oricum ar fi out-of-scope pentru
memory_module (per CLAUDE.md: "scoped to brain layer only").

---

## Prompt de încărcare (paste în noul chat, alături de manifest)

> Tu vei proiecta și implementa `memory_module` pentru Ucenicul. Citește
> fișierele în ordinea TIER 0 → TIER 6 din acest manifest. Produ un
> design doc în stilul `docs/architecture/ME_Module_Expansion_Plan.md`
> (Phase-11) urmat de patch-uri n8n + migrații DB + teste. Autoritate
> supremă: `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.
> Verificarea ship-ului: walker similar cu
> `tests/generated/workflows/_walk_phase12_3_chains.mjs`, asertând
> `aggregated_result.status === "success"` pe round-trip
> `store_memory` → `search_memory` pe o fixture proaspătă.
> Dacă `brain_contract.json` e cerut de CLAUDE.md dar absent în repo,
> semnalează și tratează ca out-of-scope.
