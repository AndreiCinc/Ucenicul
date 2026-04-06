# Memory Test Suite — Realistic User Language Expansion
**Created:** 2026-04-03
**Status:** ACCEPTANCE CRITERIA — extends MEMORY_TEST_SUITE.md
**Purpose:** Testează cum vorbesc oamenii reali, nu cum ar scrie un spec.
**Continuă de la:** MEM-69 (suita originală)

---

## 1. AUDIT SUMMARY

### Ce lipsește din testele actuale:
| Problemă | Exemple |
|----------|---------|
| **Mesaje tăiate / incomplete** | "mihai a zis ca", "pai nu stiu exact dar" |
| **Slang / shorthand românesc** | "na", "mno", "plm", "deci", "bai" |
| **Referințe indirecte** | "ăla", "tipu", "femeia aia", "de la curățenie" |
| **Autocorrect stricat** | "furnizorii" devine "furnișorii", "detergenți" devine "detergentu" |
| **Emoție + fapte amestecate** | "sunt stresat maxim dar macar am rezolvat cu Mihai" |
| **Corecție mid-conversation** | "nu, stai, nu luni, miercuri am zis" |
| **Mesaje în serie (context split)** | "am vorbit cu Ion" → "a zis ca vine maine" → "dar nu e sigur" |
| **Preferințe implicite** | "de obicei fac asta dimineata" (nu zice "prefer") |
| **Pattern-uri repetate** | userul spune a 3-a oară același lucru → pattern |
| **Fapte cu incertitudine** | "parcă", "cred că", "nu știu sigur dar" |
| **Operational patterns** | 0 teste cu această categorie |
| **Borderline save/not-save** | Prea puține perechi similare cu decizie diferită |

---

## 2. NEW TEST CATEGORIES

