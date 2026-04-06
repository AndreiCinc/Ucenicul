# Memory Test Suite — RAG / Semantic Memory
**Created:** 2026-04-03
**Status:** ACCEPTANCE CRITERIA (Memory Write is NO-OP — these define target behavior)
**Source:** User-defined suite, audited against brain_contract.json + ARCHITECTURE_BLUEPRINT.md

---

## AUDIT RESULTS

### Discrepanțe găsite între suita ta și contract/arhitectură

| # | Problemă | Suita ta spune | Contractul/arhitectura spune | Decizie |
|---|----------|----------------|------------------------------|---------|
| 1 | **Categorii RAG** | `relationship_history`, `operational_history`, `preferences`, `constraints` | Doar 4 categorii fixe: `business_profile`, `customer_market`, `growth_context`, `entrepreneur_profile` | **TREBUIE EXTINS** — categoriile tale sunt valide business-wise dar lipsesc din contract. Propun extindere la 8 categorii. |
| 2 | **Tipuri memorie** | `fact`, `insight`, `advice` | Identic: `fact`, `insight`, `advice` | ✅ ALINIAT |
| 3 | **Durability** | Nu menționat | Arhitectura definește: `stable`, `seasonal`, `volatile` | **ADĂUGAT** — fiecare test primește durability expected |
| 4 | **Memory + task/reminder combo** | Teste M10.1-M10.3 | Contract permite `memory_writes` pe orice intent | ✅ ALINIAT |
| 5 | **Deduplicare (M3)** | Expects consolidare semantică | Parser nu face deduplicare — e job de Memory Write workflow (Memory Write node) | **REFRAMEAT** — testele de dedup sunt criterii pentru Memory Write node, nu pentru parser |
| 6 | **Conflict/recență (M4)** | Expects override semantic | Nu există mecanism în parser | **REFRAMEAT** — criterii pentru Memory Write node + retrieval logic |
| 7 | **Privacy (M9)** | PII nu stocată în RAG | PRIVACY_ROADMAP: Phase 2, NO-OP acum | **MARCAT** ca Phase 2 acceptance criteria |
| 8 | **Search grounding (M5, M6)** | Expects răspuns bazat pe memorii | Retrieval e în Faza 1 build (Load Context: top 5 memories) | ✅ ALINIAT — dar quality depinde de embedding + retrieval |

### Propunere: Extindere categorii RAG

Categoriile actuale (4) nu acoperă use-case-urile reale ale antreprenorului. Propun 8:

| Categorie | Ce capturează | Nou? |
|-----------|---------------|------|
| `business_profile` | Cum funcționează businessul structural | Existent |
| `customer_market` | Clienți, piață, competiție | Existent |
| `growth_context` | Stadiu, blocaje, priorități | Existent |
| `entrepreneur_profile` | Stil, comportament, pattern-uri de decizie | Existent |
| `relationship_history` | Interacțiuni cu persoane: ce s-a discutat, follow-up | **NOU** |
| `operational_history` | Fapte operaționale repetabile: furnizori, livrări, stocuri | **NOU** |
| `preferences` | Preferințe explicite ale userului | **NOU** |
| `constraints` | Constrângeri operaționale: ce nu merge, limite | **NOU** |

**Atenție:** Această extindere necesită update în `brain_contract.json` + `ARCHITECTURE_BLUEPRINT.md`. Confirmă înainte de implementare.

---

## TEST FORMAT

```
Test ID: MEM-XX
Suite: M1-M10
Preconditions: [memorii existente sau stare DB]
Input: [mesaj user]
Expected decision: [intent, memory_writes, alte câmpuri]
Expected RAG effect: [ce se scrie/actualizează în rag_memories]
Expected retrieval: [la ce query returnează această memorie]
Durability: stable | seasonal | volatile
Phase: 1 | 2
Status: pending
```

---

## Suite M1 — Ce trebuie salvat în memorie

### MEM-01: Fapt despre relație / follow-up
- **Input:** `am vorbit cu Ion și a zis să-l sun peste o lună`
- **Expected decision:** `intent = general_response`, `memory_writes.length >= 1`, `memory_writes[0].type = fact`, `memory_writes[0].category = relationship_history`
- **Expected RAG:** Memorie semantică: ai vorbit cu Ion, Ion a cerut follow-up peste o lună
- **Expected retrieval:** Query `ce știi despre Ion?` → returnează această memorie
- **Durability:** seasonal
- **Phase:** 1
- **Note:** Parser-ul permite `memory_writes` pe `general_response` (Phase 6 le curăță — **BUG POTENȚIAL**). Trebuie verificat: dacă intent=general_response, memory_writes se pierd?

