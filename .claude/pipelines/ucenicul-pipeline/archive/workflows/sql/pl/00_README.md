# WF-PL-01 SQL Pack

> **NONE OF THE SQL FILES IN THIS FOLDER WERE EXECUTED DURING THE SCOPE-EXPANSION PREP CYCLE.**
> They are artifacts for the live build cycle. Execute them only after EC-01 and OR-01 are CLOSED at 10/10 and after `05_DB_AUTONOMY_PLAYBOOK.md` §"Stage-start DB reality check" has been performed.

## Execution order (live build cycle)

1. `01_schema_inspect.sql` — READ-ONLY introspection. Run first. Log output to `BUILD_REPORT.md`.
2. Decide canonical vs `_claude_mcp` fallback per `11_DECISION_PRESETS.md` §7.
3. `02_create_table_candidate.sql` OR `03_create_table_fallback_claude_mcp.sql` — apply ONE (the chosen one).
4. `04_parameterized_upsert.sql` + `05_parameterized_replay_select.sql` — these are the SQL bodies the n8n node uses. Not executed standalone; extracted here for auditability and for standalone replay testing.
5. `06_fixture_pack_claude_mcp.sql` — fixture DML for V1–V6. Stage-marked per `14_TEST_FIXTURE_REGISTRY.md`.
6. `08_read_path_probe.sql` — READ-ONLY evidence query, used during and after V3–V6.
7. `07_cleanup.sql` — fixture cleanup at stage close, classified per `14_…` §6.
8. `99_merge_back_notes.sql` — if fallback was used, follow this to merge `_claude_mcp` into canonical `execution_plans` (ONLY in a later migration step, not during PL-01 build).

## Discipline

- Every SQL body is **parameterized** (`$1, $2, …`) per `05_DB_AUTONOMY_PLAYBOOK.md`.
- Every write is **tenant-scoped** where applicable.
- Replay-safe: UPSERT semantics on `(idempotency_key)`.
- No schema inference from validator errors — schema truth is only live `information_schema` reads or authoritative migration files (per `12_TOOL_FAILURE_MATRIX.md` §5).
