# ACCESS_PREFLIGHT.md

Data rulare: 2026-04-21
Scop: access + capability preflight pentru proiectul Ucenicul. Zero implementare, zero modificări live.

## 1. Verdict global

**READY_WITH_LIMITATIONS**

Motiv scurt: toate suprafețele critice (filesystem RW, shell/search, n8n read, postgres RW+DDL, memory context, session handoff) răspund ok. Limitările sunt de *politică*, nu de *acces*: (a) write fence al misiunii `memory_module` restricționează legal scrisul la `docs/architecture/memory/**` + `tests/memory/**`; (b) live PUT pe `WF-ME-01` e deferit operatorului prin `D-M-009`, deși tool-urile `mcp__n8n__*` permit PUT; (c) ștergerea de fișiere cere tranziție prin `allow_cowork_file_delete` (one-time gate, acum activ pentru Ucenicul).

## 2. Surface-by-surface matrix

| Surface | Status | Evidence | Blocker | Mitigation |
|---|---|---|---|---|
| filesystem read | ok | `ls` pe root, `.claude/`, `docs/architecture/`, `docs/architecture/memory/`, `tests/`, `workflows/`, `db/` — toate listate | none | — |
| filesystem write | ok | `Write` reușit pe `docs/architecture/memory/_access_probe.txt` și `docs/architecture/memory/tests/memory/_access_probe.txt`; `Edit` reușit; `rm` reușit după `allow_cowork_file_delete` | politică: write fence restrictiv în afara `docs/architecture/memory/**` + `tests/memory/**` + `migration.sql`/`WF-ME-01` patch surface | respectă write fence; pentru orice alt scris → cer confirmare + `DIVERGENCE_REGISTER_MEMORY.md` |
| shell/search | ok | `Glob` → `Architecture_Spec_v3_Ucenicul.md` (3 hits), `migration.sql` (1 hit), `MEMORY.md` (3 hits); `Grep` `WF-ME-01` → 20 file matches; `Bash ls` funcțional | none | — |
| memory context | ok | `/sessions/vibrant-awesome-volta/mnt/.auto-memory/MEMORY.md` încărcat (2 entries); `project_memory_module_mission.md` + `feedback_step_by_step_mode.md` coexistă fără conflict (scopes diferite — unul e project baseline, altul e cadență); copia din `Ucenicul/auto-memory/MEMORY.md` identică cu auto-memory root | none | — |
| n8n read | ok | `mcp__n8n__verify_workflow(uq26nh1grIpnHju0)` → `name="WF-ME-01 Module Execution"`, `nodeCount=30`, `connectionCount=45`, `active=true`, `versionId=3b3fc427-9600-4652-96d7-1b0536ddd39f`, `updatedAt=2026-04-20T15:55:51.200Z`; `get_workflow` funcțional (output >128k tokens → persistat pe disc) | none | pentru inspecții mari folosește `verify_workflow` sau chunked read pe fișierul persistat |
| n8n write capability | ok-tool / blocked-by-policy | tool-urile `mcp__n8n__patch_workflow_nodes`, `update_workflow`, `move_node`, `publish_workflow`, `unpublish_workflow` disponibile; NU am exercitat niciuna în preflight | policy: `D-M-009` → live PUT `WF-ME-01` e deferit operatorului | nu executa PUT/patch pe WF-ME-01 fără intrare nouă în `DIVERGENCE_REGISTER_MEMORY.md` + aprobare operator |
| postgres read | ok | `current_user=claude_mvp`, `db=railway`, PostgreSQL 16.13; tabele detectate în `public`: `memory_items`, `messages`, `rag_memories`, `threads`; `memory_items` are 7 rânduri (fixturi walker) | none | — |
| postgres write/DDL capability | ok | `has_table_privilege` pe `memory_items` → SELECT/INSERT/UPDATE/DELETE all `true`; `has_schema_privilege('public','CREATE')` → `true` | politică: `migration.sql` frozen, aplicat live; orice DDL nou cere divergență | rulează doar DML sigur; pentru DDL nou — freeze gate + divergence |
| postgres extensions | ok | `vector=0.8.2`, `pgcrypto=1.3`, `uuid-ossp=1.1` prezente | `pg_trgm` absent | neutil pentru v1; dacă v2 îl cere, `CREATE EXTENSION` e în drepturile rolului |
| artifact saving discipline | ok | locațiile fixe există și sunt scriabile: `docs/architecture/memory/{schema,patches,handlers,decisions,docs,tests/memory/{fixtures,results,walkers}}` | none | — |
| session handoff continuity | ok | `SESSION_HANDOFF_NEXT.md`, `IMPLEMENTATION_STATE.md`, `PHASE_GATE_CHECKLIST.md` existente și coerente; `final_verification.md` frozen cu `Known limitations / v2 follow-ups` | none | respectă rezumă ordinea din §C a handoff-ului |