### MEM-02: Fapt despre business
- **Input:** `businessul de curățenie e încă în setup și momentan avem doar 2 clienți activi`
- **Expected decision:** `intent = general_response`, `memory_writes` cu `type = fact`, `category = growth_context`
- **Expected RAG:** Stadiu: setup, 2 clienți activi, vertical cleaning
- **Durability:** seasonal
- **Phase:** 1

### MEM-03: Preferință operațională
- **Input:** `prefer să primesc reminderele dimineața dacă nu specific altceva`
- **Expected decision:** `memory_writes` cu `type = fact`, `category = preferences`
- **Durability:** stable
- **Phase:** 1

### MEM-04: Constrângere operațională
- **Input:** `Ana de la detergenți livrează greu vinerea`
- **Expected decision:** `memory_writes` cu `type = fact`, `category = constraints`
- **Durability:** seasonal
- **Phase:** 1

### MEM-05: Insight de business
- **Input:** `cred că pierdem clienți pentru că răspundem prea greu la cereri`
- **Expected decision:** `memory_writes` cu `type = insight`, `category = growth_context`
- **Durability:** seasonal
- **Phase:** 1

### MEM-06: Advice explicit
- **Input:** `ar trebui să verificăm stocul de detergenți în fiecare luni`
- **Expected decision:** `memory_writes` cu `type = advice`, `category = operational_history`
- **Durability:** stable
- **Phase:** 1

### MEM-07: Fapt despre client (ADĂUGAT — edge case)
- **Input:** `clientul de la Ap 3 preferă check-in după ora 15`
- **Expected decision:** `memory_writes` cu `type = fact`, `category = customer_market`
- **Durability:** stable
- **Phase:** 1

### MEM-08: Informație multi-layered (ADĂUGAT — edge case)
- **Input:** `m-am întâlnit cu furnizorul de la Metro și prețurile au crescut cu 15%, trebuie să regândim bugetul`
- **Expected decision:** `memory_writes.length >= 1` (fapt despre preț + posibil insight despre buget)
- **Expected RAG:** Fapt: Metro +15% preț. Posibil insight: presiune pe buget.
- **Durability:** seasonal
- **Phase:** 1
- **Note:** Test de granularitate — un singur mesaj conține fapt + implicație. LLM-ul trebuie să extragă ambele sau cel puțin cel mai important.

---

## Suite M2 — Ce NU trebuie salvat

### MEM-09: Filler conversațional
- **Input:** `ok`
- **Expected decision:** `intent = general_response`, `memory_writes = []`
- **Phase:** 1

### MEM-10: Mulțumire
- **Input:** `mulțumesc`
- **Expected decision:** `memory_writes = []`
- **Phase:** 1

### MEM-11: Ping
- **Input:** `ești?`
- **Expected decision:** `memory_writes = []`
- **Phase:** 1

### MEM-12: Task trivial fără valoare semantică
- **Input:** `mâine trebuie să sun furnizorul`
- **Expected decision:** `intent = create_task`, `memory_writes = []` (informația e deja în task)
- **Phase:** 1
- **Note:** Regula arhitecturală: "Only operational → NO (stays in tasks/reminders)". Task-ul capturează acțiunea, RAG nu duplică.

### MEM-13: Informație prea volatilă
- **Input:** `azi sunt puțin obosit`
- **Expected decision:** `memory_writes = []`
- **Phase:** 1
- **Note:** Noise — nu ajută nici la retrieval, nici la briefing.

### MEM-14: Duplicat semantic cu memorie existentă
- **Precondition:** Există memorie: `Ion a spus să fie sunat peste 1 lună`
- **Input:** `Ion mi-a spus iar să-l sun peste o lună`
- **Expected decision:** `memory_writes = []` (duplicat) sau write minimal cu referință temporală nouă
- **Phase:** 1 (detecție), 2 (dedup automat în Memory Write node)

### MEM-15: Glumă / sarcasm (ADĂUGAT)
- **Input:** `la cum merge treaba, mai bine închid tot și plec la mare`
- **Expected decision:** `memory_writes = []`
- **Phase:** 1
- **Note:** Sarcasmul nu e insight. LLM-ul nu ar trebui să salveze asta ca plan de business.

