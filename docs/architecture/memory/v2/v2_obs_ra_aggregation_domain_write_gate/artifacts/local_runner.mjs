#!/usr/bin/env node
// local_runner.mjs — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE local oracle.
//
// Loads the POST-patch `jsCode` text of ME_Build_RA_Envelope, executes it
// inside a Node vm context with synthesized $json / $() helpers, and runs
// 50 synthetic test cases across 10 families (L1..L10 × 5). For each case
// it validates the emitted envelope against the JS port of
// ra_logic.validate_aggregation_envelope (ra_logic_js.mjs).
//
// Output:
//   artifacts/runtime/local_<family>_<n>.json — per-case verdict JSON
//   artifacts/runtime/local_summary.json      — aggregate counts
//   artifacts/runtime/local_summary.txt       — human-readable summary
//
// Does NOT touch n8n or DB. Read-only with respect to the repo outside
// artifacts/runtime/.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { validateAggregationEnvelope, rollupStatus } from "./ra_logic_js.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const POST_JS_CODE_PATH = resolve(__dirname, "post/ME_Build_RA_Envelope_post.jsCode.txt");
const RUNTIME_DIR = resolve(__dirname, "runtime");
const JS_CODE = readFileSync(POST_JS_CODE_PATH, "utf8");

// -----------------------------------------------------------------------------
// Helpers to synthesize the n8n runtime shape expected by the Code node.
// ME_Build_RA_Envelope uses only:
//   - $json                            (the incoming item payload)
//   - safeNode('ME_Validate_Dispatcher_Result')  via $(name).first()
// We provide a $() factory that returns { first: () => ({ json: <map[name]> }) }.
// -----------------------------------------------------------------------------
function runNode(srcJson, upstreamContext = {}) {
  const ctxMap = { ME_Validate_Dispatcher_Result: upstreamContext };
  const $ = (name) => ({
    first: () => ({ json: ctxMap[name] || {} }),
  });
  const ctx = { $json: srcJson, $ };
  vm.createContext(ctx);
  const wrapped = `(function(){ ${JS_CODE} })()`;
  return vm.runInContext(wrapped, ctx);
}

// -----------------------------------------------------------------------------
// Fixture factories.
// -----------------------------------------------------------------------------
function makeCanonicalModuleResult(overrides = {}) {
  return {
    module_name: "memory",
    step_id: "step_mem_001",
    result_type: "module_result",
    status: "success",
    summary: "ok",
    actions_executed: [],
    artifacts: [],
    observations: [],
    proposals: [],
    confidence: 0.9,
    needs_followup: false,
    followup_requests: [],
    ...overrides,
  };
}

function makeSuccessSrc({
  module_result = makeCanonicalModuleResult(),
  domain_writes_performed = false,
  execution_context_id = "ctx-1",
  thread_id = "thr-1",
  tenant_id = "tnt-1",
} = {}) {
  return {
    status_kind: "success",
    result_type: "module_result",
    execution_context_id,
    thread_id,
    tenant_id,
    domain_writes_performed,
    module_result,
  };
}

function makeErrorSrc({
  code = "MISSING_REQUIRED_FIELDS",
  message = "missing x",
  missing_fields = ["x"],
  module_name = "memory",
  ctx_step_id = "step_err_001",
} = {}) {
  return {
    src: {
      status_kind: "error",
      result_type: "module_error",
      module_name,
      error: { code, message, missing_fields, details: {} },
    },
    ctx: {
      step: { step_id: ctx_step_id, module_name },
      execution_context_id: "ctx-err-1",
      thread_id: "thr-err-1",
      tenant_id: "tnt-err-1",
    },
  };
}

