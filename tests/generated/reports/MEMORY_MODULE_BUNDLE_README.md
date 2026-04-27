# Memory Module — Execution Bundle (2026-04-20)

Acest bundle completează `MEMORY_MODULE_PLANNING_CONTEXT_MANIFEST_v1_1.md` cu
materialul tehnic de execuție cerut de chat-ul de design + implementare.

## Ce e în bundle (căi reale)

### 1. Script de patch ME (template de ship ME-specific)

- `tests/generated/workflows/snapshots/_patch_me_build_ra_envelope_phase12.mjs`
  (deja în repo, nu trebuie generat) — single-node PUT peste
  `ME_Build_RA_Envelope`, cu snapshot pre/put, deactivate → PUT → activate,
  verificare markers post-PUT (`v1.1 (B11-RA`, `status_kind === 'error'`,
  `result_type: 'module_batch'`, `failedResult`).

### 2. DDL real (reconstruit din live catalog)

- **`db/ddl_current_20260420.sql`** (NOU, în acest bundle) — conține CREATE
  TABLE + indecși + constraints + enums pentru toate tabelele relevante
  pentru memory_module, reconstruit din `information_schema` + `pg_indexes`
  + `pg_constraint`. Este **substitut** pentru folderul `migrations/` aflat
  în afara PRODUCT_ROOT (inaccesibil din această sesiune).

### 3. Schema actuală — findings critice

**DISCREPANȚĂ MAJORĂ** față de `db/README.md` și `Architecture_Spec_v3`:

| Ce spune spec-ul                              | Ce există în DB live               |
|-----------------------------------------------|-------------------------------------|
| `memory_items` (pgvector, minimal)           | **NU EXISTĂ**                       |
| `memory_items` target (memory_type, category, confidence, importance, durability, source_message_id, source_thread_id, entity_id, evidence_refs, status, supersedes_memory_id) | — |
| —                                             | **`rag_memories`** (tabel REAL, cu schema total diferită) |
| `messages.llm_safe_content` / `rag_safe_content` | nu există — doar `normalized_content` |
| `threads.source_context` / `source_context_resolved` | nu există |

**Ce există concret în `rag_memories`** (vezi SQL):

- `content` (text) + `embedding` (vector, pgvector 0.8.2)
- `memory_category` enum (`business_profile`, `customer_market`,
  `growth_context`, `entrepreneur_profile`, `relationship_history`,
  `operational_patterns`, `preferences`, `constraints`)
- `memory_kind` enum (`fact`, `insight`, `advice`)
- `durability` enum (`stable`, `seasonal`, `volatile`)
- `stage` enum (`setup`, `validation`, `early_growth`, `stabilization`, `scale`)
- `entity_type` enum + `entity_ref` text (soft ref, NU FK)
- `source_type` enum (`conversation`, `structured_event`, `manual_note`,
  `external_web`, `system_derived`, `brain_main_inbound_mvp`) + `source_ref` text
- `confidence` / `importance_score` numeric cu CHECK 0..1
- `valid_until` (TTL-like), `last_reconfirmed_at`
- `business_id` (FK businesses) + `business_type` text
- `metadata` jsonb

**Ce NU are `rag_memories`** (față de spec):

- NU are `thread_id` / `source_thread_id` / `source_message_id` — memoria
  nu e thread-aware la nivel de schemă
- NU are `status` / `supersedes_memory_id` — NU există supersede nativ
- NU are `evidence_refs[]` separat (există doar `source_ref`)

**Index vector**: `idx_rag_memories_embedding_ivfflat USING ivfflat
(embedding vector_cosine_ops) WITH (lists=100)` — deci recall e pe
distanță cosinus.

**Implicație pentru design doc memory_module**:
Chat-ul TREBUIE să aleagă explicit una dintre:
- (A) extinde `rag_memories` în loc cu coloanele lipsă pentru a-l aduce la
  modelul spec-ului (adaugă `thread_id`, `source_message_id`, `status`,
  `supersedes_memory_id`, `evidence_refs[]`), schimbă enum-urile dacă nu
  se potrivesc cu `memory_type` din Module_Spec_Memory;
- (B) lasă `rag_memories` curat pentru RAG business-context și creează un
  `memory_items` nou pentru memoria thread-aware cerută de Module_Spec_Memory;
- (C) reconciliază Module_Spec_Memory cu realitatea (adaptează contractul
  `action` la categoriile reale din `rag_memories`).
Recomandare: (B) e cea mai conservatoare (fără risc pe RAG-ul existent),
(A) e cea mai curată pe termen lung, (C) e pasul 0 obligatoriu pentru
oricare dintre ele.

### 4. Export live workflow-uri

Copiate la `tests/generated/workflows/wf_snapshots_current_20260420/`:

- `WF-ME-01_live_20260420.json` (139 636 B) — starea live WF-ME-01 după
  Phase-12 (v1.1 B11-RA envelope)
- `WF-PL-01_live_20260420.json` (62 890 B) — starea live WF-PL-01 după
  Phase-12.3 (v1.3 B11-PL-FIELD-ALIGN, returnează `query` /
  `feedback_content`)