## 3. Concrete probes executed

Filesystem + shell:
- `Bash ls -la /sessions/vibrant-awesome-volta/mnt/Ucenicul` → 15 intrări top-level, inclusiv `.claude/`, `docs/`, `tests/`, `workflows/`, `db/`, `auto-memory/`.
- `ls .claude/` → `pipelines/`, `skills/`, `README.md`; **`.claude/memory/` NU există**.
- `ls docs/architecture/memory/` → 22 intrări (toate control docs, `schema/`, `patches/`, `handlers/`, `tests/`, `decisions/`, `docs/`).
- `ls tests/` root → doar `edges/`, `generated/`; **`tests/memory/` la root NU există**; subtree-ul real e nested la `docs/architecture/memory/tests/memory/`.
- `Glob Architecture_Spec_v3_Ucenicul.md` → 3 hits (canonical la `docs/architecture/`, plus copii în `docs/` și `archive/`).
- `Glob migration.sql` → 1 hit: `docs/architecture/memory/migration.sql`.
- `Glob MEMORY.md` → `mnt/.auto-memory/MEMORY.md`, `Ucenicul/auto-memory/MEMORY.md`, `mnt/uploads/MEMORY.md`.
- `Grep WF-ME-01` → 20 fișiere (atins limita); include `SESSION_HANDOFF_NEXT.md`, `patches/*`, `patch_plan.md`, `walker.mjs`, `final_verification.md`.

Filesystem write/edit/delete:
- `Write docs/architecture/memory/_access_probe.txt` → OK.
- `Write docs/architecture/memory/tests/memory/_access_probe.txt` → OK.
- `Edit _access_probe.txt` → OK.
- `Bash rm ...` inițial → `Operation not permitted`.
- `mcp__cowork__allow_cowork_file_delete` → gate acordat pentru folderul Ucenicul.
- `Bash rm ...` după gate → OK, ambele probe șterse.

n8n:
- `mcp__n8n__get_workflow(uq26nh1grIpnHju0)` → răspuns valid, JSON mare persistat pe disc din cauza dimensiunii.
- `mcp__n8n__verify_workflow(uq26nh1grIpnHju0)` → `ok=true`, meta completă (vezi tabelul).
- Nicio operație write executată pe n8n în preflight.

Postgres:
- `SELECT current_user, current_database(), version()` → `claude_mvp` / `railway` / PG 16.13.
- `SELECT extname FROM pg_extension WHERE extname IN (...)` → `vector 0.8.2`, `pgcrypto 1.3`, `uuid-ossp 1.1`.
- `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (...)` → `memory_items`, `messages`, `rag_memories`, `threads` prezente; `executions`, `execution_context` absente în `public`.
- `has_table_privilege / has_schema_privilege` pe `claude_mvp` → SELECT/INSERT/UPDATE/DELETE pe `memory_items` + CREATE pe schema `public` = toate `true`.
- `SELECT COUNT(*) FROM public.memory_items` → 7 (coerent cu walker fixtures notate în `SESSION_HANDOFF_NEXT.md §F`).