// -----------------------------------------------------------------------------
// Oracle: run the node, assert envelope shape, run through ra_logic_js.
// -----------------------------------------------------------------------------
function oracle(caseId, family, src, ctx, expectations) {
  let emitted;
  let crashed = null;
  try {
    const out = runNode(src, ctx || {});
    emitted = Array.isArray(out) && out[0] && out[0].json ? out[0].json : out;
  } catch (e) {
    crashed = String(e && e.message ? e.message : e);
  }

  const record = {
    case_id: caseId,
    family,
    expectations,
    crashed,
    emitted: emitted || null,
    verdict: "FAIL",
    fail_reason: null,
  };

  if (crashed) {
    record.fail_reason = "node crashed: " + crashed;
    return record;
  }

  // Envelope top-level shape
  const topChecks = [
    ["status_kind", "success"],
    ["result_type", "module_batch"],
  ];
  for (const [k, v] of topChecks) {
    if (emitted[k] !== v) {
      record.fail_reason = `top-level ${k} expected ${v} got ${emitted[k]}`;
      return record;
    }
  }

  const ai = emitted.aggregation_input || {};
  if (ai.domain_writes_performed !== false) {
    record.fail_reason = `aggregation_input.domain_writes_performed expected false got ${ai.domain_writes_performed}`;
    return record;
  }
  if (ai.aggregation_allowed !== true) {
    record.fail_reason = "aggregation_allowed not true";
    return record;
  }
  if (ai.response_generation_allowed !== false) {
    record.fail_reason = "response_generation_allowed not false";
    return record;
  }
  if (ai.module_execution_completed !== true) {
    record.fail_reason = "module_execution_completed not true";
    return record;
  }

  if (expectations.expect_module_results_count != null) {
    if (!Array.isArray(ai.module_results) || ai.module_results.length !== expectations.expect_module_results_count) {
      record.fail_reason = `module_results count expected ${expectations.expect_module_results_count} got ${ai.module_results && ai.module_results.length}`;
      return record;
    }
  }

  // ra_logic gate check
  const [ok, res] = validateAggregationEnvelope(emitted);
  record.ra_gate_ok = ok;
  record.ra_gate_result = ok ? { accepted: true } : res;
  if (expectations.expect_ra_gate === "accepted" && !ok) {
    record.fail_reason = `ra_logic gate expected accepted, got ${res.error && res.error.code}: ${res.error && res.error.message}`;
    return record;
  }
  if (expectations.expect_ra_gate === "rejected" && ok) {
    record.fail_reason = "ra_logic gate expected rejected but accepted";
    return record;
  }

  // Echo checks
  if (expectations.expect_echo) {
    for (const [k, v] of Object.entries(expectations.expect_echo)) {
      if (emitted[k] !== v) {
        record.fail_reason = `echo ${k} expected ${JSON.stringify(v)} got ${JSON.stringify(emitted[k])}`;
        return record;
      }
    }
  }

  // module_results payload fidelity (L8)
  if (expectations.expect_module_result_payload) {
    const mr = ai.module_results[0];
    for (const [k, v] of Object.entries(expectations.expect_module_result_payload)) {
      const actual = JSON.stringify(mr[k]);
      const expected = JSON.stringify(v);
      if (actual !== expected) {
        record.fail_reason = `module_result.${k} expected ${expected} got ${actual}`;
        return record;
      }
    }
  }

  // expected_step_ids
  if (expectations.expect_step_id) {
    if (!Array.isArray(ai.expected_step_ids) || ai.expected_step_ids[0] !== expectations.expect_step_id) {
      record.fail_reason = `expected_step_ids[0] expected ${expectations.expect_step_id} got ${ai.expected_step_ids && ai.expected_step_ids[0]}`;
      return record;
    }
  }

  record.verdict = "PASS";
  return record;
}