Astea reduc driftul: chat-ul patch-uiește peste exact ce e live, nu peste
descriere.

### 5. Folderul de migrații real

`db/migrations/` conține doar un README care spune că migrațiile reale
sunt în folderul părinte `migrations/`, în afara PRODUCT_ROOT.
**Verificat cu `ls /sessions/amazing-festive-maxwell/mnt/`: nu există
folder `migrations/` acolo** — deci nu e accesibil din această sesiune.

**Substitut**: `db/ddl_current_20260420.sql` (item #2). Dacă chat-ul are
nevoie de istoricul migrațiilor, user-ul trebuie să-l exporte separat din
infra-ul părinte.

## Decizie de scope (user-confirmed, 2026-04-20 — REVISED)

**Scope livrare**: **TOATE 5 acțiunile canonice** din Module_Spec_Memory:
`store_memory`, `search_memory`, `recall_memory`, `promote_memory`,
`supersede_memory`. Zero no-op-uri rămase în handlere.

**Strategie DB**: **separare — tabel `memory_items` NOU, deasupra
`rag_memories`**. `rag_memories` rămâne neatins (concern separat:
business-context RAG). `memory_items` e creat de la zero ca tabel
thread-aware, conform Module_Spec_Memory + Memory_Model_Spec.

### Migrație unică (vezi `db/ddl_current_20260420.sql` secțiunea "PROPOSED")

- **ENUMs noi**: `memory_type_enum` (fact/observation/pattern/inference/preference/constraint),
  `memory_tier_enum` (recent/long_term), `memory_status_enum` (active/superseded/expired/archived).
- **Reutilizează** `rag_durability_enum` (stable/seasonal/volatile).
- **CREATE TABLE `memory_items`** cu:
  - Required (Memory_Model_Spec §6): `id`, `tenant_id`, `memory_type`,
    `category`, `content`, `confidence`, `importance`, `durability`,
    `source_message_id` (FK messages), `source_thread_id` (FK threads),
    `created_at`, `updated_at`.
  - Optional (spec §6): `entity_id` (FK entities), `evidence_refs`
    (jsonb), `status`, `supersedes_memory_id` (self-FK).
  - Pentru operare: `embedding` (vector, pgvector), `tier` default
    `recent`, `idempotency_key` (unique), `metadata` (jsonb).
  - **Pentru promotion enforcement**: `corroboration_count` int ≥1,
    `user_confirmed` bool, `evidence_validated` bool.
  - Ivfflat cosine index pe `embedding`; btree pe tenant+tier,
    tenant+type, tenant+status, tenant+thread, tenant+entity,
    tenant+category, supersedes_memory_id (partial).
- **Zero modificări pe `rag_memories`, `messages`, `threads`**.
  (Gap-urile `llm_safe_content` / `source_context` rămân în Schema Gap
  Register pentru altă fază.)

### Cele 3 decizii pe care chat-ul le adoptă (recomandate de bundle)

1. **Working memory NU intră în `memory_items`.**
   Memory_Model_Spec §2.1 e explicit: "Working memory lives inside the
   Execution Context object". Concret: `memory_items.tier` are doar 2
   valori, `recent` și `long_term`. Transient state stă în
   `execution_contexts.working_notes` / `module_results` — deja
   existent. `store_memory` scrie implicit la `tier='recent'`.

2. **Promotion v1 — rule enforcement explicit pe input.**
   `promote_memory` acceptă `recent → long_term` DACĂ cel puțin UNA
   dintre următoarele e îndeplinită:
   - `corroboration_count >= 2` pe rândul existent (repeated observation),
   - `user_confirmed = true` setat acum pe rând (explicit user),
   - `evidence_validated = true` setat acum pe rând (operational evidence).
   Altfel handlerul returnează `status_kind: 'partial'` +
   `promotion_decision: { accepted: false, reason: '...' }` per
   Module_Spec_Memory §Error Handling.
   Auto-counting al corroborărilor (via pgvector similarity sau
   matching pe `category + entity_id`) rămâne **v2**. Caller-ul (PL →
   DI → ME) furnizează explicit evidence_refs pentru v1.

3. **Inference safety (§4 subjective vs operational framing) — v1 minimal.**
   Chat-ul implementează un **filtru heuristic minimal** în `store_memory`:
   dacă `memory_type='observation'` sau `'pattern'` și `content` conține
   cuvinte clar subiective (ex. regex pe `neseriosa?`, `leneș(ă|i)?`,
   `prost(i|uț)?`, `nesimțit`), handlerul întoarce `status_kind:'failed'`
   cu motiv `SUBJECTIVE_JUDGMENT_FORBIDDEN`. Lista finală de cuvinte o
   decide chat-ul; design doc-ul marchează clar că un clasificator ML
   real e v2.

### Implementare ME (5 handlere)

- **`ME_Memory_Store_Result`** (înlocuiește plan-describer-ul curent): primește
  `inputs.content`, `inputs.memory_type`, `inputs.category`, optional
  `inputs.thread_id` / `inputs.source_message_id` / `inputs.entity_id`
  / `inputs.importance` / `inputs.durability` / `inputs.confidence`;
  aplică filtru inference safety; generează embedding; INSERT în
  `memory_items` cu `tier='recent'`, `status='active'`,
  `idempotency_key = execution_context_id + ':' + step_id`; duplicate
  pe idempotency_key întorc memory_id existent; returnează
  `module_result.data.memory_id` + `memory_summary`.
- **`ME_Memory_Search_Result`** (înlocuiește plan-describer-ul curent): primește
  `inputs.query` (garantat prezent după Phase-12.3 B11-PL-FIELD-ALIGN),
  optional `inputs.limit` / `inputs.thread_id` / `inputs.memory_type` /
  `inputs.tier`; generează embedding pentru query; rulează
  `SELECT id, content, memory_type, (embedding <=> $q) AS distance
   FROM memory_items WHERE tenant_id=$1 AND status='active'
   [AND source_thread_id=$t] [AND memory_type=$mt] [AND tier=$tr]
   ORDER BY embedding <=> $q LIMIT $k`; returnează
  `module_result.data.recall_results[]` cu
  `{ memory_id, content, similarity, memory_type, tier, created_at }`.
- **`ME_Memory_Recall_Result`** (NOU): primește `inputs.entity_id` sau
  `inputs.thread_id` sau `inputs.category` sau `inputs.memory_type` (≥1
  required); rulează SELECT filtrat (fără embedding); returnează
  `module_result.data.recall_results[]` cu aceeași formă ca
  search_memory, dar ordonat `ORDER BY created_at DESC` și fără
  `similarity`.
- **`ME_Memory_Promote_Result`** (NOU): primește `inputs.memory_id`,
  `inputs.promotion_target` (`recent` sau `long_term`), optional
  `inputs.evidence_refs[]`, `inputs.user_confirmed`,
  `inputs.evidence_validated`; aplică regulile de la decizia #2;
  dacă acceptat, `UPDATE memory_items SET tier='long_term',
  corroboration_count = corroboration_count + COALESCE(array_length(new_evidence, 1), 0),
  evidence_refs = evidence_refs || new_evidence, last_reconfirmed_at=now()`;
  returnează `module_result.data.promotion_decision: { accepted, reason,
  new_tier, corroboration_count_after }`. Promotion denied =
  `status_kind:'partial'`.
- **`ME_Memory_Supersede_Result`** (NOU): primește
  `inputs.supersedes_memory_id` (ID-ul celui vechi) + toate câmpurile
  necesare de store (content nou, memory_type, etc.); într-o tranzacție:
  `UPDATE memory_items SET status='superseded', updated_at=now()
   WHERE id=$old AND tenant_id=$t`, apoi INSERT la fel ca store dar cu
  `supersedes_memory_id=$old`; dacă old nu există sau e deja
  `superseded`, returnează `status_kind:'failed'` cu motiv
  `SUPERSEDE_TARGET_INVALID`. Returnează
  `module_result.data.memory_id` (al celui nou) + `superseded_id`
  (al celui vechi).

### Testare (walker cu 5+2 cazuri)

Walker analog cu `_walk_phase12_3_chains.mjs`, cazuri:

1. **store_memory** happy path → memory_id returnat, rând vizibil în DB.
2. **search_memory** pe același query → `recall_results[0].memory_id`
   = memory_id-ul de la store. Asertează `similarity < threshold`.
3. **recall_memory** pe `entity_id` / `category` → returnează rândul
   creat fără embedding.
4. **promote_memory** happy path (evidence ≥2 sau user_confirmed) →
   `promotion_decision.accepted=true`, `tier='long_term'` în DB.
5. **promote_memory denied** (evidence=0, fără user_confirmed) →
   `status_kind:'partial'`, tier rămâne `recent`.
6. **supersede_memory** happy path → old `status='superseded'`, new
   `supersedes_memory_id=old.id`, new `status='active'`.
7. **store_memory refused** (content subiectiv, memory_type='pattern')
   → `status_kind:'failed'`, motiv `SUBJECTIVE_JUDGMENT_FORBIDDEN`.

Toate 7 cazurile sunt asertate și prin `aggregated_result.status`
(`success` pentru 1-2-3-4-6, `partial` pentru 5, `failed` pentru 7) și
prin starea în DB.

## Cum să-l dai chat-ului de design

1. Adaugă la lista din MANIFEST v1.1 următoarele fișiere NOI:
   - `db/ddl_current_20260420.sql`
   - `tests/generated/reports/MEMORY_MODULE_BUNDLE_README.md` (acest fișier)
   - `tests/generated/workflows/wf_snapshots_current_20260420/WF-ME-01_live_20260420.json`
   - `tests/generated/workflows/wf_snapshots_current_20260420/WF-PL-01_live_20260420.json`
2. Spune-i explicit scope-ul ales (a sau b).
3. Cere-i să citească întâi findings-urile de divergență (secțiunea 3 de
   aici) înainte să scrie design doc-ul — altfel va presupune că
   `memory_items` există.
