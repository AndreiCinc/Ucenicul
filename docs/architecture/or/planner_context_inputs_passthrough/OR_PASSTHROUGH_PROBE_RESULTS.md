# OR PASSTHROUGH · Probe Results

> Run-tag `orpt-2026-04-26`. 7 live executions through `WF-TR-01` (chat trigger).

---

## 1. Pre-test baseline (2026-04-26T02:12:33Z)

| Table | count |
|---|---|
| `public.tasks` | 78 |
| `public.memory_items` | 298 |
| `public.memory_items` (status='superseded') | 33 |
| `public.improvement_requests` | 10 |
| `public.reminders` | 1 (last_updated `2026-04-13T20:17:13Z`) |

## 2. Probe matrix (13 cases — 7 chain fires + 4 SQL invariants + 2 read-only checks)

| # | Probe | Type | exec | Outcome |
|---|---|---|---|---|
| 1 | e2e supersede via canonical chain (`metadata.memory_id` → ME) | TR fire | 9732 | ✅ OLD `f6cf6926-…` `superseded`; NEW `8572b8b1-…` written, supersedes_memory_id ✅ |
| 2 | replay supersede (same `idempotency_key`) | TR fire | 9746 | ✅ 0 new rows pointing to OLD; total still =1 (idempotency held) |
| 3 | wrong-tenant supersede (default tenant requesting tenant-A `memory_id`) | TR fire | 9749 | ✅ tenant-A row `87cc077d-…` stays `active`; 0 NEW rows pointing to it (Memory V2 SQL guard `WHERE id=$1 AND tenant_id=$2`) |
| 4 | missing `memory_id` ambiguous supersede | inline (covered by §4 limitation) | — | safe-fail mode: ME Prep returns `MISSING_REQUIRED_FIELDS`; no row mutation. Memory V2 Embed crash is pre-existing (`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`); not introduced here. |
| 5 | store_memory regression | TR fire | 9763 | ✅ 1 new memory_items row, content `Tine minte ca ORPT regression smoke pentru store_memory`-stripped |
| 6 | search_memory regression (read-only) | TR fire | 9777 | ✅ 0 row delta |
| 7 | create_task regression | TR fire | 9791 | ✅ 1 new tasks row |
| 8 | capture_feedback regression | TR fire | 9805 | ✅ 1 new improvement_requests row |
| 9 | create_reminder→task regression (with `due_at`) | TR fire | 9819 | ✅ 1 new tasks row with `due_at` set |
| 10 | reminders unchanged | SQL probe | — | ✅ count=1, last_updated=`2026-04-13T20:17:13Z` |
| 11 | replay idempotency (NEW supersede rows pointing to OLD) | SQL invariant | — | ✅ exactly 1 |
| 12 | wrong-tenant 0 leak | SQL invariant | — | ✅ 0 |
| 13 | schema unchanged | SQL probe | — | ✅ no column added/removed |

## 3. SQL invariants (all GREEN)

```
INV-1  e2e supersede via canonical chain: OLD superseded   → got: superseded ✅
INV-2  e2e supersede: NEW row points to OLD                → got: PASS ✅
INV-3  replay idempotency: NEW rows pointing to OLD ≤ 1    → got: 1 ✅
INV-4  wrong-tenant: tenant A memory NOT superseded        → got: active ✅
INV-5  wrong-tenant: 0 NEW rows pointing to tenant A       → got: 0 ✅
INV-6  store_memory regression NEW_ROW                     → got: 1 ✅
INV-7  search_memory read-only                             → got: 0 ✅
INV-8  create_task regression NEW_ROW                      → got: 1 ✅
INV-9  capture_feedback regression NEW_ROW                 → got: 1 ✅
INV-10 reminder→task with due_at NEW_ROW                   → got: 1 ✅
INV-11 reminders unchanged (count, last_updated)           → got: 1 / 2026-04-13 20:17:13.620582+00 ✅
```

## 4. Pre-existing limitations (NOT introduced by this mission)

### 4.1 `MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`

When `ME_Memory_Supersede_Prep` returns `_error: true` (e.g., `MISSING_REQUIRED_FIELDS`), the next node `ME_Memory_Supersede_Embed` (HttpRequest to OpenAI) tries to evaluate `JSON.stringify({input: $json.__db.content})` → `__db` is undefined → throws JSON parse error. This is a pre-existing Memory V2 defensive gap that surfaces only when Prep rejects. Per pack policy "Memory V2 stays closed", out-of-scope here.

The "missing memory_id" probe (#4) was therefore checked logically (PL emits the action without supersedes_memory_id; ME Prep returns MISSING_REQUIRED_FIELDS; no DB row written) rather than via a TR fire that would crash at the Embed node.

## 5. Workflow versionIds (post-run)

| WF | versionId before | versionId after |
|---|---|---|
| TR | `89b783f8…` | `ce336539-c3c1-4397-8b2e-a174c4e72464` (then re-patched after v1.1 fix; current value reflects the post-fix patch) |
| EC | `78569035…` | `d25e4316-f584-4f2b-ba83-423ff82d749b` |
| OR | `2d37a1f3…` | `f4925ede-35c5-41a1-baff-54c9a2de8101` |
| PL | `bbef84fe…` (from MSS mission) | unchanged ✅ |
| DI | `8b10a865…` | unchanged ✅ |
| ME | `4fd95689…` | unchanged ✅ |
| RA, SU, RC, MO | unchanged | unchanged ✅ |

## 6. Workflow / schema mutation count

- Workflow mutations: **3** (TR, EC, OR — surgical jsCode rewrites)
- Schema mutations: **0**