// -----------------------------------------------------------------------------
// Deterministic fixture library per family. Each family yields 5 cases.
// -----------------------------------------------------------------------------
function buildCases() {
  const cases = [];

  // -------- L1 input shape preservation (5) --------
  // Writeful success envelope must preserve all canonical top-level keys and
  // the aggregation_input key set, with the normalized domain_writes_performed.
  const L1Names = ["promote", "supersede", "store", "promote_second_tenant", "supersede_second_thread"];
  L1Names.forEach((label, i) => {
    const mr = makeCanonicalModuleResult({
      module_name: "memory",
      step_id: `step_l1_${i + 1}`,
      summary: `L1.${i + 1} ${label}`,
    });
    const src = makeSuccessSrc({
      module_result: mr,
      domain_writes_performed: true,
      execution_context_id: `ctx-l1-${i + 1}`,
      thread_id: `thr-l1-${i + 1}`,
      tenant_id: `tnt-l1-${i + 1}`,
    });
    cases.push({
      id: `L1.${i + 1}`,
      family: "L1",
      src,
      expectations: {
        expect_ra_gate: "accepted",
        expect_module_results_count: 1,
        expect_step_id: mr.step_id,
        expect_echo: {
          execution_context_id: src.execution_context_id,
          thread_id: src.thread_id,
          tenant_id: src.tenant_id,
        },
      },
    });
  });

  // -------- L2 aggregation guard semantics (5) --------
  // Writeful envelope now passes the domain_writes_performed gate; other
  // guard flag mutations still fail.
  cases.push({
    id: "L2.1",
    family: "L2",
    src: makeSuccessSrc({ domain_writes_performed: true, module_result: makeCanonicalModuleResult({ step_id: "step_l2_1" }) }),
    expectations: { expect_ra_gate: "accepted" },
  });
  // For L2.2..L2.5 we mutate emitted envelope post-hoc to confirm other gates
  // still fire. The runner path will emit a good envelope then mutate inline
  // before calling ra_logic. We pass a post_transform hook via expectations.
  cases.push({
    id: "L2.2",
    family: "L2",
    src: makeSuccessSrc({ domain_writes_performed: false, module_result: makeCanonicalModuleResult({ step_id: "step_l2_2" }) }),
    expectations: {
      expect_ra_gate: "accepted",
      post_mutate: (env) => { env.aggregation_input.aggregation_allowed = false; return "rejected"; },
    },
  });
  cases.push({
    id: "L2.3",
    family: "L2",
    src: makeSuccessSrc({ domain_writes_performed: false, module_result: makeCanonicalModuleResult({ step_id: "step_l2_3" }) }),
    expectations: {
      expect_ra_gate: "accepted",
      post_mutate: (env) => { env.aggregation_input.response_generation_allowed = true; return "rejected"; },
    },
  });
  cases.push({
    id: "L2.4",
    family: "L2",
    src: makeSuccessSrc({ domain_writes_performed: false, module_result: makeCanonicalModuleResult({ step_id: "step_l2_4" }) }),
    expectations: {
      expect_ra_gate: "accepted",
      post_mutate: (env) => { env.aggregation_input.module_execution_completed = false; return "rejected"; },
    },
  });
  cases.push({
    id: "L2.5",
    family: "L2",
    src: makeSuccessSrc({ domain_writes_performed: false, module_result: makeCanonicalModuleResult({ step_id: "step_l2_5", status: "success" }) }),
    expectations: {
      expect_ra_gate: "accepted",
      post_mutate: (env) => {
        env.aggregation_input.module_results[0].step_id = "step_other";
        return "rejected"; // expected_step_ids no longer covered
      },
    },
  });

  // -------- L3 promote happy-path batch (5) --------
  for (let i = 0; i < 5; i++) {
    const mr = makeCanonicalModuleResult({
      module_name: "memory",
      step_id: `step_promote_l3_${i + 1}`,
      summary: `promote_memory happy ${i + 1}`,
      actions_executed: [{ type: "db_update", table: "memory_items", effect: "tier=long_term" }],
    });
    const src = makeSuccessSrc({ module_result: mr, domain_writes_performed: true });
    cases.push({
      id: `L3.${i + 1}`,
      family: "L3",
      src,
      expectations: { expect_ra_gate: "accepted", expect_step_id: mr.step_id, expect_module_results_count: 1 },
    });
  }

  // -------- L4 supersede happy-path batch (5) --------
  for (let i = 0; i < 5; i++) {
    const mr = makeCanonicalModuleResult({
      module_name: "memory",
      step_id: `step_supersede_l4_${i + 1}`,
      summary: `supersede_memory happy ${i + 1}`,
      actions_executed: [{ type: "db_update", table: "memory_items", effect: "supersede" }],
    });
    const src = makeSuccessSrc({ module_result: mr, domain_writes_performed: true });
    cases.push({
      id: `L4.${i + 1}`,
      family: "L4",
      src,
      expectations: { expect_ra_gate: "accepted", expect_step_id: mr.step_id, expect_module_results_count: 1 },
    });
  }

  // -------- L5 deny-path preservation (5) --------
  // Module-level denial emits success with status "success" at envelope level
  // (the module outcome is denial but still a canonical module_result). RA
  // must accept the envelope (status_kind=success, result_type=module_batch).
  const denialShapes = [
    { status: "success", summary: "acceptance_criteria_not_met", reason: "acceptance_criteria_not_met" },
    { status: "success", summary: "INVALID_PROMOTION_TARGET", reason: "INVALID_PROMOTION_TARGET" },
    { status: "success", summary: "SUPERSEDE_TARGET_INVALID", reason: "SUPERSEDE_TARGET_INVALID" },
    { status: "no_action", summary: "frozen candidate", reason: "frozen" },
    { status: "no_action", summary: "policy blocked", reason: "policy" },
  ];
  denialShapes.forEach((d, i) => {
    const mr = makeCanonicalModuleResult({
      status: d.status,
      step_id: `step_deny_l5_${i + 1}`,
      summary: d.summary,
      observations: [{ type: "denial", code: d.reason }],
    });
    const src = makeSuccessSrc({ module_result: mr, domain_writes_performed: false });
    cases.push({
      id: `L5.${i + 1}`,
      family: "L5",
      src,
      expectations: { expect_ra_gate: "accepted", expect_step_id: mr.step_id },
    });
  });

  // -------- L6 read-only path preservation (5) --------
  const readOnlyShapes = [
    { module: "memory", step: "step_search_l6_1", summary: "search hits" },
    { module: "memory", step: "step_search_l6_2", summary: "search empty" },
    { module: "memory", step: "step_recall_l6_3", summary: "recall hot" },
    { module: "memory", step: "step_recall_l6_4", summary: "recall cold" },
    { module: "memory", step: "step_recall_l6_5", summary: "recall tenant-scoped" },
  ];
  readOnlyShapes.forEach((r, i) => {
    const mr = makeCanonicalModuleResult({
      module_name: r.module,
      step_id: r.step,
      summary: r.summary,
    });
    // Read-only: domain_writes_performed not set upstream (undefined → !!undefined === false pre-fix; false post-fix; identical).
    const src = makeSuccessSrc({ module_result: mr, domain_writes_performed: false });
    cases.push({
      id: `L6.${i + 1}`,
      family: "L6",
      src,
      expectations: { expect_ra_gate: "accepted", expect_step_id: mr.step_id },
    });
  });

  // -------- L7 module_error branch preservation (5) --------
  const errorShapes = [
    { code: "MISSING_REQUIRED_FIELDS", message: "missing content", missing: ["content"], step: "step_err_l7_1" },
    { code: "MISSING_REQUIRED_FIELDS", message: "missing candidate_id", missing: ["candidate_id"], step: "step_err_l7_2" },
    { code: "MALFORMED_INPUT", message: "bad target ref", missing: [], step: "step_err_l7_3" },
    { code: "SCHEMA_VIOLATION", message: "schema bad", missing: [], step: "step_err_l7_4" },
    { code: "INVALID_CONTEXT_ID", message: "ctx id bad", missing: ["execution_context_id"], step: "step_err_l7_5" },
  ];
  errorShapes.forEach((e, i) => {
    const { src, ctx } = makeErrorSrc({
      code: e.code,
      message: e.message,
      missing_fields: e.missing,
      ctx_step_id: e.step,
    });
    cases.push({
      id: `L7.${i + 1}`,
      family: "L7",
      src,
      ctx,
      expectations: {
        expect_ra_gate: "accepted",
        expect_module_results_count: 1,
        expect_step_id: e.step,
      },
    });
  });

  // -------- L8 downstream envelope invariants (5) --------
  // Emitted envelope preserves module_results[0] payload fields byte-for-byte.
  for (let i = 0; i < 5; i++) {
    const mr = makeCanonicalModuleResult({
      module_name: "memory",
      step_id: `step_l8_${i + 1}`,
      summary: `L8 fidelity ${i + 1}`,
      actions_executed: [{ type: "x", a: i + 1 }],
      artifacts: [{ k: `v${i + 1}` }],
      observations: [{ type: "note", msg: `note-${i + 1}` }],
      proposals: [{ p: i + 1 }],
      confidence: 0.5 + i * 0.1,
      needs_followup: i % 2 === 0,
      followup_requests: i % 2 === 0 ? [{ why: `f-${i + 1}` }] : [],
    });
    const src = makeSuccessSrc({ module_result: mr, domain_writes_performed: true });
    cases.push({
      id: `L8.${i + 1}`,
      family: "L8",
      src,
      expectations: {
        expect_ra_gate: "accepted",
        expect_module_result_payload: {
          actions_executed: mr.actions_executed,
          artifacts: mr.artifacts,
          observations: mr.observations,
          proposals: mr.proposals,
          confidence: mr.confidence,
          needs_followup: mr.needs_followup,
          followup_requests: mr.followup_requests,
        },
      },
    });
  }

  // -------- L9 replay / idempotent consistency (5) --------
  // Same src → same envelope across two invocations. Encoded via a `replay`
  // flag the runner interprets.
  for (let i = 0; i < 5; i++) {
    const mr = makeCanonicalModuleResult({ step_id: `step_l9_${i + 1}` });
    const src = makeSuccessSrc({ module_result: mr, domain_writes_performed: true });
    cases.push({
      id: `L9.${i + 1}`,
      family: "L9",
      src,
      expectations: { expect_ra_gate: "accepted", replay_check: true },
    });
  }

  // -------- L10 mixed-status / partial rollup behavior (5) --------
  // Since ME_Build_RA_Envelope only wraps one module_result at a time, we
  // simulate the rollup by expanding ai.module_results post-hoc (adds
  // readonly / failed siblings) and assert ra_logic still accepts and the
  // rollup function returns the expected status.
  const mixed = [
    { siblings: [{ status: "success", step: "readonly_1", mod: "memory" }], expected: "success" },
    { siblings: [{ status: "no_action", step: "noop_1", mod: "memory" }], expected: "partial" },
    { siblings: [{ status: "failed", step: "failed_1", mod: "memory" }], expected: "partial" },
    { siblings: [{ status: "partial", step: "partial_1", mod: "memory" }], expected: "partial" },
    { siblings: [{ status: "success", step: "readonly_2", mod: "memory" }, { status: "failed", step: "failed_2", mod: "memory" }], expected: "partial" },
  ];
  mixed.forEach((m, i) => {
    const primary = makeCanonicalModuleResult({ step_id: `step_l10_${i + 1}` });
    const src = makeSuccessSrc({ module_result: primary, domain_writes_performed: true });
    cases.push({
      id: `L10.${i + 1}`,
      family: "L10",
      src,
      expectations: {
        expect_ra_gate: "accepted",
        post_expand: m.siblings.map((s) => makeCanonicalModuleResult({ module_name: s.mod, step_id: s.step, status: s.status })),
        expected_rollup: m.expected,
      },
    });
  });

  return cases;
}

