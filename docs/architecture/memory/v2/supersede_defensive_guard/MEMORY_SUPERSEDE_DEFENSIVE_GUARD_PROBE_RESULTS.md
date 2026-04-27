# MEMORY V2 SUPERSEDE EMBED · Defensive Guard · Probe Results

> Run-tag `msdg-2026-04-26`. 11 sequential live executions through `WF-TR-01`.

---

## Pre-test baseline (2026-04-26T02:32:27Z, post-patch)

| Table | count |
|---|---|
| `public.tasks` | 80 |
| `public.memory_items` | 303 |
| `public.memory_items` (status='superseded') | 34 |
| `public.improvement_requests` | 11 |
| `public.reminders` | 1 (last_updated `2026-04-13T20:17:13Z`) |

## Probe matrix

| # | Probe | exec | Outcome |
|---|---|---|---|
| 1 | Valid canonical TR→…→ME supersede with `metadata.memory_id` | 9833 | ✅ status:success; OLD `11c66583-…` superseded; NEW row written, points to OLD |
| 2 | Missing `memory_id` (empty `metadata: {}`) | 9847 | ✅ status:success (was: ERROR pre-patch) — no DB row, clean error envelope, no crash |
| 3 | Invalid UUID `memory_id="NOT-A-UUID-AT-ALL"` | 9861 | ✅ status:success — OR allowlist drops non-UUID; ME Prep returns MISSING_REQUIRED_FIELDS; no DB row |
| 4 | Wrong-tenant `memory_id` (default tenant requesting tenant-A row) | 9875 | ✅ status:success; tenant-A row stayed `active`; 0 NEW rows pointing to it (Memory V2 SQL guard) |
| 5 | Replay valid supersede (same `idempotency_key="msdg:valid"`, same `message_id`) | 9889 | ✅ status:success; total NEW rows pointing to OLD = 1 (no duplicate) |
| 6 | store_memory regression | 9892 | ✅ 1 new memory_items row written |
| 7 | search_memory regression (read-only) | 9906 | ✅ 0 row delta |
| 8 | create_task regression | 9920 | ✅ 1 new tasks row written |
| 9 | capture_feedback regression | 9934 | ✅ 1 new improvement_requests row written |
| 10 | create_reminder→task regression (with `due_at`) | 9948 | ✅ 1 new tasks row with `due_at` |
| 11 | Ambiguous task guard regression (`Fa chestia aia pentru mine`) | 9962 | ✅ 0 tasks row written (ACG guard fires) |
| 12 | Ambiguous memory guard regression (`Tine minte asta`) | 9976 | ✅ 0 memory_items row written (ACG guard fires) |

## Key observation

**Probe 2 is the headline result.** Pre-patch this same envelope (no `memory_id`) caused the chain to crash at `ME_Memory_Supersede_Embed` with `NodeOperationError: The value in the "JSON Body" field is not valid JSON`. Post-patch the chain returns `status:success` with a clean module error envelope; no DB row, no crash, no workflow failure.

## Workflow versionIds (post-run)

| WF | versionId |
|---|---|
| TR | `89b783f8…` (unchanged) |
| EC | `78569035…` (unchanged) |
| OR | `f4925ede-35c5-41a1-baff-54c9a2de8101` (unchanged from prior OR_PASSTHROUGH mission) |
| PL | `bbef84fe…` (unchanged) |
| DI | `8b10a865…` (unchanged) |
| **ME** | **`3c7b95dd-1c5d-4b20-8fca-3d86aef73290`** (was `4fd95689…`; bumped) |
| RA, SU, RC, MO | unchanged |

## Workflow / schema mutation count

- Workflow mutations: **1** (`WF-ME-01` only — single-node `parameters` change on `ME_Memory_Supersede_Embed`)
- Schema mutations: **0**
