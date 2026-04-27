# Acceptance Checklist

## Bundle

- [ ] Mission 1 C11 targeted rerun completed or blocked with evidence.
- [ ] Mission 2 recall mapping completed or blocked with evidence.
- [ ] Mission 3 improvement list completed or blocked with evidence.
- [ ] No duplicate workflows.
- [ ] No Path 5.
- [ ] No unauthorized MCP write.
- [ ] No schema mutation unless explicitly authorized.
- [ ] `public.reminders` unchanged.
- [ ] Reconciliation updated compactly.
- [ ] Final bundle verdict emitted.

## Mission 1 — C11

- [ ] Exact harness replay key behavior inspected.
- [ ] Replay group fired sequentially.
- [ ] Replay group has one logical domain row.
- [ ] Fresh control writes one legitimate additional row.
- [ ] No workflow/schema mutation.

## Mission 2 — recall_memory

- [ ] PL mapping/existing state discovered.
- [ ] If patched, node/connection delta is 0.
- [ ] `recall_memory` routes safely to memory module.
- [ ] Recall/search is read-only.
- [ ] Cross-tenant recall blocked.
- [ ] Store/search regressions green.

## Mission 3 — list_improvements

- [ ] Schema preflight completed.
- [ ] List path is tenant-scoped.
- [ ] List path is SELECT-only.
- [ ] Empty result is safe.
- [ ] Filters are safe or documented as unsupported.
- [ ] Cross-tenant list blocked.
- [ ] capture_feedback regression green.
- [ ] task/memory/reminder regressions green.
- [ ] Module Registry updated if user-ready.