// -----------------------------------------------------------------------------
// Run all cases. Handle post_mutate / post_expand / replay_check.
// -----------------------------------------------------------------------------
function runAll() {
  const cases = buildCases();
  const records = [];

  for (const c of cases) {
    let emitted;
    let crashed = null;
    try {
      const out = runNode(c.src, c.ctx || {});
      emitted = Array.isArray(out) && out[0] && out[0].json ? out[0].json : out;
    } catch (e) {
      crashed = String(e && e.message ? e.message : e);
    }

    const rec = {
      case_id: c.id,
      family: c.family,
      verdict: "FAIL",
      fail_reason: null,
      crashed,
    };

    if (crashed) {
      rec.fail_reason = "node crashed: " + crashed;
      records.push(rec);
      continue;
    }

    // Baseline shape checks
    const topOk = emitted && emitted.status_kind === "success" && emitted.result_type === "module_batch";
    if (!topOk) {
      rec.fail_reason = `top-level not success/module_batch: ${JSON.stringify(emitted)}`;
      records.push(rec);
      continue;
    }
    if (!emitted.aggregation_input) {
      rec.fail_reason = "no aggregation_input";
      records.push(rec);
      continue;
    }
    if (emitted.aggregation_input.domain_writes_performed !== false) {
      rec.fail_reason = `domain_writes_performed != false (got ${emitted.aggregation_input.domain_writes_performed})`;
      records.push(rec);
      continue;
    }

    // Expectation hooks
    const exp = c.expectations || {};

    if (exp.post_mutate) {
      const mutated = JSON.parse(JSON.stringify(emitted));
      const expectResult = exp.post_mutate(mutated); // "accepted" or "rejected"
      const [ok] = validateAggregationEnvelope(mutated);
      if (expectResult === "rejected" && ok) { rec.fail_reason = "post_mutate expected rejection but accepted"; records.push(rec); continue; }
      if (expectResult === "accepted" && !ok) { rec.fail_reason = "post_mutate expected accepted but rejected"; records.push(rec); continue; }
    }

    const [ok, res] = validateAggregationEnvelope(emitted);
    rec.ra_gate_ok = ok;
    if (!ok) rec.ra_gate_err = res && res.error;
    if (exp.expect_ra_gate === "accepted" && !ok) {
      rec.fail_reason = `ra_logic rejected: ${res && res.error && res.error.code}: ${res && res.error && res.error.message}`;
      records.push(rec);
      continue;
    }

    if (exp.expect_module_results_count != null) {
      if (emitted.aggregation_input.module_results.length !== exp.expect_module_results_count) {
        rec.fail_reason = `module_results count mismatch`;
        records.push(rec);
        continue;
      }
    }

    if (exp.expect_step_id) {
      if (emitted.aggregation_input.expected_step_ids[0] !== exp.expect_step_id) {
        rec.fail_reason = `expected_step_ids[0] mismatch`;
        records.push(rec);
        continue;
      }
    }

    if (exp.expect_echo) {
      for (const [k, v] of Object.entries(exp.expect_echo)) {
        if (emitted[k] !== v) { rec.fail_reason = `echo ${k} mismatch`; break; }
      }
      if (rec.fail_reason) { records.push(rec); continue; }
    }

    if (exp.expect_module_result_payload) {
      const mr = emitted.aggregation_input.module_results[0];
      for (const [k, v] of Object.entries(exp.expect_module_result_payload)) {
        if (JSON.stringify(mr[k]) !== JSON.stringify(v)) { rec.fail_reason = `module_result.${k} fidelity mismatch`; break; }
      }
      if (rec.fail_reason) { records.push(rec); continue; }
    }

    if (exp.replay_check) {
      const out2 = runNode(c.src, c.ctx || {});
      const env2 = Array.isArray(out2) && out2[0] && out2[0].json ? out2[0].json : out2;
      if (JSON.stringify(env2) !== JSON.stringify(emitted)) {
        rec.fail_reason = `replay produced different envelope`;
        records.push(rec); continue;
      }
    }

    if (exp.post_expand && Array.isArray(exp.post_expand)) {
      const expanded = JSON.parse(JSON.stringify(emitted));
      for (const sib of exp.post_expand) {
        expanded.aggregation_input.module_results.push(sib);
        expanded.aggregation_input.expected_step_ids.push(sib.step_id);
      }
      const [ok2] = validateAggregationEnvelope(expanded);
      if (!ok2) { rec.fail_reason = `post_expand ra_logic rejected`; records.push(rec); continue; }
      const rollup = rollupStatus(expanded.aggregation_input.module_results);
      if (exp.expected_rollup && rollup !== exp.expected_rollup) {
        rec.fail_reason = `rollup expected ${exp.expected_rollup} got ${rollup}`;
        records.push(rec); continue;
      }
      rec.rollup_status = rollup;
    }

    rec.verdict = "PASS";
    records.push(rec);
  }

  return records;
}

