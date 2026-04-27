# C11_REPLAY_GROUPING_TARGETED_RERUN · Failure Classification

## Failures

**None. Zero P0 stop conditions triggered.** All 5 fires returned the
expected behavior.

## P0 stop conditions evaluated

| Condition | Triggered? | Notes |
|---|---|---|
| Replay with canonical grouping creates duplicate side effect | **NO** | 4 fires of replay group → exactly 1 `memory_items` row + 1 `execution_contexts` row |
| Tenant isolation fails | **NO** | All rows landed in tenant default; tenants A/B `memory_items` for the two threads = 0 |
| `public.reminders` changes | **NO** | count=1, max(created_at)=2026-04-13 20:17:13Z unchanged |
| Workflow mutation appears | **NO** | WF-PL-01 + WF-ME-01 versionIds byte-identical post-mission |
| Schema mutation appears | **NO** | 0 DDL applied |
| Path 5 invocation needed | **NO** | 0 |
| Duplicate workflow created | **NO** | 0 |
| Unauthorized MCP write | **NO** | Only `execute_workflow` (chat trigger) used; canonical channel for live e2e fires |

## Informational notes

| Note | Class | Why not a failure |
|---|---|---|
| Memory V2 row's `idempotency_key` does not echo the request-level `e2e:c11rg-…` key — instead it's `store_memory:<EC.id>:step_01_store_memory`. | `KNOWN_HARNESS_BEHAVIOR` (per F10 finding in main reconciliation §5) | Per-stage internal idempotency keys are how the chain has always worked. The robust replay invariant uses tenant+thread+window scoping, which is what `assert_no_memory_write_for_case` and `assert_memory_row_exists` already do post-F10 fix. **No P0**. |
| `assert_idempotency_unique` and `assert_supersede_backlink` (which scope by `memory_items.idempotency_key LIKE rt.idempotency_key%`) would silently miss request-level dedupe coverage. | `KNOWN_HARNESS_BEHAVIOR` | Documented now in `C11_REPLAY_GROUPING_RUNTIME_RESULTS.md`. The replay-group dedupe is exercised at OR via `execution_contexts` uniqueness on `(tenant_id, trigger_message_id)`, not at Memory V2. **No P0**. |
| MO terminated `MISSING_DELIVERY_TARGET` for the first delivery (no telegram_chat_id). | `KNOWN_FIXTURE_LIMITATION` | Per `e2e_oracle.mjs` lines 76-92. Documented and accepted across prior missions. |