### MEM-16: Repetiție de comandă (ADĂUGAT)
- **Input:** `pune task să sun furnizorul. pune task să sun furnizorul.`
- **Expected decision:** `intent = create_task` (una singură), `memory_writes = []`
- **Phase:** 1

### MEM-17: Întrebare retorică (ADĂUGAT)
- **Input:** `de ce nu merge nimic în țara asta?`
- **Expected decision:** `memory_writes = []`
- **Phase:** 1

---

## Suite M3 — Deduplicare și consolidare
**Phase: 2** (necesită Memory Write node cu dedup logic)
**Status:** ACCEPTANCE CRITERIA — nu rulabile acum

### MEM-18: Aceeași informație spusă de 2 ori
- **Input 1:** `Mihai vrea oferta până luni`
- **Input 2:** `să nu uit, Mihai a zis că oferta trebuie până luni`
- **Expected:** Memoria nu conține două intrări aproape identice
- **Mecanism necesar:** Embedding similarity check înainte de INSERT (cosine > 0.92 → skip sau merge)

### MEM-19: Reformulare a aceleiași preferințe
- **Input 1:** `prefer remindere dimineața`
- **Input 2:** `de obicei vreau reminder-ele dimineața`
- **Expected:** Consolidare, nu dublură
- **Mecanism necesar:** Category + type match + semantic similarity

### MEM-20: Update de fapt, nu duplicat
- **Input 1:** `Ana livrează greu vinerea`
- **Input 2:** `de fapt Ana livrează greu și joia`
- **Expected:** Memorie nouă complementară (nu duplicat, nu pierdere a input 1)
- **Mecanism necesar:** Embedding proximity + temporal recency

### MEM-21: Acumulare vs suprascriere (ADĂUGAT)
- **Input 1:** `am 2 clienți activi la curățenie`
- **Input 2:** (2 săptămâni mai târziu) `am ajuns la 5 clienți la curățenie`
- **Expected:** Input 2 e versiunea curentă, input 1 e istoric
- **Mecanism necesar:** Recency scoring + same-entity detection

---

## Suite M4 — Conflict și recență
**Phase: 2** (necesită scoring logic în Memory Write node + retrieval ranking)
**Status:** ACCEPTANCE CRITERIA

### MEM-22: Preferință schimbată
- **Precondition:** Memorie: `prefer remindere dimineața`
- **Input:** `de acum prefer reminderele după-amiaza`
- **Expected:** La retrieval, noua preferință bate vechea

### MEM-23: Fapt corectat
- **Precondition:** Memorie: `Mihai vrea oferta până luni`
- **Input:** `Mihai a zis că oferta nu mai trebuie luni, ci miercuri`
- **Expected:** Retrieval returnează miercuri, nu luni

### MEM-24: Relație actualizată
- **Precondition:** Memorie: `Ion trebuie sunat peste o lună`
- **Input:** `am vorbit deja cu Ion, nu mai trebuie să-l sun`
- **Expected:** Retrieval reflectă starea curentă, nu cea veche

### MEM-25: Corecție parțială (ADĂUGAT)
- **Precondition:** Memorie: `Ana livrează detergenți marți și vineri`
- **Input:** `Ana a anulat livarea de vineri, doar marți acum`
- **Expected:** Retrieval: Ana livrează marți. Vineri anulat.

---

## Suite M5 — search_memory

### MEM-26: Despre mine
- **Input:** `ce știi despre mine?`
- **Expected decision:** `intent = search_memory`, `memory_action.query` ≈ "informații antreprenor / user"
- **Expected response:** Grounded în memorii existente, fără halucinații

### MEM-27: Despre persoană
- **Input:** `ce știi despre Mihai?`
- **Expected decision:** `intent = search_memory`, query conține "Mihai"
- **Expected retrieval:** Memorii care menționează Mihai

### MEM-28: Despre business
- **Input:** `ce știi despre businessul de curățenie?`
- **Expected decision:** `intent = search_memory`, category_filter = "business_profile" sau query conține "curățenie"

### MEM-29: Despre preferințe
- **Input:** `ce preferințe știi că am?`
- **Expected decision:** `intent = search_memory`, query ≈ "preferințe user"

### MEM-30: Despre problemă de business
- **Input:** `de ce crezi că pierdem clienți?`
- **Expected decision:** Dacă există insight relevantă → `search_memory` sau `general_response` cu context din memorie
- **Note:** Brain-ul poate răspunde direct dacă memoria e deja în context (loaded in Faza 1, step 5)