| Categorie nouă | De ce contează |
|----------------|----------------|
| **R1 — Vorbire naturală (save)** | Fapte reale spuse informal |
| **R2 — Vorbire naturală (don't save)** | Filler care pare important dar nu e |
| **R3 — Referințe indirecte** | "ăla", "tipu", entități fără nume |
| **R4 — Emoție + fapte amestecate** | Frustration vent + info utilă |
| **R5 — Corecții și update-uri** | "stai, nu asa", "de fapt" |
| **R6 — Mesaje în serie** | Context split pe mai multe mesaje |
| **R7 — Preferințe implicite** | Patterns care dezvăluie preferințe fără "prefer" |
| **R8 — Operational patterns** | Rutine, obiceiuri, procese repetabile |
| **R9 — Borderline pairs** | Două mesaje similare, decizie diferită |
| **R10 — Incertitudine și speculație** | "parcă", "cred că", "posibil" |
| **R11 — Mesaje lungi cu noise** | Wall of text cu 1-2 fapte ascunse |
| **R12 — Dedup & contradiction** | Actualizări naturale ale faptelor existente |

---

## 3. EXPANDED TEST SUITE

---

### Suite R1 — Vorbire naturală care TREBUIE salvată

#### MEM-70: Fapt spus casual
- **Input:** `mno deci ana nu mai lucreaza vinerea, asa a zis`
- **Why real:** shorthand "mno deci", fără diacritice, structură informală
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Reasoning:** Constrângere operațională clară (Ana nu lucrează vinerea), indiferent de ton
- **Durability:** seasonal

#### MEM-71: Insight spus ca frustrare
- **Input:** `ba frate nu mai pot cu clientii astia, toti vor reducere si nimeni nu plateste la timp`
- **Why real:** emoție pură + pattern real de business
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Reasoning:** "toți vor reducere" + "nimeni nu plătește la timp" = pattern de piață
- **Durability:** seasonal

#### MEM-72: Preferință mascată ca obicei
- **Input:** `eu de obicei rezolv chestiile astea lunea ca sa am toata saptamana libera`
- **Why real:** nu zice "prefer", descrie ce face
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Reasoning:** Pattern stabil de organizare personală
- **Durability:** stable

#### MEM-73: Relație cu furnizor, ton casual
- **Input:** `costel ala de la materiale e ok, livreaza repede si nu face figuri`
- **Why real:** "ăla", evaluare scurtă, limbaj informal
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Reasoning:** Evaluare furnizor: Costel, materiale, pozitiv, livrare rapidă
- **Durability:** stable

#### MEM-74: Decizie de business spusă simplu
- **Input:** `gata cu metro, preturile sunt prea mari, trec pe selgros`
- **Why real:** declarație scurtă, decisivă, fără explicații lungi
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Reasoning:** Decizie operațională: schimbare furnizor Metro → Selgros
- **Durability:** stable

#### MEM-75: Client descris informal
- **Input:** `aia de la apartamentul 7 sunt super ok, platesc mereu la timp si nu fac probleme`
- **Why real:** "aia", referință prin locație, evaluare scurtă
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Reasoning:** Profil client pozitiv: Ap.7, plată la timp, fără probleme
- **Durability:** stable

#### MEM-76: Constrângere descoperită din experiență
- **Input:** `nu mai programez curatenii sambata ca toata lumea e acasa si deranjeaza`
- **Why real:** lecție învățată, nu constrângere externă
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Reasoning:** Constrângere operațională: nu sâmbăta (oamenii sunt acasă)
- **Durability:** stable

#### MEM-77: Observație de piață scurtă
- **Input:** `vara cresc cererile de curatenie cu vreo 30%`
- **Why real:** estimare imprecisă dar utilă ("vreo 30%")
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Reasoning:** Pattern sezonier: vara +30% cerere curățenie
- **Durability:** stable

#### MEM-78: Sfat auto-dat
- **Input:** `tre sa incep sa tin evidenta mai bine la stocuri ca mereu raman fara`
- **Why real:** "tre sa", autocritică, fără diacritice
- **Expected:** SAVE
- **Type:** advice
- **Category:** operational_patterns
- **Reasoning:** Self-advice operațional: evidență stocuri, problem recurrent
- **Durability:** stable

#### MEM-79: Info despre echipă
- **Input:** `maria e cea mai buna la curatenie dar vine tarziu mereu`
- **Why real:** evaluare cu nuanță (+/-), limbaj simplu
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Reasoning:** Profil angajat: Maria, calitate bună, punctualitate slabă
- **Durability:** seasonal

#### MEM-80: Promisiune făcută cuiva
- **Input:** `i-am promis lui mihai ca ii fac pretul mai mic de luna viitoare`
- **Why real:** promisiune business, dată relativă, limbaj casual
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Reasoning:** Commitment: preț mai mic pentru Mihai, termen luna viitoare
- **Durability:** seasonal

#### MEM-81: Pattern de lucru personal
- **Input:** `eu dupa ora 8 seara nu mai raspund la telefon, e sacru`
- **Why real:** preferință exprimată ferm dar informal
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Reasoning:** Boundary clar: nu răspunde după 20:00
- **Durability:** stable

#### MEM-82: Lecție învățată
- **Input:** `data trecuta cand n-am verificat stocul inainte de weekend a fost dezastru`
- **Why real:** anecdotă cu lecție, fără structură
- **Expected:** SAVE
- **Type:** insight
- **Category:** operational_patterns
- **Reasoning:** Pattern: verifică stocul înainte de weekend (lecție din experiență)
- **Durability:** stable

#### MEM-83: Competiție menționată casual
- **Input:** `vecinii de la clean pro au scazut preturile si ne fura clienti`
- **Why real:** plângere competitivă, ton personal
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Reasoning:** Competitor: Clean Pro, strategie preț scăzut, pierdere clienți
- **Durability:** seasonal

#### MEM-84: Capacitate operațională
- **Input:** `maxim putem face 3 apartamente pe zi, mai mult nu avem echipa`
- **Why real:** constrângere spusă direct, informal
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Reasoning:** Capacitate: 3 apartamente/zi, limitat de echipă
- **Durability:** seasonal

#### MEM-85: Obiectiv de business vag dar real
- **Input:** `anul asta vreau sa ajung la 20 de clienti pe luna macar`
- **Why real:** target imprecis ("măcar"), fără plan
- **Expected:** SAVE
- **Type:** fact
- **Category:** growth_context
- **Reasoning:** Obiectiv: 20 clienți/lună în anul curent
- **Durability:** seasonal

---

### Suite R2 — Vorbire naturală care NU trebuie salvată

#### MEM-86: Frustrare pură fără info
- **Input:** `plm ce zi de cacat`
- **Why real:** venting clasic, vulgar, zero informație
- **Expected:** DO NOT SAVE
- **Reasoning:** Emoție volatilă, nu conține fapt, insight, sau advice

#### MEM-87: "Nu știu"
- **Input:** `habar n-am ce sa fac`
- **Why real:** exprimă confuzie, nu informație
- **Expected:** DO NOT SAVE
- **Reasoning:** Filler emoțional, nu persistă

#### MEM-88: Confirmare simplă
- **Input:** `da da, asa e`
- **Why real:** acord conversațional
- **Expected:** DO NOT SAVE
- **Reasoning:** Filler, nu conține informație nouă

#### MEM-89: Mici talk
- **Input:** `ce mai faci? esti acolo?`
- **Why real:** salut + check availability
- **Expected:** DO NOT SAVE
- **Reasoning:** Conversațional, zero info

#### MEM-90: Plan imediat trivial
- **Input:** `ma duc sa mananc si revin`
- **Why real:** anunț personal scurt
- **Expected:** DO NOT SAVE
- **Reasoning:** Informație volatilă, nu operațional

#### MEM-91: Repetiție fără info nouă
- **Input:** `bun bun bun ok am inteles`
- **Why real:** acknowledgment repetat
- **Expected:** DO NOT SAVE

#### MEM-92: Emoție pozitivă fără substanță
- **Input:** `super tare! bravo!`
- **Why real:** reacție emoțională
- **Expected:** DO NOT SAVE

#### MEM-93: Planificare vagă fără commitment
- **Input:** `poate o sa fac ceva cu site-ul la un moment dat`
- **Why real:** "poate", "la un moment dat" = zero commitment
- **Expected:** DO NOT SAVE
- **Reasoning:** Prea vag, prea incert, nu acționabil

#### MEM-94: Observație meteo/zi
- **Input:** `azi e cald rau, nu pot sa stau afara`
- **Why real:** observație contextuală
- **Expected:** DO NOT SAVE
- **Reasoning:** Volatile, nu operațional

#### MEM-95: Glumă
- **Input:** `ma fac programator ca asa nu mai am clienti problematici`
- **Why real:** sarcasm, ton ironic
- **Expected:** DO NOT SAVE
- **Reasoning:** Ironie, nu decizie reală

#### MEM-96: Task deja capturat
- **Input:** `trebuie sa comand detergenți`
- **Why real:** acțiune operațională pură
- **Expected:** DO NOT SAVE (goes to task, not memory)
- **Reasoning:** Regula: "Only operational → NO (stays in tasks)"

---

### Suite R3 — Referințe indirecte și entități ambigue

#### MEM-97: "Ăla" cu context suficient
- **Input:** `ala de la selgros a zis ca poate livra si sambata`
- **Why real:** "ăla" = persoana de contact de la Selgros
- **Expected:** SAVE (cu notă: entitate parțial identificată)
- **Type:** fact
- **Category:** relationship_history
- **Reasoning:** Info utilă (livrare sâmbăta), furnizor identificabil (Selgros)

#### MEM-98: "Ăla" fără context
- **Input:** `am vorbit cu ala si a zis ca e ok`
- **Why real:** pronume demonstrativ, zero context
- **Expected:** DO NOT SAVE
- **Reasoning:** Cine? Ce e ok? Inutilizabil pentru retrieval

#### MEM-99: "Tipul de la curățenie"
- **Input:** `tipul de la curatenie nu a venit ieri si am pierdut un client`
- **Why real:** referință prin funcție, nu nume
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Reasoning:** Incident operațional: angajat absent → client pierdut. Identificabil prin funcție.

#### MEM-100: "Ei" — plural ambiguu
- **Input:** `ei nu vor sa plateasca mai mult de 200 de lei pe curatenie`
- **Why real:** "ei" = probabil clienții, dar neclar
- **Expected:** AMBIGUOUS — depinde de context conversație anterior
- **Reasoning:** Dacă conversația anterioară identifica grupul → SAVE. Altfel → DO NOT SAVE.

#### MEM-101: Referință prin locație
- **Input:** `aia de pe calea victoriei au anulat din nou`
- **Why real:** client identificat prin adresă
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Reasoning:** Client recurent (Calea Victoriei) + pattern (anulări repetate: "din nou")

#### MEM-102: Pronume "el" cu context recent
- **Input:** `(după conversație despre Ion) el a zis ca vrea discount 10%`
- **Why real:** pronume + context conversațional
- **Expected:** SAVE (dacă contextul identifică Ion)
- **Type:** fact
- **Category:** relationship_history
- **Note:** Necesită context window, nu doar mesaj izolat

---

### Suite R4 — Emoție amestecată cu fapte

#### MEM-103: Frustrare + insight real
- **Input:** `sunt satut de clientii astia care anuleaza cu o ora inainte, asta e a treia oara luna asta`
- **Why real:** vent dar conține date: anulări last-minute, frecvență
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Reasoning:** Pattern: anulări last-minute frecvente (3x/lună)

#### MEM-104: Entuziasm + fapt
- **Input:** `baa super tare, am semnat contractul cu hotel mariana, 10 camere pe saptamana!`
- **Why real:** emoție pozitivă + deal concret
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Reasoning:** Contract nou: Hotel Mariana, 10 camere/săptămână

#### MEM-105: Anxietate + constrângere
- **Input:** `ma streseaza maxim ca nu avem bani de utilaje noi si cu astea vechi pierdem timp`
- **Why real:** stres + constrângere reală de buget + impact operațional
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Reasoning:** Constrângere: buget insuficient pentru utilaje. Impact: pierdere timp.

#### MEM-106: Supărare + decizie
- **Input:** `gata cu Ion, nu mai lucrez cu el, m-a mintit de 3 ori`
- **Why real:** emoție + decizie fermă + istoric
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Reasoning:** Decizie: terminare relație cu Ion. Motiv: minciuni repetate (3x).
- **Durability:** stable

#### MEM-107: Emoție pură fără fapt
- **Input:** `sunt asa de stresat ca nu mai pot, totul e un haos`
- **Why real:** venting fără specificitate
- **Expected:** DO NOT SAVE
- **Reasoning:** Emoție volatilă, zero fapte concrete

#### MEM-108: Panică + informație utilă
- **Input:** `vai de mine am uitat sa platesc chiria la depozit si ne dau afara!!!`
- **Why real:** panică + fapt operațional (chirie depozit neplătită)
- **Expected:** SAVE (faptul, nu panica)
- **Type:** fact
- **Category:** constraints
- **Reasoning:** Risc operațional: chirie depozit restantă, risc evacuare

---

### Suite R5 — Corecții și update-uri naturale

#### MEM-109: Corecție imediată ("stai")
- **Input:** `mihai vine luni... stai, nu luni, marti vine`
- **Why real:** autocorecție mid-sentence
- **Expected:** SAVE (doar informația corectată: Mihai vine marți)
- **Type:** fact
- **Category:** relationship_history
- **Reasoning:** Trebuie salvat DOAR "marți", nu "luni"

#### MEM-110: "De fapt" — override
- **Input:** `de fapt ana poate livra si joia, nu doar martea`
- **Why real:** adaugă zi, nu înlocuiește
- **Expected:** SAVE (update: Ana livrează marți + joi)
- **Type:** fact
- **Category:** constraints → business_profile
- **Dedup note:** Dacă există memorie "Ana livrează marți" → extinde, nu duplică

#### MEM-111: Negare a informației anterioare
- **Input:** `nu mai e valabil ce am zis despre preturile de la metro, s-au schimbat`
- **Why real:** invalidare explicită
- **Expected:** SAVE (noua stare: prețurile Metro s-au schimbat, info anterioară invalidă)
- **Type:** fact
- **Category:** business_profile
- **Contradiction note:** Trebuie să marcheze memoria anterioară ca outdated

#### MEM-112: Update numeric
- **Input:** `am 7 clienti acum nu 5 cum am zis inainte`
- **Why real:** corecție cantitativă
- **Expected:** SAVE
- **Type:** fact
- **Category:** growth_context
- **Dedup note:** Replace "5 clienți" → "7 clienți"

#### MEM-113: Corecție de persoană
- **Input:** `a nu costel era, era marcel de la selgros`
- **Why real:** corectează identitate
- **Expected:** SAVE (corectare: Marcel, nu Costel, de la Selgros)
- **Type:** fact
- **Category:** relationship_history
- **Note:** Trebuie update la memorii care menționau "Costel de la Selgros"

---

### Suite R6 — Mesaje în serie (context split)

#### MEM-114: Serie de 3 mesaje = 1 fapt
- **Input 1:** `am vorbit cu ion`
- **Input 2:** `a zis ca vine maine cu materialele`
- **Input 3:** `dar numai daca platim in avans`
- **Why real:** user trimite în bucăți, ca pe WhatsApp
- **Expected:** SAVE (consolidat: Ion vine mâine cu materialele, condiție: plata în avans)
- **Type:** fact
- **Category:** relationship_history
- **Note:** Fiecare mesaj individual e incomplet. Valoarea e în agregat.

#### MEM-115: Mesaj 1 = noise, mesaj 2 = fapt
- **Input 1:** `hmm`
- **Input 2:** `ma gandesc sa schimb furnizorul de detergenți`
- **Why real:** gândire cu voce tare, apoi idee
- **Expected:** Input 1 = DO NOT SAVE. Input 2 = AMBIGUOUS (gândire, nu decizie)
- **Reasoning:** "mă gândesc" = intenție, nu fapt. Poate deveni fapt dacă confirmă.

#### MEM-116: Corecție în mesaj următor
- **Input 1:** `ana livreaza luni`
- **Input 2:** `ah nu, marti pardon`
- **Why real:** corectare imediată
- **Expected:** SAVE doar "Ana livrează marți"

---

### Suite R7 — Preferințe implicite (niciodată cuvântul "prefer")

#### MEM-117: Pattern de comportament = preferință
- **Input:** `eu mereu fac facturile duminica seara`
- **Why real:** descrie obicei, nu spune "prefer"
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Reasoning:** Preferință implicită: facturi duminică seara

#### MEM-118: Evitare = preferință negativă
- **Input:** `nu imi plac intalnirile lungi, maxim 15 min si gata`
- **Why real:** exprimă ce nu-i place + limita
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Reasoning:** Preferință: întâlniri scurte (max 15 min)
- **Durability:** stable

#### MEM-119: Rutină implicită
- **Input:** `de obicei verific whatsapp-ul inainte de cafea, pe la 7`
- **Why real:** descrie rutina matinală
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Reasoning:** Pattern: verifică WhatsApp ~7:00, înainte de cafea
- **Durability:** stable

#### MEM-120: Preferință prin comparație
- **Input:** `mai bine mesaj decat telefon, ca la telefon pierd timp`
- **Why real:** preferință + motiv, limbaj concis
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Reasoning:** Preferință comunicare: mesaj > telefon (eficiență)
- **Durability:** stable

#### MEM-121: Obicei care dezvăluie prioritate
- **Input:** `intai rezolv urgentele si dupa ma ocup de restu`
- **Why real:** workflow personal descris casual
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Reasoning:** Stil de lucru: urgențe first, restul after

---

### Suite R8 — Operational patterns

#### MEM-122: Proces repetat
- **Input:** `de fiecare data cand avem client nou fac o inspectie inainte`
- **Why real:** SOP informal descris verbal
- **Expected:** SAVE
- **Type:** fact
- **Category:** operational_patterns
- **Reasoning:** Proces: inspecție pre-client nou
- **Durability:** stable

#### MEM-123: Problemă recurentă
- **Input:** `mereu raman fara saci de aspirator spre sfarsitul lunii`
- **Why real:** pattern negativ recurent
- **Expected:** SAVE
- **Type:** insight
- **Category:** operational_patterns
- **Reasoning:** Pattern: deficit saci aspirator la final de lună

#### MEM-124: Soluție care a funcționat
- **Input:** `am inceput sa comand dublu detergent si n-am mai ramas fara`
- **Why real:** soluție empirică
- **Expected:** SAVE
- **Type:** insight
- **Category:** operational_patterns
- **Reasoning:** Soluție validată: comandă dublă detergenți = nu mai rămâne fără

#### MEM-125: Workflow implicit
- **Input:** `noi mereu trimitem oferta, asteptam confirmare, si dupa programam`
- **Why real:** descrie pașii procesului informal
- **Expected:** SAVE
- **Type:** fact
- **Category:** operational_patterns
- **Reasoning:** Workflow: ofertă → confirmare → programare
- **Durability:** stable

#### MEM-126: Timing operațional
- **Input:** `aprovizionarea o fac mereu lunea ca sa am pt toata saptamana`
- **Why real:** pattern logistic
- **Expected:** SAVE
- **Type:** fact
- **Category:** operational_patterns
- **Reasoning:** Pattern: aprovizionare lunea, stoc pentru săptămână

---

### Suite R9 — Borderline Pairs (mesaje similare, decizie diferită)

#### MEM-127a: SAVE — Frustrare cu pattern
- **Input:** `iar a sunat clientul de la 3 sa se planga, a 5-a oara luna asta`
- **Expected:** SAVE (fact: client Ap.3, plângeri frecvente: 5x/lună)
- **Category:** customer_market

#### MEM-127b: DON'T SAVE — Frustrare fără pattern
- **Input:** `iar a sunat un client sa se planga`
- **Expected:** DO NOT SAVE (cine? despre ce? prea vag)

#### MEM-128a: SAVE — Observație cu context
- **Input:** `parcă iarna avem mai puțini clienți la curățenie`
- **Expected:** SAVE (pattern sezonier, chiar dacă "parcă")
- **Type:** insight
- **Category:** customer_market

#### MEM-128b: DON'T SAVE — Observație prea vagă
- **Input:** `parcă merge mai greu acum`
- **Expected:** DO NOT SAVE (ce merge greu? când? prea vag)

#### MEM-129a: SAVE — Intenție fermă
- **Input:** `de luna viitoare maresc pretul la curatenie generala`
- **Expected:** SAVE (decizie: mărire preț, termen: luna viitoare)
- **Type:** fact
- **Category:** business_profile

#### MEM-129b: DON'T SAVE — Intenție nesigură
- **Input:** `poate o sa maresc pretul la un moment dat`
- **Expected:** DO NOT SAVE ("poate", "la un moment dat" = zero commitment)

#### MEM-130a: SAVE — Info despre persoană identificabilă
- **Input:** `andrei de la hotel mariana e greu de contactat`
- **Expected:** SAVE (fact: Andrei, Hotel Mariana, greu de contactat)
- **Category:** relationship_history

#### MEM-130b: DON'T SAVE — Info despre persoană neidentificabilă
- **Input:** `unu e greu de contactat`
- **Expected:** DO NOT SAVE (cine?)

#### MEM-131a: SAVE — Lecție concretă
- **Input:** `am invatat ca tre sa cer avansul inainte sa incep treaba`
- **Expected:** SAVE (advice: cere avans înainte de lucru)
- **Type:** advice
- **Category:** operational_patterns

#### MEM-131b: DON'T SAVE — Lecție vagă
- **Input:** `am invatat ceva azi`
- **Expected:** DO NOT SAVE (ce anume?)

#### MEM-132a: SAVE — Cifră concretă
- **Input:** `luna asta am facturat 8000 de lei`
- **Expected:** SAVE (fact: venituri luna curentă = 8000 RON)
- **Type:** fact
- **Category:** growth_context

#### MEM-132b: DON'T SAVE — Cifră fără context
- **Input:** `cam 200 ceva`
- **Expected:** DO NOT SAVE (200 ce? pentru ce?)

---

### Suite R10 — Incertitudine și speculație

#### MEM-133: "Parcă" cu informație utilă
- **Input:** `parca ana a zis ca poate livra si sambata`
- **Why real:** memorie imperfectă, prefixul "parcă"
- **Expected:** SAVE (cu marcaj incertitudine)
- **Type:** fact
- **Category:** constraints
- **Reasoning:** Info posibil utilă chiar dacă nesigură. La retrieval, se poate marca ca "nesigur"

#### MEM-134: "Cred că" cu insight
- **Input:** `cred ca pierdem clienti din cauza preturilor, nu din cauza calitatii`
- **Why real:** opinie = insight
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Reasoning:** Insight de piață: preț > calitate ca factor de pierdere clienți

#### MEM-135: Speculație pură
- **Input:** `poate concurenta a scazut preturile, nu stiu`
- **Why real:** speculează fără bază
- **Expected:** DO NOT SAVE
- **Reasoning:** "Poate" + "nu știu" = zero valoare informațională

#### MEM-136: "Nu sunt sigur dar"
- **Input:** `nu sunt sigur dar parca Ion zicea ca vrea discount 15%`
- **Why real:** incert dar conține detaliu specific (15%)
- **Expected:** SAVE (cu marcaj incertitudine)
- **Type:** fact
- **Category:** relationship_history
- **Reasoning:** Detaliul specific (15%) îi dă valoare chiar dacă incert

#### MEM-137: "Posibil" cu acțiune
- **Input:** `posibil sa renuntam la zona de nord, nu avem destui oameni`
- **Why real:** gândire strategică tenativă
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Reasoning:** Potențială decizie strategică + motivul (lipsă personal)

---

### Suite R11 — Mesaje lungi cu noise

#### MEM-138: Wall of text, 1 fapt ascuns
- **Input:** `bai deci azi a fost o zi nebuna, am fost in oras, m-am oprit la o cafea, dupa m-am vazut cu furnizorul si mi-a zis ca creste pretul cu 20% de luna viitoare, am venit acasa, m-am uitat la un serial, na asta a fost ziua`
- **Why real:** narațiune completă, un fapt important ascuns
- **Expected:** SAVE doar: furnizor crește prețul +20% de luna viitoare
- **Type:** fact
- **Category:** constraints

#### MEM-139: Mesaj lung, zero fapte
- **Input:** `nu stiu ce sa zic, a fost o zi ok, am facut treburi pe acasa, am stat pe telefon, nu s-a intamplat nimic special, poate maine e mai bine`
- **Why real:** narațiune fără substanță
- **Expected:** DO NOT SAVE

#### MEM-140: Mesaj lung, multiple fapte
- **Input:** `deci uite situatia: am 7 clienti activi, din care 3 pe airbnb si 4 pe curatenie, maria lucreaza full time, ion vine doar sambata, si ne trebuie inca o persoana ca nu mai facem fata`
- **Why real:** dump de informații, stil narativ
- **Expected:** SAVE (multiple fapte)
- **Fapte:** 7 clienți (3 airbnb + 4 curățenie), Maria full-time, Ion doar sâmbăta, nevoie personal
- **Categories:** business_profile, growth_context

---

### Suite R12 — Dedup & Contradiction (natural language)

#### MEM-141: Același lucru spus altfel
- **Precondition:** Memorie existentă: "Ana livrează greu vinerea"
- **Input:** `cu ana e nasol vinerea, nu reuseste sa livreze`
- **Expected:** DO NOT SAVE (duplicat semantic)
- **Dedup note:** Cosine similarity cu memorie existentă probabil > 0.90

#### MEM-142: Info nouă pe aceeași entitate
- **Precondition:** Memorie: "Costel de la materiale livrează repede"
- **Input:** `costel si-a luat si camioneta noua, acum livreaza si mai repede`
- **Expected:** SAVE (info nouă: camionetă + update pe viteză livrare)
- **Type:** fact
- **Category:** relationship_history
- **Dedup note:** Nu e duplicat — adaugă informație

#### MEM-143: Contradicție directă
- **Precondition:** Memorie: "Clienții din zona nord sunt cei mai buni"
- **Input:** `zona nord e varza, toti anuleaza, ma mut pe zona sud`
- **Expected:** SAVE (override: zona nord negativă, mutare pe zona sud)
- **Type:** fact
- **Category:** customer_market
- **Contradiction note:** Invalidează memorie anterioară

#### MEM-144: Update cantitativ
- **Precondition:** Memorie: "Avem 5 clienți activi"
- **Input:** `am pierdut 2 clienti, mai am 3`
- **Expected:** SAVE (update: 3 clienți activi)
- **Type:** fact
- **Category:** growth_context
- **Dedup note:** Suprascriere numerică

#### MEM-145: Preferință schimbată informal
- **Precondition:** Memorie: "Preferă remindere dimineața"
- **Input:** `mai bine trimite-mi chestiile seara ca dimineata nu am timp sa le citesc`
- **Expected:** SAVE (update preferință: seara, nu dimineața)
- **Type:** fact
- **Category:** preferences
- **Contradiction note:** Override explicit pe preferință anterioară

---

## 4. BORDERLINE CASES — Cazuri dificile

Aceste teste sunt cele mai greu de decis. Sistemul poate merge în orice direcție și ambele ar fi parțial justificate.

### BC-01: Fact vs Insight
- **Input:** `clientii din zona centrala par mai pretentiosi decat cei din cartiere`
- **Dilema:** E un fapt observat? Sau un insight subiectiv?
- **Recommended:** insight / customer_market
- **Argument fact:** Bazat pe experiență directă cu clienții
- **Argument insight:** "par" = percepție, nu date

### BC-02: Preferință vs Filler
- **Input:** `mai bine las chestia asta pe maine`
- **Dilema:** E o preferință de lucru? Sau just amânare?
- **Recommended:** DO NOT SAVE
- **Argument save:** Dezvăluie pattern de amânare
- **Argument don't:** Prea specific, prea volatil, nu e pattern recurent

### BC-03: Relationship history vs Noise
- **Input:** `am mai vorbit cu mihai, e ok baiatu`
- **Dilema:** Info despre relație? Sau social filler?
- **Recommended:** AMBIGUOUS — depinde de context
- **Argument save:** Evaluare pozitivă a lui Mihai
- **Argument don't:** Prea vag, "e ok băiatu" = generic

### BC-04: Durable vs Temporary
- **Input:** `saptamana asta am mult de lucru`
- **Dilema:** E un fapt despre capacitatea curentă? Sau noise?
- **Recommended:** DO NOT SAVE
- **Argument save:** Useful pt scheduling
- **Argument don't:** Expiră în 7 zile, nu e pattern

### BC-05: Useful vs Too Vague
- **Input:** `cred ca trebuie sa schimbam ceva la cum lucram`
- **Dilema:** Insight vag dar potențial valoros?
- **Recommended:** DO NOT SAVE
- **Argument save:** Semnal de nemulțumire operațională
- **Argument don't:** Ce anume? Zero specificitate.

### BC-06: Decizie vs Gândire cu voce tare
- **Input:** `ma gandesc sa iau inca o masina de spalat`
- **Dilema:** E o decizie? Sau doar explorare?
- **Recommended:** AMBIGUOUS
- **Argument save:** Semnal de investiție potențială
- **Argument don't:** "Mă gândesc" ≠ "Am decis"

### BC-07: Complaint vs Insight
- **Input:** `nu inteleg de ce toti clientii vor discount`
- **Dilema:** E un insight de piață? Sau doar frustrare?
- **Recommended:** SAVE (insight)
- **Argument save:** Pattern de piață: clienții cer discounturi frecvent
- **Argument don't:** Exprimat ca frustrare, nu analiză

### BC-08: Fapt cu sarcasm
- **Input:** `da super, iar a plecat maria fara sa termine`
- **Dilema:** Fapt (Maria a plecat fără să termine) cu sarcasm ("super")
- **Recommended:** SAVE (faptul, ignoră sarcasmul)
- **Type:** fact
- **Category:** business_profile
- **Note:** Trebuie extras faptul din sarcasm

### BC-09: Informație despre sine vs Momentan
- **Input:** `azi nu ma simt in stare sa fac nimic productiv`
- **Dilema:** Spune ceva despre entrepreneur_profile? Sau e doar o zi proastă?
- **Recommended:** DO NOT SAVE
- **Reason:** Stare temporară, nu pattern

### BC-10: Promisiune vagă
- **Input:** `o sa vorbesc cu ion la un moment dat despre contract`
- **Dilema:** E o intenție de follow-up? Sau vorbă goală?
- **Recommended:** DO NOT SAVE
- **Reason:** "La un moment dat" = zero urgență, zero commitment

### BC-11: Fapt vechi re-menționat
- **Input:** `acum 2 ani am avut probleme cu furnizorul de la metro si de atunci nu mai lucram cu ei`
- **Dilema:** Fapt vechi dar încă relevant?
- **Recommended:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Reason:** Decizie durabilă (nu mai lucrează cu Metro), chiar dacă veche

### BC-12: Cifră rotundă / estimare
- **Input:** `facem cam 500 de lei pe apartament`
- **Dilema:** E un fapt exact? Sau estimare?
- **Recommended:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Reason:** "Cam" = aproximativ dar util. Preț per apartament e informație de business.

---

## 5. RECOMMENDATIONS FOR STRONGER COVERAGE

### Patterns care trebuie incluse MEREU în QA-ul memoriei:

1. **"Parcă" test** — orice informație prefixată cu incertitudine ("parcă", "cred că", "nu sunt sigur dar") trebuie testat separat de varianta certă
2. **Pair testing** — pentru fiecare test de SAVE, să existe un echivalent minimal DON'T SAVE (aceeași temă, mai puțină substanță)
3. **Entitate ambiguă** — teste cu "el", "ea", "ăla", "tipul" fără context clar
4. **Autocorecție** — "stai, nu X, Y" — trebuie salvat DOAR Y
5. **Wall of text** — mesaje lungi cu 1 fapt ascuns printre noise
6. **Cifre + estimări** — teste cu numere exacte vs "cam", "vreo", "undeva pe la"
7. **Emoție wrapper** — aceeași informație spusă calm vs spusă frustrat → aceeași decizie
8. **Duplicat semantic** — reformulare a unei memorii existente → nu re-salva
9. **Update vs New** — info pe aceeași entitate: update existent vs create nou
10. **Temporal decay** — info cu "acum 3 zile" vs "de obicei" vs "mereu" → durabilitate diferită
11. **Multi-fact messages** — mesaje care conțin 2-3 fapte din categorii diferite
12. **Cross-language** — user care mixează română + engleză ("am un meeting maine cu clientul")
13. **Typo resilience** — "detergenti" vs "detergentu" vs "detergenții" vs "detergentzii"
14. **Task-memory boundary** — când acțiunea e task dar contextul e memorie
15. **Sarcasm filter** — informație reală mascată în sarcasm trebuie încă extrasă

### Coverage matrix recomandată:

| Categorie RAG | Teste save | Teste don't save | Borderline | Dedup | Total minim |
|---------------|-----------|-------------------|------------|-------|-------------|
| business_profile | 5+ | 2+ | 2+ | 2+ | 11 |
| customer_market | 5+ | 2+ | 2+ | 2+ | 11 |
| growth_context | 4+ | 2+ | 1+ | 2+ | 9 |
| entrepreneur_profile | 4+ | 2+ | 1+ | 1+ | 8 |
| relationship_history | 5+ | 3+ | 2+ | 2+ | 12 |
| operational_patterns | 5+ | 2+ | 1+ | 1+ | 9 |
| preferences | 4+ | 2+ | 2+ | 2+ | 10 |
| constraints | 4+ | 2+ | 1+ | 1+ | 8 |

---

## Suite NAT — User-Authored Natural Language Tests
**Source:** Manual test suite de la user, mesaje reale de antreprenor
**Note:** Testele de mai jos sunt complementare suitelor R1-R12. Duplicatele semantice cu teste existente sunt marcate cu `[DEDUP: MEM-XX]`.

### NAT-A: Relații, oameni, follow-up-uri

#### MEM-NAT-001: Prescurtare "am vb" + deadline
- **Input:** `am vb cu Mihai si vrea oferta pana luni`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** "am vb" = "am vorbit", prescurtare WhatsApp clasică
- **Reasoning:** Relație + cerință clară + deadline. Trebuie extras: Mihai a cerut oferta până luni.

#### MEM-NAT-002: Follow-up cu "să îl caut"
- **Input:** `m-am vazut azi cu ion si a zis sa il caut peste o luna`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** Follow-up important, interacțiune + timeline
- **Reasoning:** Memorat atât interacțiunea cât și follow-up-ul
- **[DEDUP NOTE: Similar MEM-01 din suita originală, dar formulare diferită]**

#### MEM-NAT-003: Constrângere furnizor
- **Input:** `ana a zis ca vinerea livreaza greu`
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Why real:** Constrângere operațională stabilă despre furnizor
- **[DEDUP NOTE: Echivalent MEM-04 din suita originală. Acoperire validă.]**

#### MEM-NAT-004: "Tipul de la detergenți" — referință prin funcție
- **Input:** `tipul de la detergenti iar a zis ca marti e mai ok pt el`
- **Expected:** SAVE
- **Type:** fact
- **Category:** operational_patterns
- **Why real:** "tipul de la detergenți" = entitate identificabilă prin rol, nu prin nume
- **Reasoning:** Pattern disponibilitate furnizor. Salvabil chiar fără nume exact.

#### MEM-NAT-005: Insight relațional
- **Input:** `mihai raspunde greu daca ii scriu seara`
- **Expected:** SAVE
- **Type:** insight
- **Category:** relationship_history
- **Why real:** Observație repetabilă, utilă pentru timing-ul comunicării

#### MEM-NAT-006: Preferință relațională canal comunicare
- **Input:** `cu ion mai bine vorbesc la telefon decat pe whatsapp`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** Preferință de canal per persoană, utilă la follow-up

#### MEM-NAT-007: Acord temporal "după Paște"
- **Input:** `m-am inteles cu mihai sa revenim dupa paste`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** Acord concret cu referință temporală (Paște)

#### MEM-NAT-008: Pronume ambiguu + evaluare slabă
- **Input:** `am vb cu el si pare interesat dar se misca greu`
- **Expected:** AMBIGUOUS
- **Why real:** "el" fără context clar, "pare interesat" e slab
- **Reasoning:** Dacă contextul conversației identifică "el" → SAVE. Altfel → prea ambiguu.

### NAT-B: Preferințe personale / stil de lucru

#### MEM-NAT-009: Preferință reminder timing
- **Input:** `mai bine imi dai remindere dimineata ca dupa aia intru in haos`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Why real:** Preferință clară exprimată foarte natural, cu justificare ("intru în haos")

#### MEM-NAT-010: Window de productivitate
- **Input:** `eu de obicei raspund mai bine dimineata, dupa 6 nu prea mai procesez`
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Why real:** Pattern stabil de funcționare personală: productiv dimineața, drop-off după 18:00

#### MEM-NAT-011: Preferință task load
- **Input:** `nu-mi pune multe chestii deodata ca ma pierd`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Why real:** Preferință de interaction design — vrea puține task-uri simultan

#### MEM-NAT-012: Preferință format comunicare
- **Input:** `daca nu scrii scurt imi prind greu capul`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Why real:** Preferință stabilă: mesaje scurte. Foarte relevant pentru cum răspunde botul.

#### MEM-NAT-013: Stare temporară — NU salva
- **Input:** `azi sunt obosit rau`
- **Expected:** DO NOT SAVE
- **Why real:** Volatile, fără valoare pe termen lung
- **[DEDUP NOTE: Similar MEM-47 "azi a fost o zi grea"]**

#### MEM-NAT-014: Self-insight procrastinare
- **Input:** `in general daca nu fac azi, maine uit`
- **Expected:** SAVE
- **Type:** insight
- **Category:** entrepreneur_profile
- **Why real:** Pattern personal relevant: nu amâna, risc de uitare

### NAT-C: Business profile / stadiu / constrângeri

#### MEM-NAT-015: Stadiu business — în setup
- **Input:** `suntem inca la inceput cu curatenia, nu e nimic stabil momentan`
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Why real:** Stadiu clar: business în setup, instabil
- **[DEDUP NOTE: Similar MEM-02 dar cu nuanță diferită]**

#### MEM-NAT-016: Stadiu alternativ
- **Input:** `pe curatenie inca ne chinuim, avem putini clienti`
- **Expected:** SAVE
- **Type:** fact
- **Category:** growth_context
- **Why real:** Stadiu + problemă: puțini clienți pe curățenie

#### MEM-NAT-017: Comparație între verticale
- **Input:** `de fapt pe airbnb merge mai bine decat pe curatenie`
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Why real:** Comparație între verticalele businessului — foarte util pentru context

#### MEM-NAT-018: Structură operațională — solo
- **Input:** `momentan totul sta cam in mine, nu prea am oameni`
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Why real:** Constrângere structurală: one-man show, lipsă personal

### NAT-D: Probleme de creștere / insight-uri

#### MEM-NAT-019: Insight — timp de răspuns
- **Input:** `cred ca pierdem clienti fiindca raspundem prea greu`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Why real:** Ipoteză de business valoroasă
- **[DEDUP NOTE: Echivalent MEM-05, dar validează variația]**

#### MEM-NAT-020: Insight — sensibilitate la preț
- **Input:** `am impresia ca lumea renunta cand vede pretul`
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Why real:** "am impresia" = incert dar suficient de util. Pattern de piață.

#### MEM-NAT-021: Insight — lead follow-up gap
- **Input:** `parca la noi problema e ca nu urmarim lead-urile pana la capat`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Why real:** "parcă" dar insight operațional foarte specific

#### MEM-NAT-022: Prea vag — ceva se rupe
- **Input:** `nu stiu exact, dar ceva sigur se rupe dupa prima discutie`
- **Expected:** AMBIGUOUS
- **Why real:** Posibil insight dar zero specificitate. Ce se rupe? Unde?

#### MEM-NAT-023: Insight — poziționare piață
- **Input:** `majoritatea vor repede si ieftin, si noi nu le dam nici una nici alta`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Why real:** Sintetizează poziționare vs cererea pieței. Foarte valoros.

### NAT-E: Advice / reguli propuse

#### MEM-NAT-024: Advice — verificare stoc
- **Input:** `ar trebui sa verificam stocul in fiecare luni, altfel iar ramanem fara`
- **Expected:** SAVE
- **Type:** advice
- **Category:** operational_patterns
- **Why real:** Regulă operațională propusă + motivație
- **[DEDUP NOTE: Similar MEM-06 dar cu motivație explicită "altfel iar rămânem fără"]**

#### MEM-NAT-025: Advice — aprovizionare preventivă
- **Input:** `mai bine luam detergent mereu cu 2 zile inainte sa se termine`
- **Expected:** SAVE
- **Type:** advice
- **Category:** operational_patterns
- **Why real:** Recomandare concretă cu timing specific

#### MEM-NAT-026: Advice — comunicare cu client
- **Input:** `cred ca ar fi bine sa-i scriem lui mihai mai scurt`
- **Expected:** SAVE
- **Type:** advice
- **Category:** relationship_history
- **Why real:** Recomandare relațională specifică per persoană

### NAT-F: Ce NU trebuie salvat — filler conversațional

#### MEM-NAT-027 → MEM-NAT-032: Filler puri
| ID | Input | Expected |
|----|-------|----------|
| MEM-NAT-027 | `ok` | DO NOT SAVE |
| MEM-NAT-028 | `bine` | DO NOT SAVE |
| MEM-NAT-029 | `mersi` | DO NOT SAVE |
| MEM-NAT-030 | `esti?` | DO NOT SAVE |
| MEM-NAT-031 | `pfai` | DO NOT SAVE |
| MEM-NAT-032 | `ce zi...` | DO NOT SAVE |

**[DEDUP NOTE: MEM-NAT-027 = MEM-09, MEM-NAT-029 ≈ MEM-10, MEM-NAT-030 = MEM-11. Celelalte sunt noi.]**

#### MEM-NAT-033: Stare fără valoare
- **Input:** `am chef de nimic azi`
- **Expected:** DO NOT SAVE
- **Why real:** Stare trecătoare, volatilă

### NAT-G: Mesaje mixte — util + zgomot

#### MEM-NAT-034: Emoție + fapt deadline
- **Input:** `ba deci azi m-am enervat rau, dar ideea e ca mihai vrea oferta pana luni`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** Prima parte e zgomot emoțional, a doua e fapt clar
- **Reasoning:** Trebuie extras DOAR: Mihai vrea oferta până luni

#### MEM-NAT-035: Noise + fapt furnizor
- **Input:** `n-am mai apucat nimic azi, dar ana a zis clar ca marti poate livra`
- **Expected:** SAVE
- **Type:** fact
- **Category:** operational_patterns
- **Why real:** Prima parte irelevantă, a doua = info logistică

#### MEM-NAT-036: Noise personal + insight business
- **Input:** `eu iar sunt praf, in schimb cred ca pierdem lead-uri ca nu revenim`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Why real:** "iar sunt praf" = noise, "pierdem lead-uri ca nu revenim" = insight valoros

### NAT-H: Duplicare și consolidare

#### MEM-NAT-037: Duplicat semantic — aceeași info reformulată
- **Precondition:** Memorie existentă: `Mihai vrea oferta până luni`
- **Input:** `sa nu uit, mihai a zis iar ca oferta e pt luni`
- **Expected:** DO NOT SAVE (duplicat semantic) sau save minimal fără duplicare
- **Dedup note:** Cosine similarity probabil > 0.90 cu memorie existentă

#### MEM-NAT-038: Duplicat preferință
- **Precondition:** Memorie: `prefer remindere dimineața`
- **Input:** `mai bine imi dai remindere dimineata, ca atunci le vad`
- **Expected:** DO NOT SAVE (aceeași preferință, altă formulare)
- **Dedup note:** Adaugă doar o nuanță minoră ("ca atunci le vad")

#### MEM-NAT-039: Extindere pe entitate existentă
- **Precondition:** Memorie: `Ana livrează greu vinerea`
- **Input:** `de fapt si joia se misca greu`
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Why real:** NU e duplicat — extinde informația existentă (joi + vineri)

### NAT-I: Contradicții / actualizări

#### MEM-NAT-040: Schimbare preferință timing
- **Precondition:** Memorie: `prefer remindere dimineața`
- **Input:** `de acum mai bine dupa pranz, dimineata e haos`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Why real:** Override clar. Noua preferință trebuie să domine.
- **Contradiction note:** Invalidează "prefer dimineața"
- **[DEDUP NOTE: Similar MEM-145, testează din perspectivă diferită]**

#### MEM-NAT-041: Corecție deadline
- **Precondition:** Memorie: `Mihai vrea oferta până luni`
- **Input:** `nu mai e pe luni, a zis miercuri`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** Corecție explicită, critică operațional

#### MEM-NAT-042: Invalidare follow-up
- **Precondition:** Memorie: `Ion a spus să fie sunat peste o lună`
- **Input:** `gata, am vorbit deja cu ion, nu mai are rost follow-up-ul ala`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** Invalidează semantic memoria veche, follow-up rezolvat

### NAT-J: Ambiguități reale

#### MEM-NAT-043: "Ăla de la apartament"
- **Input:** `ala de la apartament vrea sa revenim`
- **Expected:** AMBIGUOUS
- **Why real:** "ăla" + "apartament" (care?) = prea vag fără context

#### MEM-NAT-044: Pronume + zero info
- **Input:** `am vorbit cu ea si a ramas cum am zis`
- **Expected:** AMBIGUOUS / DO NOT SAVE
- **Why real:** "ea" neclar, "cum am zis" = referință la ceva necunoscut

#### MEM-NAT-045: Advice prea vag
- **Input:** `cred ca e ok sa facem altfel pe viitor`
- **Expected:** AMBIGUOUS
- **Why real:** Ce altfel? Ce pe viitor? Zero specificitate.

#### MEM-NAT-046: Advice vag dar direcțional
- **Input:** `poate ar trebui sa fim mai seriosi cu lead-urile`
- **Expected:** SAVE
- **Type:** advice
- **Category:** growth_context
- **Why real:** "poate" dar suficient de direcțional ca advice operațional

### NAT-K: Întâlniri și istoric relațional

#### MEM-NAT-047: Întâlnire + commitment
- **Input:** `m-am vazut cu mihai azi la cafea si am ramas ca ii trimit draftul`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Why real:** Întâlnire + promisiune de livrabil

#### MEM-NAT-048: Furnizor indisponibil
- **Input:** `am vb cu furnizorul si zice ca sapt asta nu poate`
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Why real:** Constrângere temporală de la furnizor

#### MEM-NAT-049: Amânare + evaluare
- **Input:** `cu ion tot amanam, dar omul inca pare interesat`
- **Expected:** SAVE
- **Type:** insight
- **Category:** relationship_history
- **Why real:** Combină istoric (amânări) + judecată (încă interesat)

#### MEM-NAT-050: Pattern relațional
- **Input:** `mihai e genul care daca nu ii raspunzi repede, dispare`
- **Expected:** SAVE
- **Type:** insight
- **Category:** relationship_history
- **Why real:** Pattern de comportament per persoană, critic pentru timing follow-up

### NAT-L: Profil antreprenorial

#### MEM-NAT-051: Preferință structură task
- **Input:** `eu functionez mai bine daca am 2-3 lucruri clare, nu o lista lunga`
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Why real:** Self-awareness operațional, relevant pentru cum prezintă task-urile botul

#### MEM-NAT-052: Self-insight multitasking
- **Input:** `cand ma iau cu multe deodata, nu mai termin nimic`
- **Expected:** SAVE
- **Type:** insight
- **Category:** entrepreneur_profile
- **Why real:** Pattern validat: multitasking = ineficiență

#### MEM-NAT-053: Pattern procrastinare
- **Input:** `de obicei aman ce implica telefoane`
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Why real:** Categorie de task pe care le amână = util pentru nudges

#### MEM-NAT-054: Preferință negativă — repetiții
- **Input:** `nu-mi place sa fiu batut la cap cu acelasi lucru`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Why real:** Boundary clar: nu repeta remindere/task-uri

### NAT-M: Piață / clienți / comportament comercial

#### MEM-NAT-055: Insight client — sensibilitate preț
- **Input:** `astia se uita primul rand la pret`
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Why real:** "ăștia" = clienții în general. Insight de piață clar.

#### MEM-NAT-056: Insight conversie
- **Input:** `multi intreaba, putini chiar se hotarasc`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Why real:** Funnel insight: multe întrebări, puține conversii

#### MEM-NAT-057: Insight sursă clienți
- **Input:** `clientii care vin din recomandari inchid mai usor`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Why real:** Canal de achiziție performant: recomandări

#### MEM-NAT-058: Insight profil client problematic
- **Input:** `cei care vor ieftin de obicei fac si figuri`
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Why real:** Corelație negativă: preț mic → clienți dificili

### NAT-N: Perechi aproape identice — save vs not save

#### MEM-NAT-059 / MEM-NAT-060: Fapt concret vs intenție vagă
| ID | Input | Expected | De ce |
|----|-------|----------|-------|
| MEM-NAT-059 | `mihai vrea oferta pana luni` | SAVE (fact) | Fapt concret, persoană + deadline |
| MEM-NAT-060 | `tre sa vad eu cu mihai` | AMBIGUOUS / DO NOT SAVE | Prea vag, zero commitment concret |

#### MEM-NAT-061 / MEM-NAT-062: Preferință explicită vs afirmație neancorat
| ID | Input | Expected | De ce |
|----|-------|----------|-------|
| MEM-NAT-061 | `prefer remindere dimineata` | SAVE (fact/preferences) | Preferință explicită |
| MEM-NAT-062 | `dimineata e mai ok` | AMBIGUOUS | Mai ok pentru ce? Neancorat. |

#### MEM-NAT-063 / MEM-NAT-064: Pattern durabil vs eveniment izolat
| ID | Input | Expected | De ce |
|----|-------|----------|-------|
| MEM-NAT-063 | `ana livreaza greu vinerea` | SAVE (fact/constraints) | Pattern durabil |
| MEM-NAT-064 | `ana azi iar a mers greu` | AMBIGUOUS | Poate fi eveniment izolat |

### NAT-BORDER: Borderline cases adiționale

#### BORDER-NAT-01: "Cred că" + persoană
- **Input:** `cred ca mihai e interesat`
- **Expected:** AMBIGUOUS
- **Dilema:** Insight slab? Sau prea puțin?

#### BORDER-NAT-02: "Parcă" + piață
- **Input:** `parca lumea fuge cand aude pretul`
- **Expected:** SAVE (insight / customer_market)
- **Dilema:** "Parcă" = incert, dar pattern suficient de valoros

#### BORDER-NAT-03: Metaforă = preferință
- **Input:** `eu dimineata sunt mai om`
- **Expected:** SAVE (fact / entrepreneur_profile)
- **Dilema:** "Mai om" e metaforă, dar sensul e clar: funcționează mai bine dimineața

#### BORDER-NAT-04: Pronume + context latent
- **Input:** `am vb cu el si ramane cum stii`
- **Expected:** AMBIGUOUS
- **Dilema:** Depinde total de context conversație anterioară

#### BORDER-NAT-05: Advice sau insight?
- **Input:** `cred ca ar trebui sa-l las mai moale pe mihai`
- **Expected:** SAVE (advice sau insight / relationship_history)
- **Dilema:** E sfat auto-dat? Sau observație? Ambele sunt salvabile.

---

## DEDUP MAP — Cross-reference între suite

| Test NAT | Echivalent existent | Notă |
|----------|-------------------|------|
| MEM-NAT-002 | MEM-01 (suita originală) | Formulare diferită, acoperire validă |
| MEM-NAT-003 | MEM-04, MEM-76 | Constrângere furnizor, 3 variante |
| MEM-NAT-013 | MEM-47, MEM-107 | Stare temporară, validă ca duplicat cross-check |
| MEM-NAT-015 | MEM-02 | Stadiu business, nuanță diferită |
| MEM-NAT-019 | MEM-05, MEM-134 | Insight pierdere clienți, 3 variante |
| MEM-NAT-024 | MEM-06, MEM-78 | Advice stocuri, validă ca variație |
| MEM-NAT-027 | MEM-09 | "ok" — duplicat pur, cross-check |
| MEM-NAT-029 | MEM-10 | "mersi" ≈ "mulțumesc" |
| MEM-NAT-030 | MEM-11 | "ești?" — duplicat pur |
| MEM-NAT-037 | MEM-141 | Dedup semantic, validă ca variație |
| MEM-NAT-038 | MEM-145 | Dedup preferință, validă |
| MEM-NAT-040 | MEM-145 | Override preferință, perspectivă diferită |

---

---

## Suite SCEN — Scenarii Narative (Mini-Compuneri)
**Source:** User-authored narrative scenarios — mesaje lungi, realiste, cum ar vorbi un antreprenor pe WhatsApp
**Focus:** Extragere multi-fact din text narativ, separare zgomot de info durabilă, corecții cross-scenariu, dedup cross-scenariu
**Note:** Scenariile 1-6 + 10-11 + 14-15 formează un **arc narativ complet despre Ana** — testează inclusiv evoluția memoriei în timp.

### SCEN-01: Ana — 5 apartamente, test pe 1
- **Input:** `Azi m-am văzut cu Ana. Mi-a spus că are 5 apartamente în total, dar nu vrea să mi le dea pe toate din prima. Vrea mai întâi să lucrăm pe un singur apartament, să vadă cum ne mișcăm și dacă e mulțumită de calitate și de punctualitate. Dacă totul merge bine, de luna viitoare vrea să ne dea și restul. Mi-a zis că pentru ea contează mult să nu existe întârzieri și să comunicăm repede dacă apare vreo problemă.`
- **Expected:** SAVE (multiple writes)
- **Expected memory_writes:**
  - `{type: "fact", category: "customer_market", content: "Ana are 5 apartamente"}`
  - `{type: "fact", category: "relationship_history", content: "Ana vrea să înceapă colaborarea pe 1 apartament ca test"}`
  - `{type: "fact", category: "customer_market", content: "Dacă e mulțumită, de luna viitoare extinde colaborarea"}`
  - `{type: "fact", category: "preferences", content: "Ana apreciază punctualitatea și comunicarea rapidă la probleme"}` (din perspectiva ei ca client)
- **Durability:** seasonal (detaliile pot evolua)
- **Extraction challenge:** 4 fapte distincte din 1 paragraf narativ. Zero zgomot.

### SCEN-02: Ana — formulare colocvială, aceeași poveste
- **Input:** `Am stat azi de vorbă cu Ana. Are 5 apartamente, dar a zis că nu vrea să riște direct cu toate. Mai bine începem cu unul, vede cum lucrăm, și dacă îi place, de luna viitoare ne bagă și la celelalte. A insistat destul de mult pe ideea că vrea seriozitate și să nu dispară omul dacă apare vreo încurcătură.`
- **Expected:** SAVE (aceleași fapte ca SCEN-01, formulare diferită)
- **Expected memory_writes:**
  - `{type: "fact", category: "customer_market", content: "Ana are 5 apartamente"}`
  - `{type: "fact", category: "relationship_history", content: "Onboarding gradual: 1 apartament la început"}`
  - `{type: "fact", category: "customer_market", content: "Extindere posibilă luna viitoare"}`
  - `{type: "insight", category: "relationship_history", content: "Ana a avut experiențe proaste cu echipe care dispăreau la probleme"}`
- **Dedup note:** Dacă SCEN-01 deja procesat → SCEN-02 ar trebui detectat ca duplicat semantic
- **Test purpose:** Verifică că reformularea nu produce duplicare

### SCEN-03: Ana — detalii comerciale + condiție
- **Input:** `M-am întâlnit cu Ana și am discutat despre colaborare. Ea administrează 5 apartamente și mi-a spus că e interesată să lucreze cu noi, dar vrea să testeze întâi serviciul pe un singur apartament. Dacă vede că lucrurile sunt făcute bine, că nu trebuie să stea după noi și că standardul e constant, de luna viitoare vrea să ne dea încă două apartamente, iar apoi posibil și restul.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "fact", category: "customer_market", content: "Ana administrează 5 apartamente"}`
  - `{type: "fact", category: "relationship_history", content: "Test inițial pe 1 apartament"}`
  - `{type: "fact", category: "customer_market", content: "Plan extindere: +2 luna viitoare, restul ulterior"}`
  - `{type: "fact", category: "preferences", content: "Condiție: calitate constantă, autonomie, fără urmărire"}`
- **New info vs SCEN-01/02:** Detaliu specific: extinderea e +2, nu "toate". Condiție mai nuanțată.
- **Dedup note:** Parțial overlap cu SCEN-01/02, dar conține info nouă (2 apartamente, nu toate)

### SCEN-04: Ana — CORECȚIE
- **Input:** `Revin cu o corecție legată de Ana. Nu sunt 5 apartamente, sunt 4. Și nu vrea de luna viitoare să ni le dea pe toate, ci doar încă unul, pe lângă primul. Restul zice că le discutăm mai târziu, după ce vede cum merge treaba în primele săptămâni.`
- **Expected:** SAVE (update/override)
- **Expected memory_writes:**
  - `{type: "fact", category: "customer_market", content: "CORECȚIE: Ana are 4 apartamente, nu 5"}`
  - `{type: "fact", category: "relationship_history", content: "CORECȚIE: extinderea e doar +1 apartament, nu toate"}`
  - `{type: "fact", category: "relationship_history", content: "Restul apartamentelor se discută ulterior"}`
- **Contradiction note:** Override pe SCEN-01/02/03: 5→4, "toate"→"doar +1"
- **Critical test:** Verifică că noile fapte au prioritate peste versiunile anterioare la retrieval
- **Durability:** seasonal

### SCEN-05: Ana — preferințe detaliate
- **Input:** `Ana mi-a mai spus ceva important. Pentru ea nu e suficient doar să fie curat, ci vrea și poze după fiecare intervenție, măcar la început, până capătă încredere. În plus, preferă să fie anunțată din timp dacă există vreo întârziere, nu în ultimul moment. Mi-a zis clar că lipsa de comunicare a fost problema principală cu echipa anterioară.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "fact", category: "preferences", content: "Ana vrea poze după fiecare intervenție, cel puțin la început"}`
  - `{type: "fact", category: "preferences", content: "Ana preferă notificare din timp pentru întârzieri, nu last-minute"}`
  - `{type: "fact", category: "relationship_history", content: "Problema cu echipa anterioară a Anei: lipsa de comunicare"}`
- **New info:** Totul e informație nouă, nu overlap cu SCEN-01-04
- **Durability:** stable (preferințe de lucru)

### SCEN-06: Ana — limbaj dezordonat + incertitudine
- **Input:** `Cu Ana cred că e oportunitate bună. Are mai multe apartamente, 5 parcă, dar nu vrea din prima să le dea pe toate. Zicea să începem pe unul și vede ea după. Ideea e că la ea contează mult să nu se repete ce a pățit înainte, că oamenii făceau treaba ok uneori, dar dispăreau când era ceva urgent.`
- **Expected:** SAVE (cu marcaj incertitudine)
- **Expected memory_writes:**
  - `{type: "fact", category: "customer_market", content: "Ana are ~5 apartamente (nesigur — 'parcă')"}`
  - `{type: "fact", category: "relationship_history", content: "Onboarding treptat: 1 apartament la început"}`
  - `{type: "insight", category: "relationship_history", content: "Ana a avut experiențe proaste: echipe care dispăreau la urgențe"}`
- **Incertitude test:** "5 parcă" — sistemul trebuie să marcheze incertitudinea, nu să o transforme în fapt sigur
- **Dedup note:** Heavy overlap cu SCEN-01/02 dar cu nuanță de incertitudine
- **Cross-reference cu SCEN-04:** Dacă SCEN-04 deja procesat (corecție: 4), atunci "5 parcă" e deja outdated

### SCEN-07: Mihai — ofertă + obiecții
- **Input:** `Am vorbit cu Mihai despre ofertă. E interesat, dar mi-a zis că prețul i se pare puțin mare pentru început. Totuși, nu a zis nu, ci că ar vrea să vadă exact ce include și cât de repede ne mișcăm. Mi-a dat impresia că dacă îi răspund clar și îi explic concret ce primește, sunt șanse bune să închidem.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "fact", category: "relationship_history", content: "Mihai este interesat dar are obiecție de preț"}`
  - `{type: "fact", category: "relationship_history", content: "Mihai vrea claritate pe ce include serviciul"}`
  - `{type: "insight", category: "customer_market", content: "Viteza de răspuns și claritate pot închide deal-ul cu Mihai"}`
- **Durability:** seasonal

### SCEN-08: Furnizor — constrângere operațională
- **Input:** `Am vorbit cu Ana de la detergenți și mi-a spus că vinerea livrează mai greu și uneori nici nu mai garantează ora. Mi-a recomandat să dau comanda cel târziu miercuri dacă vreau să fiu sigur că ajunge la timp pentru weekend. Asta explică de ce tot rămânem descoperiți spre final de săptămână.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "fact", category: "constraints", content: "Ana de la detergenți livrează greu vinerea, nu garantează ora"}`
  - `{type: "advice", category: "operational_patterns", content: "Comandă detergenți cel târziu miercuri pentru livrare sigură de weekend"}`
  - `{type: "insight", category: "operational_patterns", content: "Lipsa de stoc spre weekend e cauzată de livrarea incertă de vineri"}`
- **Note:** "Ana de la detergenți" ≠ "Ana cu apartamente" — entități diferite!
- **Disambiguation test:** Sistemul trebuie să facă diferența între cele două Ana

### SCEN-09: Client nou — Raluca, scalare
- **Input:** `M-am văzut cu un client nou, Raluca. Are două locații acum, dar dacă merge bine cu prima locație, din iunie vrea să ne dea și a treia proprietate pe care urmează să o finalizeze. Mi-a spus că pentru ea primele două săptămâni sunt decisive. Dacă vede că suntem serioși și consecvenți, atunci extinde fără probleme.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "fact", category: "customer_market", content: "Raluca — client nou, are 2 locații active"}`
  - `{type: "fact", category: "relationship_history", content: "Raluca poate extinde la a 3-a locație din iunie"}`
  - `{type: "fact", category: "preferences", content: "Criterii Raluca: seriozitate și consecvență, primele 2 săptămâni decisive"}`
- **Durability:** seasonal
- **Pattern match:** Foarte similar cu Ana (test → extindere). Testează dacă sistemul generalizează pattern-ul de onboarding.

### SCEN-10: Follow-up cu Ana
- **Input:** `Am vorbit din nou cu Ana și mi-a zis să revin cu un mesaj peste două săptămâni, după ce verifică disponibilitatea pentru primul apartament. Nu vrea să o bat la cap între timp, dar vrea să ținem legătura. A zis explicit că dacă primul test merge bine, sunt șanse mari să continue cu noi.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "fact", category: "relationship_history", content: "Follow-up cu Ana peste 2 săptămâni"}`
  - `{type: "fact", category: "preferences", content: "Ana nu vrea contact prea frecvent între sesiuni de follow-up"}`
  - `{type: "fact", category: "relationship_history", content: "Potențial mare de colaborare continuă dacă testul merge bine"}`
- **Action hint:** Ar putea sugera reminder peste 2 săptămâni, dar nu creează automat
- **Durability:** seasonal (follow-up-ul expiră)

### SCEN-11: Ana — contradicție / update major
- **Input:** `Legat de Ana, de fapt nu mai are 5 apartamente active. Mi-a spus că momentan doar 3 sunt în circuit, celelalte două nu sunt încă gata. Deci pentru colaborare realist vorbind, în perioada următoare discutăm despre maximum 3, nu 5.`
- **Expected:** SAVE (override)
- **Expected memory_writes:**
  - `{type: "fact", category: "customer_market", content: "UPDATE: Ana are doar 3 apartamente active (nu 5). Celelalte 2 nu sunt gata."}`
  - `{type: "fact", category: "relationship_history", content: "Colaborarea pe termen scurt: max 3 apartamente"}`
- **Contradiction chain:** SCEN-01 zice 5 → SCEN-04 zice 4 → SCEN-11 zice 3 active
- **Critical test:** La retrieval, query "câte apartamente are Ana?" trebuie să returneze 3, nu 5 sau 4
- **Durability:** seasonal

### SCEN-12: Pattern de client — insight generalizat
- **Input:** `Din ce observ la oamenii ca Mihai, nu se blochează neapărat în preț, ci în faptul că nu au încredere de la început. Dacă simt că trebuie să stea după tine, devin reci. Dacă le dai repede răspuns, clar și fără povești, se încălzesc mai repede.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "insight", category: "customer_market", content: "Clienții tip Mihai se blochează pe încredere, nu pe preț. Viteza și claritatea răspunsului contează mai mult."}`
- **Note:** Insight generalizat din experiența cu Mihai, aplicabil la alte lead-uri
- **Durability:** stable (pattern de piață)

### SCEN-13: Despre mine — stil personal
- **Input:** `Mi-am dat seama că atunci când am multe lucruri mici deodată, nu mai termin nimic cum trebuie. Pentru mine merge mai bine dacă am 2-3 priorități clare și restul stau în așteptare. Dacă îmi dai multe lucruri la grămadă, mă pierd.`
- **Expected:** SAVE
- **Expected memory_writes:**
  - `{type: "fact", category: "entrepreneur_profile", content: "Funcționează cel mai bine cu 2-3 priorități clare, nu task-uri multe simultane"}`
  - `{type: "insight", category: "entrepreneur_profile", content: "Overload-ul de task-uri mici reduce calitatea execuției"}`
- **Cross-ref:** Foarte similar cu MEM-NAT-051/052. Validare de consistență.
- **Durability:** stable (preferință stabilă de lucru)

### SCEN-14: Mesaj cu zgomot + fapte
- **Input:** `Azi a fost haos total și n-am apucat mare lucru, dar ideea importantă e că Ana pare hotărâtă să înceapă cu noi pe un apartament. Nu vrea să se arunce direct cu toate cele 5, dar dacă o lăsăm mulțumită, de luna viitoare se uită serios să ne dea mai multe.`
- **Expected:** SAVE (extrage doar faptele)
- **Expected memory_writes:**
  - `{type: "fact", category: "relationship_history", content: "Ana hotărâtă să înceapă colaborarea pe 1 apartament"}`
  - `{type: "fact", category: "customer_market", content: "Ana are 5 apartamente, potențial extindere luna viitoare"}`
- **Noise filter:** "Azi a fost haos total și n-am apucat mare lucru" = NU se salvează
- **Dedup note:** Heavy overlap cu SCEN-01/02, plus contradicts SCEN-04 (5 vs 4) și SCEN-11 (3 active)

### SCEN-15: Aproape identic dar prea vag
- **Input:** `Am vorbit cu Ana și pare ok. Vedem.`
- **Expected:** DO NOT SAVE
- **Why real:** Pare conversație, dar zero fapte concrete
- **Reasoning:** "pare ok" + "vedem" = zero info durabilă, zero detalii specifice
- **Test purpose:** Verifică că nu orice mesaj cu un nume produce memory write

---

### SCEN-RETRIEVAL: Teste de retrieval post-scenarii

Aceste teste se rulează DUPĂ ce scenariile SCEN-01 → SCEN-15 au fost procesate. Verifică coerența memoriei agregate.

#### SCEN-RET-01: Ce știi despre Ana?
- **Input:** `ce știi despre Ana?`
- **Expected intent:** search_memory
- **Expected retrieval:** Informații coerente despre Ana (client, apartamente, preferințe, istoric)
- **Must include:** nr. apartamente (3 active — din SCEN-11), preferințe (poze, comunicare — din SCEN-05), follow-up (2 săpt — din SCEN-10)
- **Must NOT include:** "5 apartamente" ca fapt curent (depășit de SCEN-04 și SCEN-11)
- **Must NOT confuse:** Ana (client) cu Ana de la detergenți (furnizor, SCEN-08)

#### SCEN-RET-02: Câte apartamente are Ana?
- **Input:** `câte apartamente are Ana?`
- **Expected intent:** search_memory
- **Expected response:** 3 active (din SCEN-11), cu mențiunea că inițial erau 5/4 dar s-a corectat
- **Contradiction chain test:** 5 (SCEN-01) → 4 (SCEN-04) → 3 active (SCEN-11)

#### SCEN-RET-03: Cum vrea Ana să înceapă?
- **Input:** `cum vrea Ana să înceapă colaborarea?`
- **Expected:** Test pe 1 apartament, apoi extindere graduală

#### SCEN-RET-04: Ce contează pentru Ana?
- **Input:** `ce contează pentru Ana într-o colaborare?`
- **Expected:** Punctualitate, comunicare rapidă, poze post-intervenție, notificare din timp la întârzieri, seriozitate

#### SCEN-RET-05: Ce știi despre Mihai?
- **Input:** `ce știi despre Mihai?`
- **Expected:** Interesat, obiecție preț, vrea claritate, viteza contează
- **Must NOT confuse:** Cu Mihai din alte teste (dacă există)

#### SCEN-RET-06: Obiecția lui Mihai
- **Input:** `care e obiecția principală a lui Mihai?`
- **Expected:** Prețul i se pare mare, dar nu a zis nu — vrea claritate pe ce include

#### SCEN-RET-07: Tip client Mihai
- **Input:** `ce tip de client pare Mihai?`
- **Expected:** Se blochează pe încredere nu preț, răspuns rapid îl deblochează (din SCEN-12)

#### SCEN-RET-08: Despre mine
- **Input:** `ce ai observat despre cum lucrez eu?`
- **Expected:** Funcționează cu 2-3 priorități, overload reduce execuția, amână apelurile telefonice (din SCEN-13 + MEM-NAT-053)

#### SCEN-RET-09: Organizare task-uri
- **Input:** `cum ai organiza task-urile pentru mine?`
- **Expected:** Max 2-3 priorități, nu liste lungi, dimineața e mai bun (din SCEN-13 + MEM-NAT-009/010/051)

#### SCEN-RET-10: Ana de la detergenți vs Ana client
- **Input:** `ce știi despre Ana de la detergenți?`
- **Expected:** Livrează greu vinerea, comandă până miercuri (din SCEN-08)
- **Must NOT confuse:** Cu Ana care are apartamente

---

---

## Suite REAL — Typo-uri, Prescurtări, Limbaj Murdar
**Source:** User-authored — mesaje tip Telegram cu typo-uri, prescurtări, fără diacritice
**Focus:** Reziliență la input neglijent, extragere semantică din haos lingvistic

#### REAL-001: Prescurtare maximă
- **Input:** `am vb cu ana, are 5 ap si a zis ca mai bn sa incepem cu 1 sa vada cum lucram`
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Extraction:** Ana are 5 apartamente, vrea să înceapă cu 1, vrea să vadă calitatea
- **Why real:** "am vb", "ap", "mai bn" — prescurtări WhatsApp clasice

#### REAL-002: Continuare fără subiect
- **Input:** `daca e ok de luna viit zice ca ni le da si pe celelalte`
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Extraction:** Dacă testul merge, extinde colaborarea de luna viitoare
- **Note:** Depinde de context anterior (Ana). Fără context → AMBIGUOUS.

#### REAL-003: Prescurtare "cv" + preferințe client
- **Input:** `ana a zis ca pt ea conteaza sa nu intarziem si sa raspundem repede daca e cv`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Extraction:** Ana apreciază punctualitate + comunicare rapidă la probleme
- **Why real:** "pt", "cv" = prescurtări, fără diacritice

#### REAL-004: "da" în loc de "dar"
- **Input:** `mihai pare interesat da il cam strange pretul`
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Extraction:** Mihai interesat, obiecție de preț
- **Why real:** "da" = "dar", "strange" = presează — limbaj colocvial

#### REAL-005: Insight vânzări
- **Input:** `cu mihai cred ca daca ii explic mai clar ce intra in pret am sanse`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Extraction:** Claritatea ofertei poate închide deal-ul cu Mihai

#### REAL-006: Constrângere furnizor — ultra-scurt
- **Input:** `ana de la detergenti vinerea se misca greu rau`
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Extraction:** Ana (furnizor detergenți) livrează greu vinerea
- **Disambiguation:** Ana furnizor ≠ Ana client

#### REAL-007: "tipa de la" + advice operațional
- **Input:** `sa nu uit, tipa de la detergenti a zis ca miercuri e ult zi buna daca vreau pt weekend`
- **Expected:** SAVE
- **Type:** fact
- **Category:** operational_patterns
- **Extraction:** Comandă detergenți max miercuri pentru livrare de weekend
- **Why real:** "tipa de la", "ult" = ultima, limbaj rapid

#### REAL-008: Prescurtare "dimi" + boundary
- **Input:** `eu dimi sunt om, dupa 6 nu ma mai baza pe mine`
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Extraction:** Productiv dimineața, drop-off după 18:00
- **Why real:** "dimi" = dimineață, "nu mă mai baza" = expresie colocvială

#### REAL-009: Preferință interaction — direct
- **Input:** `nu-mi da multe chestii deodata ca ma pierd urat`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Extraction:** Preferă puține task-uri simultan
- **[DEDUP: ~MEM-NAT-011, formulare ușor diferită]**

#### REAL-010: Insight self — "cap coadă"
- **Input:** `cand ma iau cu 100 maruntisuri nu mai fac nimic cap coada`
- **Expected:** SAVE
- **Type:** insight
- **Category:** entrepreneur_profile
- **Extraction:** Multitasking-ul pe lucruri mici distruge productivitatea
- **Why real:** "cap coadă" = expresie populară, "100 mărunțisuri" = hiperbolic

#### REAL-011: Insight pierdere clienți
- **Input:** `cred ca pierdem clienti ca raspundem prea tarziu si dupa aia se racesc`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Extraction:** Timp de răspuns lent → pierdere clienți
- **[DEDUP: ~MEM-NAT-019, validare variație]**

#### REAL-012: "parcă" + insight conversie
- **Input:** `astia care vin din recomandari parca inchid mai usor`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Extraction:** Clienții din recomandări convertesc mai ușor
- **[DEDUP: ~MEM-NAT-057]**

#### REAL-013: Follow-up prescurtat
- **Input:** `am vb cu ion si a zis sa-l caut peste o luna`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Extraction:** Ion: follow-up peste o lună

#### REAL-014: Preferință canal — ultra-prescurtat
- **Input:** `cu ion mai bn vb la tel decat mesaje`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Extraction:** Cu Ion: telefon > mesaje
- **Why real:** "mai bn", "vb", "tel" — toate prescurtate

#### REAL-015: Noise + fapt — "jale"
- **Input:** `azi a fost jale dar ideea e ca ana e dispusa sa incerce pe 1 ap`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Extraction:** Ana dispusă să înceapă colaborarea pe 1 apartament
- **Noise filter:** "azi a fost jale" = NU se salvează
- **Why real:** "jale" = argou, "incerce" = typo (încerce)

#### REAL-016: Întâlnire + deadline scurt
- **Input:** `m-am vazut cu mihai, vrea draftul pana joi`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Extraction:** Mihai vrea draftul până joi

#### REAL-017: Continuare condiționată prescurtată
- **Input:** `m-am vz cu mihai si daca ne miscam ok zice ca continuam`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Extraction:** Mihai continuă dacă execuția e bună
- **Why real:** "m-am vz" = prescurtare extremă

#### REAL-018: Insight prea vag
- **Input:** `nu stiu exact da ceva se rupe dupa prima discutie`
- **Expected:** AMBIGUOUS
- **Reasoning:** Posibil insight (funnel break), dar ce anume? Prea vag.

#### REAL-019: Insight preț — formulare colocvială
- **Input:** `pare ca lumea se sperie cand aude pretul`
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Extraction:** Prețul sperie potențialii clienți

#### REAL-020: Filler ultra-scurt
- **Input:** `ok ms`
- **Expected:** DO NOT SAVE
- **Why real:** "ms" = "mersi" prescurtat

#### REAL-021: Filler conversațional
- **Input:** `e ok, vedem`
- **Expected:** DO NOT SAVE

#### REAL-022: Pronume + zero content
- **Input:** `am vb cu el si a ramas cum am zis`
- **Expected:** AMBIGUOUS
- **Reasoning:** "el" neclar, "cum am zis" = referință necunoscută

#### REAL-023: Preferință client — poze
- **Input:** `ana vrea poze dupa interventie cel putin la inceput`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Extraction:** Ana vrea poze post-intervenție, cel puțin la început

#### REAL-024: Insight istoric — "belea"
- **Input:** `problema ei mare e ca echipa veche nu zicea nimic cand aparea belea`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Extraction:** Problema Anei cu echipa anterioară: lipsa comunicării la probleme
- **Why real:** "belea" = argou pentru problemă

#### REAL-025: Self-insight procrastinare
- **Input:** `eu daca nu fac azi, maine uit`
- **Expected:** SAVE
- **Type:** insight
- **Category:** entrepreneur_profile
- **[DEDUP: =MEM-NAT-014, validare formulare identică]**

#### REAL-026: Boundary repetare
- **Input:** `nu-mi place sa fiu batut la cap cu acelasi lucru`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **[DEDUP: =MEM-NAT-054, exact match]**

#### REAL-027: Insight client — încredere vs preț
- **Input:** `cred ca mihai nu se blocheaza in pret ci in incredere`
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Extraction:** Mihai: blocajul e pe încredere, nu pe preț

#### REAL-028: Timeline client
- **Input:** `la ana primele 2 sapt sunt decisive`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Extraction:** Ana: primele 2 săptămâni sunt decisive pentru colaborare

#### REAL-029: Preferință reminder prescurtată
- **Input:** `de obicei vreau remindere dimi, altfel le ratez`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Extraction:** Preferă remindere dimineața + motivul (le ratează altfel)

#### REAL-030: Procrastinare telefoane
- **Input:** `ba sincer eu pe telefoane tot aman`
- **Expected:** SAVE
- **Type:** fact
- **Category:** entrepreneur_profile
- **Extraction:** Pattern: amână tot ce implică apeluri telefonice
- **Why real:** "ba sincer" = prefață colocvială

---

## Suite CTC — Corecții și Contradicții
**Source:** User-authored — teste de update, override, extindere, și invalidare a memoriilor existente
**Focus:** Recency > versiune veche, corecții explicite bat incertitudine, extensii ≠ duplicat
**Phase:** Majoritate Phase 2 (necesită Memory Write node cu dedup + recency scoring)

### CTC — Corecții explicite

#### CTC-001: Corecție numerică directă
- **Precondition:** Memorie: `Ana are 5 apartamente`
- **Input:** `corectez, nu are 5, are 4`
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Contradiction:** Override 5→4
- **Retrieval test:** "câte apartamente are Ana?" → 4

#### CTC-002: Corecție plan extindere
- **Precondition:** Memorie: `Ana vrea să înceapă cu 1 apartament și apoi să dea restul de luna viitoare`
- **Input:** `de fapt nu de luna viitoare, mai intai doar inca unu dupa primul`
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Contradiction:** "restul de luna viitoare" → "doar +1 după primul"

#### CTC-003: Corecție deadline
- **Precondition:** Memorie: `Mihai vrea oferta până luni`
- **Input:** `nu mai e luni, a zis miercuri`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Contradiction:** luni → miercuri

#### CTC-004: Invalidare follow-up
- **Precondition:** Memorie: `Ion a zis să fie sunat peste o lună`
- **Input:** `gata, am vb deja cu ion, nu mai trebuie follow up-ul ala`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Contradiction:** Invalidează complet follow-up-ul
- **Retrieval test:** "trebuie să-l sun pe Ion?" → Nu, deja rezolvat

#### CTC-005: Override preferință
- **Precondition:** Memorie: `Prefer remindere dimineața`
- **Input:** `de acum nu dimineata, mai bine dupa pranz`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Contradiction:** dimineața → după-amiaza

#### CTC-006: Extensie (nu contradicție)
- **Precondition:** Memorie: `Ana livrează greu vinerea`
- **Input:** `nu doar vinerea, si joia se misca greu`
- **Expected:** SAVE
- **Type:** fact
- **Category:** constraints
- **Note:** Nu e contradicție — extinde faptul existent (vineri + joi)

#### CTC-007: Reframe insight
- **Precondition:** Memorie: `Mihai este interesat, dar prețul e problema principală`
- **Input:** `de fapt nu pretul, mai mult ca nu are incredere de la inceput`
- **Expected:** SAVE
- **Type:** insight
- **Category:** customer_market
- **Contradiction:** Cauza blocajului: preț → încredere

#### CTC-008: Rafinare insight
- **Precondition:** Memorie: `Clienții din recomandări închid mai ușor`
- **Input:** `nu mereu, doar daca raspunzi repede`
- **Expected:** SAVE
- **Type:** insight
- **Category:** growth_context
- **Note:** Nu invalidează, ci adaugă condiție: recomandări + răspuns rapid → conversie

#### CTC-009: Temporalizare cerință
- **Precondition:** Memorie: `Ana vrea poze după fiecare intervenție`
- **Input:** `pozele le vrea doar la inceput, nu mereu`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Contradiction:** "mereu" → "doar la început"

#### CTC-010: Nuanțare preferință
- **Precondition:** Memorie: `Prefer răspunsuri scurte`
- **Input:** `scurte da, dar nu prea seci`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Note:** Nu anulează, ci rafinează: scurt dar nu sec

#### CTC-011: Update stadiu vag
- **Precondition:** Memorie: `Businessul de curățenie este în setup`
- **Input:** `nu mai suntem chiar in setup, deja e putin mai asezat`
- **Expected:** SAVE
- **Type:** fact
- **Category:** business_profile
- **Note:** Update de stadiu, vag dar suficient (nu mai e setup)

#### CTC-012: Corecție ezitantă — "parcă", "cred"
- **Precondition:** Memorie: `Ana are 5 apartamente`
- **Input:** `parca nu 5, cred ca 4`
- **Expected:** AMBIGUOUS
- **Reasoning:** Corecție incertă. "Parcă" + "cred" = nu e sigur nici el. Bun test de certitudine.

#### CTC-013: Excepție temporară ≠ preferință nouă
- **Precondition:** Memorie: `Prefer remindere dimineața`
- **Input:** `azi doar sa nu fie dimineata`
- **Expected:** DO NOT SAVE
- **Reasoning:** "Azi doar" = excepție punctuală, nu schimbare de preferință

#### CTC-014: Corecție timeline
- **Precondition:** Memorie: `Ion trebuie sunat peste o lună`
- **Input:** `nu peste o luna, peste doua sapt`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Contradiction:** 1 lună → 2 săptămâni

#### CTC-015: Rafinare pattern temporal
- **Precondition:** Memorie: `Mihai răspunde greu seara`
- **Input:** `de fapt seara raspunde greu doar in timpul saptamanii`
- **Expected:** SAVE
- **Type:** insight
- **Category:** relationship_history
- **Note:** Nu invalidează, ci precizează: seara greu doar luni-vineri

#### CTC-016: Reframe cauză
- **Precondition:** Memorie: `Ana livrează greu vinerea`
- **Input:** `nu, problema nu e vinerea, problema e ca nu confirma la timp`
- **Expected:** SAVE
- **Type:** insight
- **Category:** constraints
- **Contradiction:** Cauza: vinerea → lipsa confirmării la timp

#### CTC-017: Schimbare nuanță
- **Precondition:** Memorie: `Nu-mi place să primesc multe lucruri deodată`
- **Input:** `ba de fapt merge, dar sa fie clare`
- **Expected:** SAVE
- **Type:** fact
- **Category:** preferences
- **Contradiction:** "nu-mi place multe" → "merge, dar clare"

#### CTC-018: Update plan client
- **Precondition:** Memorie: `Ana vrea colaborare graduală`
- **Input:** `acum zice ca e dispusa sa ne dea direct 2`
- **Expected:** SAVE
- **Type:** fact
- **Category:** customer_market
- **Contradiction:** gradual (1→apoi) → direct 2

#### CTC-019: Corecție tip livrabil
- **Precondition:** Memorie: `Mihai vrea draftul până joi`
- **Input:** `nu draft, varianta finala`
- **Expected:** SAVE
- **Type:** fact
- **Category:** relationship_history
- **Contradiction:** draft → variantă finală

#### CTC-020: Confirmare fără info nouă
- **Precondition:** Memorie: `Prefer remindere dimineața`
- **Input:** `ramane cum am zis cu dimineata`
- **Expected:** DO NOT SAVE
- **Reasoning:** Zero informație nouă. Confirmă ce există deja.

### CTC-AMB — Corecții ambigue (incomplete)

#### CTC-AMB-001: Negare fără alternativă — cantitate
- **Precondition:** Memorie: `Ana are 5 apartamente`
- **Input:** `nu cred ca sunt 5`
- **Expected:** AMBIGUOUS
- **Reasoning:** Neagă, dar nu oferă alternativă. Câte atunci?

#### CTC-AMB-002: Negare fără alternativă — deadline
- **Precondition:** Memorie: `Mihai vrea oferta până luni`
- **Input:** `nu chiar luni`
- **Expected:** AMBIGUOUS
- **Reasoning:** Corecție incompletă. Atunci când?

#### CTC-AMB-003: Modificator vag
- **Precondition:** Memorie: `Prefer remindere dimineața`
- **Input:** `nu mereu`
- **Expected:** AMBIGUOUS
- **Reasoning:** "Nu mereu" = când da, când nu? Prea vag pentru override.

#### CTC-AMB-004: Negare cu pronume
- **Precondition:** Memorie: `Ion trebuie sunat peste o lună`
- **Input:** `nu ala`
- **Expected:** AMBIGUOUS
- **Reasoning:** "Nu ăla" = nu Ion? Nu peste o lună? Nu sunat? Total neclar.

---

### Evaluare CTC — ce verifici la fiecare test de corecție:

1. **Recunoaștere** — detectează că e update/contradicție (nu info complet nouă)
2. **Non-duplicare** — nu creează duplicat naiv pe lângă memorie veche
3. **Recency dominance** — noua informație bate vechea la retrieval
4. **Vagueness guard** — dacă corecția e prea vagă, nu forțează memorie falsă

---

## REZUMAT EXTINDERE

| Suite | Teste noi | Focus |
|-------|-----------|-------|
| R1 — Natural save | 16 | Fapte spuse informal |
| R2 — Natural don't save | 11 | Filler care pare important |
| R3 — Referințe indirecte | 6 | "Ăla", "tipul", pronume |
| R4 — Emoție + fapte | 6 | Frustration vent + info utilă |
| R5 — Corecții | 5 | "Stai", "de fapt", override |
| R6 — Mesaje în serie | 3 | Context split pe mai multe mesaje |
| R7 — Preferințe implicite | 5 | Obiceiuri = preferințe |
| R8 — Operational patterns | 5 | Rutine, procese, soluții |
| R9 — Borderline pairs | 12 (6 perechi) | Similar messages, diferit outcome |
| R10 — Incertitudine | 5 | "Parcă", "cred că", "posibil" |
| R11 — Mesaje lungi | 3 | Wall of text, fapte ascunse |
| R12 — Dedup natural | 5 | Override, update, contradicție |
| Borderline cases (BC) | 12 | Cazuri maxim dificile |
| NAT-A — Relații/follow-up | 8 | User-authored, oameni reali |
| NAT-B — Preferințe/stil | 6 | Stil de lucru personal |
| NAT-C — Business/constrângeri | 4 | Stadiu, structură |
| NAT-D — Creștere/insights | 5 | Ipoteze business |
| NAT-E — Advice | 3 | Reguli propuse |
| NAT-F — Filler (nu salva) | 7 | Noise conversațional |
| NAT-G — Mix util+zgomot | 3 | Extragere din haos |
| NAT-H — Dedup | 3 | Duplicare semantică |
| NAT-I — Contradicții | 3 | Override informații |
| NAT-J — Ambiguități | 4 | Referințe neclare |
| NAT-K — Întâlniri | 4 | Istoric relațional |
| NAT-L — Profil antreprenor | 4 | Self-awareness |
| NAT-M — Piață/clienți | 4 | Comportament comercial |
| NAT-N — Perechi save/not | 6 (3 perechi) | Identical theme, different decision |
| NAT-BORDER | 5 | Borderline adiționale |
| SCEN (1-15) — Narativ | 15 | Mini-compuneri, arce narative |
| SCEN-RET — Retrieval | 10 | Verificare coerență post-scenarii |
| REAL (001-030) — Typo/Slang | 30 | Prescurtări, typo-uri, limbaj murdar |
| CTC (001-020) — Corecții | 20 | Override, extensie, invalidare |
| CTC-AMB (001-004) — Ambigue | 4 | Corecții incomplete |
| **TOTAL NOU** | **242** | |
| **TOTAL COMBINAT (original 69 + extindere)** | **311** | |

### Teste unice per categorie RAG:

| Categorie | Total teste SAVE | Sursă |
|-----------|-----------------|-------|
| business_profile | 13 | R1, R4, NAT-C, CTC-011 |
| customer_market | 28 | R1, R9, NAT-A/M, SCEN, REAL, CTC |
| growth_context | 13 | R1, R9, NAT-D, REAL, CTC-008 |
| entrepreneur_profile | 18 | R1, R7, NAT-B/L, SCEN-13, REAL |
| relationship_history | 28 | R1, R3, NAT-A/K, SCEN, REAL, CTC |
| operational_patterns | 13 | R8, NAT-E/G, SCEN-08, REAL-007 |
| preferences | 18 | R7, NAT-B, SCEN, REAL, CTC-005/009/010/017 |
| constraints | 11 | R1, R10, NAT-A, SCEN-08, REAL-006, CTC-006/016 |

### Dedup cross-suite (teste identice sau aproape identice):

| Test nou | Echivalent existent | Tip |
|----------|-------------------|-----|
| REAL-009 | MEM-NAT-011 | ~identic |
| REAL-011 | MEM-NAT-019 | ~identic |
| REAL-012 | MEM-NAT-057 | ~identic |
| REAL-025 | MEM-NAT-014 | identic |
| REAL-026 | MEM-NAT-054 | identic |
| CTC-003 | MEM-NAT-041 | identic |
| CTC-004 | MEM-NAT-042 | ~identic |
| CTC-005 | MEM-NAT-040 | ~identic |
| CTC-006 | MEM-NAT-039 | ~identic |

**Notă:** Duplicatele sunt păstrate intenționat — servesc ca cross-check de consistență (aceeași regulă, suită diferită).

### Set minim recomandat pentru primul run:

```
NAT:  MEM-NAT-001, MEM-NAT-003, MEM-NAT-009, MEM-NAT-014,
      MEM-NAT-019, MEM-NAT-024, MEM-NAT-034, MEM-NAT-037,
      MEM-NAT-040, MEM-NAT-041, MEM-NAT-043, MEM-NAT-055,
      MEM-NAT-059, MEM-NAT-061, MEM-NAT-063

REAL: REAL-001, REAL-004, REAL-008, REAL-011, REAL-015,
      REAL-023, REAL-027

CTC:  CTC-001, CTC-003, CTC-004, CTC-005, CTC-009,
      CTC-012, CTC-020
```