// -----------------------------------------------------------------------------
// Persist per-case JSON + summary.
// -----------------------------------------------------------------------------
function persist(records) {
  for (const r of records) {
    const fp = resolve(RUNTIME_DIR, `local_${r.case_id.replace(".", "_")}.json`);
    writeFileSync(fp, JSON.stringify(r, null, 2) + "\n");
  }

  const families = {};
  for (const r of records) {
    const f = r.family;
    families[f] = families[f] || { pass: 0, fail: 0, total: 0 };
    families[f].total += 1;
    if (r.verdict === "PASS") families[f].pass += 1;
    else families[f].fail += 1;
  }
  const totalPass = records.filter((r) => r.verdict === "PASS").length;
  const totalFail = records.length - totalPass;

  const summary = {
    total: records.length,
    pass: totalPass,
    fail: totalFail,
    by_family: families,
    failures: records.filter((r) => r.verdict !== "PASS").map((r) => ({ case_id: r.case_id, fail_reason: r.fail_reason })),
  };
  writeFileSync(resolve(RUNTIME_DIR, "local_summary.json"), JSON.stringify(summary, null, 2) + "\n");

  const lines = [];
  lines.push(`Local oracle summary — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE`);
  lines.push(`total: ${summary.total}  pass: ${summary.pass}  fail: ${summary.fail}`);
  lines.push(``);
  lines.push(`Family totals:`);
  for (const [f, t] of Object.entries(families).sort()) {
    lines.push(`  ${f}: ${t.pass}/${t.total}`);
  }
  if (summary.failures.length) {
    lines.push(``);
    lines.push(`Failures:`);
    for (const f of summary.failures) {
      lines.push(`  ${f.case_id}: ${f.fail_reason}`);
    }
  }
  writeFileSync(resolve(RUNTIME_DIR, "local_summary.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
}

const records = runAll();
persist(records);
