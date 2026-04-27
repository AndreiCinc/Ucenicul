# MEMORY V2 SUPERSEDE EMBED · Defensive Guard · Execution Log

> Mission: `MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`
> Repo root: `C:\Users\andre\Projects\Ucenicul`
> Started: `2026-04-26T02:30:33Z`

---

## 0. Predecessor verdicts

- `OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_READY = TRUE`
- `MEMORY_SUPERSEDE_PL_INTENTMAP_READY = TRUE`
- `AMBIGUOUS_CONTENT_GUARDS_READY = TRUE`
- `F14_STORE_MEMORY_INTENTMAP_READY = TRUE`
- `IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`

## 1. Workflow live versions

| WF | id | versionId before | versionId after |
|---|---|---|---|
| WF-ME-01 | `uq26nh1grIpnHju0` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | `3c7b95dd-1c5d-4b20-8fca-3d86aef73290` |
| (other 9) | — | unchanged | unchanged |

## 2. Exact node analyzed

`WF-ME-01.ME_Memory_Supersede_Embed` (HttpRequest v4.2):
- `parameters.jsonBody = ={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}`
- `continueOnFail: null` (i.e., propagate)
- `alwaysOutputData: null`

When upstream `ME_Memory_Supersede_Prep` returns `{_error: true, error_code: 'MISSING_REQUIRED_FIELDS', …}` (no `__db`), the expression `$json.__db.content` throws TypeError on the property access; n8n catches the broken expression and ends up with the literal string `"undefined"` as the JSON Body, then `parseJsonParameter` rejects it.

Downstream node `ME_Memory_Supersede_Embed_Merge` already has the canonical short-circuit:
```js
const prep = $('ME_Memory_Supersede_Prep').first().json;
if (prep && prep._error === true) { return [{ json: prep }]; }
```
So if Embed simply does not CRASH, Merge correctly propagates the Prep's `_error`.

## 3. Patch decision

Smallest possible patch: **the Embed node only**. Two `parameters` keys touched:
- `parameters.jsonBody` → defensive ternary that never dereferences `__db` when missing.
- `continueOnFail: true` + `alwaysOutputData: true` for belt-and-suspenders (in case OpenAI rejects the noop call).

No node added. No connection added. No schema mutation. No change to `Prep`, `Embed_Merge`, `DB`, `Result`. Memory V2 store / search / recall / promote chains untouched.

## 4. Probes

12 sequential live executions through `WF-TR-01` (run-tag `msdg-2026-04-26`):

- Probe 1 (exec 9833): valid canonical TR→…→ME supersede with `metadata.memory_id` → OLD `superseded`, NEW row points to OLD ✅
- Probe 2 (exec 9847): missing `memory_id` → no crash (was crash pre-patch); 0 row delta ✅
- Probe 3 (exec 9861): invalid UUID → OR allowlist drops; 0 row delta ✅
- Probe 4 (exec 9875): wrong-tenant → tenant-A row stays active; 0 NEW rows pointing to it ✅
- Probe 5 (exec 9889): replay valid supersede → 0 new rows; total NEW = 1 ✅
- Probes 6-10 (execs 9892, 9906, 9920, 9934, 9948): store_memory + search_memory + create_task + capture_feedback + create_reminder→task regressions all GREEN ✅
- Probes 11-12 (execs 9962, 9976): ACG ambiguous-task + ambiguous-memory guards from prior mission still fire ✅

All 16 P0 invariants GREEN. `public.reminders` count=1, last_updated `2026-04-13T20:17:13Z` unchanged. Detail: `MEMORY_SUPERSEDE_DEFENSIVE_GUARD_PROBE_RESULTS.md` + `MEMORY_SUPERSEDE_DEFENSIVE_GUARD_SQL_INVARIANTS.md`.

## 5. Final verdict

**`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_READY = TRUE`** — see `MEMORY_SUPERSEDE_DEFENSIVE_GUARD_CLOSEOUT.md`. Reconciliation update applied to `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` (top-of-file Update banner; §0.1 strikethrough on the supersede-Embed-defensive-gap row).