### MEM-31: Întrebare temporală
- **Input:** `când am vorbit ultima dată cu Ion?`
- **Expected decision:** `intent = search_memory`
- **Expected response:** Dacă memoria conține timestamp/eveniment → îl folosește. Dacă nu → spune că nu știe sigur.

### MEM-32: Query cu rezultat gol (ADĂUGAT)
- **Input:** `ce știi despre George?`
- **Precondition:** Nu există memorie despre George
- **Expected decision:** `intent = search_memory`
- **Expected response:** "Nu am informații despre George." — fără halucinații

### MEM-33: Query ambiguu (ADĂUGAT)
- **Input:** `ce știi despre livrare?`
- **Precondition:** Memorii despre Ana (detergenți, vinerea) + Metro (prețuri)
- **Expected:** Returnează ambele memorii relevante, nu doar una

---

## Suite M6 — Folosirea memoriei în răspunsuri generale

### MEM-34: Sfat contextual
- **Input:** `cum ai face tu cu oferta pentru Mihai?`
- **Precondition:** Memorie: Mihai vrea oferta până luni
- **Expected decision:** `intent = general_response`
- **Expected response:** Folosește memoria despre Mihai

### MEM-35: Recomandare operațională
- **Input:** `cum să gestionez mai bine stocul?`
- **Precondition:** Memorie: Ana livrează greu vinerea + rămânem fără detergenți spre miercuri
- **Expected response:** Incorporează memoriile relevante

### MEM-36: Opinie despre user
- **Input:** `ce părere ai despre cum lucrez?`
- **Expected decision:** `intent = general_response`
- **Expected response:** Folosește memorie despre stil/preferințe, fără invenții

### MEM-37: Strategie
- **Input:** `ce crezi că ar trebui să schimb în businessul meu?`
- **Expected:** Dacă există insights → le folosește. Dacă nu → răspuns general marcat ca opinie.

### MEM-38: Răspuns fără memorie relevantă (ADĂUGAT)
- **Input:** `cum e vremea mâine?`
- **Expected:** `general_response` — NU caută în memorie, recunoaște că nu are date meteo

---

## Suite M7 — Întâlniri și conversații

### MEM-39: Întâlnire
- **Input:** `m-am văzut azi cu Mihai și mi-a spus că vrea oferta finală până luni`
- **Expected:** `memory_writes` cu: te-ai văzut cu Mihai + Mihai vrea oferta până luni
- **Durability:** seasonal

### MEM-40: Conversație
- **Input:** `am vorbit cu Ana și a zis că poate livra doar marți`
- **Expected:** `memory_writes` fapt despre Ana + livrare marți
- **Durability:** seasonal

### MEM-41: Follow-up
- **Input:** `Ion a zis să-l sun în 1 lună`
- **Expected:** `memory_writes` + eventual sugestie de reminder
- **Note:** Brain-ul poate sugera reminder în `response`, dar nu crea automat (necesită confirmare)

### MEM-42: Istoric compus
- **Input:** `m-am văzut cu Mihai, am discutat despre ofertă și a zis să-i trimit draftul până joi`
- **Expected:** O memorie coerentă (nu 3 fragmente), categorie `relationship_history`
- **Durability:** seasonal

### MEM-43: Query ulterior
- **Input:** `ce s-a întâmplat cu Mihai?`
- **Precondition:** Memorii din MEM-39 sau MEM-42
- **Expected:** `search_memory`, răspuns bazat pe memorii

### MEM-44: Întâlnire cu detalii contradictorii față de memorie existentă (ADĂUGAT)
- **Precondition:** Memorie: Mihai vrea oferta până luni
- **Input:** `l-am sunat pe Mihai și a zis că nu mai e urgentă oferta`
- **Expected:** Memorie nouă care actualizează starea (oferta nu mai e urgentă)

---

## Suite M8 — Edge cases memorie

### MEM-45: Informație incompletă
- **Input:** `m-am văzut cu cineva și am stabilit ceva important`
- **Expected:** `memory_writes = []` sau `clarify` — "cu cine?" + "ce anume?"
- **Note:** Fără identitate și fără detaliu concret, memoria e inutilă

### MEM-46: Informație vagă
- **Input:** `cred că e ceva în neregulă cu furnizorii`
- **Expected:** Posibil `insight` cu `category = growth_context`, dar doar dacă e suficient de clar. Altfel, nimic.