Memory context:
- `Read /sessions/vibrant-awesome-volta/mnt/.auto-memory/MEMORY.md` → 2 pointeri (mission + feedback cadence).
- `Read project_memory_module_mission.md` + `feedback_step_by_step_mode.md` → zero conflict (scopes ortogonale: project baseline vs. cadență de interacțiune).
- `SESSION_HANDOFF_NEXT.md` + `IMPLEMENTATION_STATE.md` + `PHASE_GATE_CHECKLIST.md` → toate coerente; misiune v1 închisă Phase 8 (2026-04-20).

## 4. Real blockers

Niciun blocker hard de acces. Doar limite de politică (vezi §2 și §5):
- Nu există `.claude/memory/` și nu există `tests/memory/` la root — nu e blocker, e **divergență de nomenclatură** față de baseline. Subtree-ul real de teste trăiește nested la `docs/architecture/memory/tests/memory/`, iar memory files de runtime stau în `auto-memory/` (nu `.claude/memory/`).
- Payload `get_workflow` > limita de token per tool-call → folosește `verify_workflow` sau chunked read. Non-blocker.

## 5. Required operator actions

Nu sunt acțiuni operator necesare pentru ca eu să execut *sarcini noi* autonom pe surfacele deschise. Devine necesară intervenția operatorului numai pentru:

1. **Live PUT al `wf_me_01_post_patch_20260420.json` în `WF-ME-01`** — deferit per `D-M-009`. Eu pot pregăti payload-ul, pot genera evidence draft; operatorul execută deactivate → REST PUT → activate și anexează `versionId` în `patches/apply_evidence_20260420.md §Post-apply record`.
2. **Orice scris în afara write fence-ului** (`Architecture_Spec_v3_Ucenicul.md`, `Migration_Plan_Ucenicul.md`, `Memory_Model_Spec.md`, `Module_Spec_Memory.md`, `Module_Registry_Ucenicul.md`, alte workflow-uri, root docs canonice) — cere ordin explicit + divergență.
3. **Dacă vreun v2 follow-up are nevoie de DDL nou în `public`** — am drepturile, dar cere freeze gate nou + `DIVERGENCE_REGISTER_MEMORY.md`.

Nimic din ce e listat mai sus nu e blocat de *lipsă de acces*; e blocat de *disciplina misiunii*.

## 6. Autonomy verdict

**Pot închide singur, end-to-end, orice sarcină care:**
- stă în write fence-ul `docs/architecture/memory/**` + `docs/architecture/memory/tests/memory/**`;
- e DML pur pe `public.memory_items` (sau citire pe orice tabel din `public`);
- e GET/verify pe workflow-uri n8n;
- e generare de artefacte (design, plan, build_patch output JSON, walker runs, verification docs);
- e actualizare de state docs (`IMPLEMENTATION_STATE.md`, `PHASE_GATE_CHECKLIST.md`, `SESSION_HANDOFF_NEXT.md`, ledger-uri).

**Nu pot închide singur** (dependență operator / gate nou):
- live PUT pe `WF-ME-01` (deferit explicit);
- orice modificare a artefactelor frozen fără intrare nouă în `DIVERGENCE_REGISTER_MEMORY.md`;
- orice scris în afara write fence (root docs canonice, alte workflow-uri, `rag_memories`, `db/migrations/**`);
- DDL nou pe `public` fără freeze gate reînchis.

**Tipuri de task pe care le pot prelua autonom acum:**
- v2 follow-up pur de design / documentație (din `final_verification.md §Known limitations / v2 follow-ups`) — tot în memory workspace;
- generarea payload-urilor și evidence draft pentru operator PUT;
- rularea walker-ului (re-run sigur pe DB — fixturi persistente, nu auto-delete);
- analiză + raport pe memory_items / workflow patch fără modificări.

Preflight oprit aici. `ACCESS_PREFLIGHT.md` salvat la `/Ucenicul/ACCESS_PREFLIGHT.md` (versiune veche `gallant-epic-pascal` suprascrisă).
