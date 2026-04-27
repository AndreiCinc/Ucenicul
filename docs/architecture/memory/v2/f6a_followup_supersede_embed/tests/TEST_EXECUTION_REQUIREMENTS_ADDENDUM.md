# Test Execution Requirements Addendum

The original pack included a test plan. This addendum makes tests concrete.

Claude must copy or preserve the `tests/` folder into the mission directory and use it as follows:

1. Before apply, generate the pure candidate merge function and run:

```bash
node tests/local/run_merge_unit_tests.mjs <path-to-generated-supersede-merge-fn.mjs>
```

2. Before apply, build pre/post workflow JSON and run:

```bash
node tests/local/run_workflow_diff_tests.mjs --pre <WF-ME-01_pre.json> --post <WF-ME-01_post.json>
```

3. After apply, run the live E2E cases from:

```text
tests/live/e2e_matrix_f6a_followup_supersede_embed.json
```

4. After live E2E, run SELECT-only DB invariants from:

```text
tests/sql/select_invariants_f6a_followup_supersede_embed.sql
```

5. Capture evidence using:

```text
tests/live/live_evidence_template.md
```

The mission cannot close SUCCESS unless these concrete test artifacts are used or replaced by stricter equivalent tests documented in the closeout.