### MEM-47: Emoție / filler
- **Input:** `azi a fost o zi grea`
- **Expected:** `memory_writes = []`

### MEM-48: Contradicție explicită
- **Precondition:** Memorie: Ion trebuie sunat în 1 lună
- **Input:** `de fapt nu mai trebuie să-l sun pe Ion`
- **Expected:** Memorie nouă cu prioritate mai mare (recency)

### MEM-49: Entitate ambiguă
- **Input:** `am vorbit cu el și a zis să-l sun din nou`
- **Expected:** `memory_writes = []` sau `clarify` — "el" nu e suficient pentru memorie utilă

### MEM-50: Mesaj foarte lung cu o singură memorie utilă (ADĂUGAT)
- **Input:** `bună, uite, am fost azi prin oraș, am băut o cafea, am trecut pe la Mihai și mi-a spus că vrea oferta până vineri, apoi m-am întors acasă`
- **Expected:** `memory_writes` extrage DOAR: Mihai vrea oferta până vineri. Restul e noise.

### MEM-51: Memorie cu dată relativă (ADĂUGAT)
- **Input:** `Ion mi-a zis acum 3 zile că vrea discount`
- **Expected:** `memory_writes` — dar cum se rezolvă "acum 3 zile"? Trebuie timestamp absolut? Sau păstrăm relativ?
- **Note:** Critică pentru retrieval temporal. Dacă salvăm "acum 3 zile" fără dată absolută, peste o săptămână e inutilă.

### MEM-52: Mesaj care combină acțiune + memorie + noise (ADĂUGAT)
- **Input:** `pune task să comand detergenți mâine, Ana nu poate livra vinerea, ah și azi e frumos afară`
- **Expected:** `intent = create_task` (detergenți mâine), `memory_writes` conține fapt despre Ana + vineri, noise ignorat

### MEM-53: Informație despre persoană nouă (ADĂUGAT)
- **Input:** `am un furnizor nou, Costel, pare de încredere`
- **Expected:** `memory_writes` cu `type = fact`, `category = relationship_history` sau `business_profile`
- **Note:** Entitate nouă. Nu există context anterior.

### MEM-54: Memorie care e de fapt o decizie (ADĂUGAT)
- **Input:** `am decis să nu mai lucrez cu furnizorul de la Metro`
- **Expected:** `memory_writes` cu `type = fact`, `category = business_profile` — decizie operațională permanentă
- **Durability:** stable

---

## Suite M9 — Privacy / Pseudonymization / Safety
**Phase: 2** (Privacy Gate NO-OP acum)
**Status:** ACCEPTANCE CRITERIA pentru Phase 2

### MEM-55: Date sensibile brute
- **Input:** `Ion stă la adresa X și codul de la intrare e 1234`
- **Expected (Phase 2):** Memoria NU stochează codul brut. Pseudonimizare sau excludere.

### MEM-56: Contact personal
- **Input:** `numărul Anei este 0722...`
- **Expected (Phase 2):** Numărul NU ajunge în RAG.

### MEM-57: Date utile dar sensibile
- **Input:** `clientul important de pe strada Y vrea să fie sunat marți`
- **Expected (Phase 2):** Memorie în formă pseudonimizată. Adresa nu stocată raw.

### MEM-58: CNP / date identitate (ADĂUGAT)
- **Input:** `CNP-ul lui Ion e 1850...`
- **Expected (Phase 2):** NICIODATĂ în RAG. Nici pseudonimizat.

### MEM-59: Date financiare (ADĂUGAT)
- **Input:** `contul firmei de curățenie e RO49BTRL...`
- **Expected (Phase 2):** NICIODATĂ în RAG.

---

## Suite M10 — Legătura memorie + task/reminder

### MEM-60: Memory + task
- **Input:** `am vorbit cu Ion și mi-a zis să-l sun peste o lună`
- **Expected:** `intent = general_response` cu `memory_writes`, posibil sugestie de reminder/task în response
- **Note:** Brain-ul sugerează, nu creează automat

### MEM-61: Memory + reminder
- **Input:** `Ana a zis că poate livra marți, amintește-mi luni să confirm`
- **Expected:** `intent = create_reminder` (reminder luni), `memory_writes` (Ana livrează marți)
- **Note:** Remarcă cuplarea: reminder e acțiunea, memorie e contextul

### MEM-62: Memory + general_response
- **Input:** `de obicei Mihai răspunde greu, ce ai face tu?`
- **Expected:** `intent = general_response`, `memory_writes` dacă info nouă (Mihai răspunde greu)

### MEM-63: Task care NU produce memorie (ADĂUGAT — verificare regulă)
- **Input:** `pune task să sun la primărie mâine`
- **Expected:** `intent = create_task`, `memory_writes = []`
- **Note:** Verifică regula: "Only operational → NO"

### MEM-64: Reminder care produce memorie colateral (ADĂUGAT)
- **Input:** `amintește-mi vineri să comand detergenți, Ana zice că are promoție`
- **Expected:** `intent = create_reminder` (vineri), `memory_writes` (Ana are promoție la detergenți)

---

## Suite M11 — Writing Variations pentru search_memory (ADĂUGAT)

### MEM-65: Variație "ce stii"
- **Input:** `ce stii despre Mihai?` (fără diacritice)
- **Expected:** `intent = search_memory`

### MEM-66: Variație "ce imi poti spune"
- **Input:** `ce imi poti spune despre businessul de curățenie?`
- **Expected:** `intent = search_memory`

### MEM-67: Variație "ai retinut"
- **Input:** `ai retinut ceva despre Ana?`
- **Expected:** `intent = search_memory`

### MEM-68: Variație implicită
- **Input:** `cand am vorbit cu Ion?`
- **Expected:** `intent = search_memory`

### MEM-69: Variație "imi amintesti"
- **Input:** `imi amintesti ce am discutat cu Mihai?`
- **Expected:** `intent = search_memory` (NU create_reminder)
- **Note:** Edge case important: "îmi amintești" poate fi interpretat ca reminder. Contextul indică search.

---

## REZUMAT

| Suite | Teste | Phase 1 | Phase 2 | Edge cases adăugate |
|-------|-------|---------|---------|---------------------|
| M1 — Ce se salvează | 8 | 8 | 0 | +2 (MEM-07, MEM-08) |
| M2 — Ce NU se salvează | 9 | 9 | 0 | +3 (MEM-15, MEM-16, MEM-17) |
| M3 — Deduplicare | 4 | 0 | 4 | +1 (MEM-21) |
| M4 — Conflict/recență | 4 | 0 | 4 | +1 (MEM-25) |
| M5 — search_memory | 8 | 8 | 0 | +2 (MEM-32, MEM-33) |
| M6 — Memorie în răspunsuri | 5 | 5 | 0 | +1 (MEM-38) |
| M7 — Întâlniri/conversații | 6 | 6 | 0 | +1 (MEM-44) |
| M8 — Edge cases | 10 | 10 | 0 | +5 (MEM-50–MEM-54) |
| M9 — Privacy | 5 | 0 | 5 | +2 (MEM-58, MEM-59) |
| M10 — Memory+action | 5 | 5 | 0 | +2 (MEM-63, MEM-64) |
| M11 — Writing variations | 5 | 5 | 0 | +5 (suite nouă) |
| **TOTAL** | **69** | **56** | **13** | **+25 față de suita originală** |

---

## BUG CRITIC DESCOPERIT

**Phase 6 din parser curăță memory_writes pe general_response!**

```javascript
// PHASE 6: Clean operational payloads for non-action intents
if (decision.intent === 'none' || decision.intent === 'general_response') {
  decision.task_action = null;
  decision.task_fallback_rules = [];
  decision.reminder_action = null;
  decision.memory_action = null;
  decision.improvement_request = null;
  // ⚠️ memory_writes NU E CURĂȚAT — dar nici NU e menționat explicit
}
```

Verificare: `memory_writes` NU e în lista de curățare Phase 6. Deci se păstrează pe `general_response`. **OK — funcționează corect.** Dar trebuie confirmat că Memory Write node (Memory Write) procesează memory_writes indiferent de intent.

---

## NEXT STEPS

1. **Confirmare:** Acceptarea extinderii categoriilor RAG (de la 4 la 8)?
2. **brain_contract.json update:** Adaugă noile categorii
3. **Prioritate implementare:**
   - Phase 1: MEM-01 → MEM-17 (extracție + scriere + search) — depinde de Memory Write node
   - Phase 2: MEM-18 → MEM-25 (dedup + conflict) + MEM-55 → MEM-59 (privacy)
4. **Parser fix potențial:** Verifică comportament memory_writes pe general_response + none
