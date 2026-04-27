# patch_plan_f5.md — F5 subjective-guard multi-language (Option A rollout)

Date: 2026-04-21.
Frontier: **F5 — subjective-guard multi-language**.
Status: `READY_FOR_APPLY`.
Option: **A — tenant-scoped static locale list.**
Unlocked by: `MEMORY_V2_F5_OPERATOR_DECISION_20260421.md`.
Predecessor proposal: `design_f5_proposal.md` (§2 Option A).

## 1. Scope

Patch two Prep nodes on `WF-ME-01` (`uq26nh1grIpnHju0`) via `n8n-patch.mjs patch-node`:

1. `ME_Memory_Store_Prep` (id `me-phase5mem-store-prep`, type `n8n-nodes-base.code`)
2. `ME_Memory_Supersede_Prep` (id `me-phase5mem-supersede-prep`, same type)

Change surface per node: `parameters.jsCode` only. No schema, no connection deltas, no new nodes, no new credentials.

## 2. Contract of the new jsCode

Additive extension to the v1 Romanian-only subjective guard.

Per Prep node:

1. Required-field validation — **unchanged** from v1.
2. Category normalization + validation — **unchanged** from v1.
3. Locale resolution — **new**:
   - Read `step.inputs.locale`.
   - If it is a non-empty string, normalize: `String(inputs.locale).trim().toLowerCase().split(/[-_]/)[0]` (to accept BCP-47-style tags like `en-US` → `en`).
   - If the normalized primary subtag is in `['ro', 'en']`, use it; otherwise fall back to `'ro'`.
   - Missing (undefined / null / empty string) ⇒ fall back to `'ro'`.
4. Subjective guard — **modified**:
   - Embedded `LOCALE_LISTS` object with one regex array per supported locale.
   - `LOCALE_LISTS.ro` is the v1 list, byte-identical (no churn to the existing Romanian behaviour).
   - `LOCALE_LISTS.en` is the new English list (see §3).
   - Guard still applies only when `inputs.memory_type` ∈ `{'observation', 'pattern'}`.
   - Picks `LOCALE_LISTS[locale]` — locale is guaranteed to be in `{ro, en}` at this point.
   - On match ⇒ `SUBJECTIVE_JUDGMENT_FORBIDDEN` error (error message unchanged).
5. `__db` block construction + passthrough — **unchanged** from v1.

The guard stays **self-contained** (no HTTP, no new module, no new credential). Execution is pure regex matching; cost is sub-ms per call.

## 3. English regex list

Seed list for `LOCALE_LISTS.en`. Scope mirrors the v1 Romanian list: insult nouns, character adjectives, moral judgements. Chosen to avoid false positives on typical neutral observations (e.g. "user prefers X over Y", "user mentioned Z twice in last 3 days").

```js
en: [
  /\b(stupid|dumb|dumber|dumbest)\b/i,
  /\b(idiot|idiots|idiotic)\b/i,
  /\b(moron|morons|moronic|imbecile|imbeciles)\b/i,
  /\b(lazy|lazier|laziest)\b/i,
  /\b(incompetent|incompetents)\b/i,
  /\b(disgusting|revolting|repulsive)\b/i,
  /\b(worthless|pathetic|useless)\b/i,
  /\b(bad|evil|nasty|rotten|awful)\s+(person|character|human|guy|people)\b/i
]
```

Rationale per row:

- Row 1–3: insult / slur nouns and their morphological variants.
- Row 4–5: laziness / competence adjectives — direct parallels to `lene[sș]` and `incompetent` in the v1 RO list.
- Row 6: disgust adjectives — parallel to `dezgustator` in RO.
- Row 7: moral / worth adjectives not in the RO list but standard English character-attacks; added because English users are more likely to use them than the Romanian equivalents.
- Row 8: compound "`adj` + `person|character|…`" — direct parallel to `r[aă]u…\s+(caracter|om|persoana)` in RO.

Known omissions (deliberate):

- Profanity (e.g. asshole, bastard, bitch) — out of scope; handled by separate content-policy upstream layers. Subjective guard is about *judgements*, not vulgarity.
- Mental-health descriptors (e.g. crazy, insane) — too ambiguous; risk false positives on neutral "a crazy deadline this week" content.
- Slurs — covered by upstream content-policy.

Additions / refinements require a new operator decision + DIVERGENCE entry per the stewardship rules.

## 4. Fallback behaviour matrix

| `step.inputs.locale` | Normalized | Effective list |
|---|---|---|
| `"ro"` / `"RO"` / `" ro "` | `ro` | `LOCALE_LISTS.ro` |
| `"en"` / `"EN"` / `"en-US"` / `"en-GB"` / `"en_US"` | `en` | `LOCALE_LISTS.en` |
| `"fr"` / `"de"` / `"xx"` | unsupported | `LOCALE_LISTS.ro` (fallback) |
| missing / null / `""` / non-string | `ro` (default) | `LOCALE_LISTS.ro` |

## 5. Error signature (unchanged)

```json
{
  "_error": true,
  "error_code": "SUBJECTIVE_JUDGMENT_FORBIDDEN",
  "error_message": "Subjective character judgments not allowed under observation/pattern.",
  "missing_fields": []
}
```

(Supersede Prep uses the slightly different wording "Subjective judgment not allowed under observation/pattern." — **preserved verbatim** from v1.)

## 6. Build artefacts

- `artifacts/build_patch_f5.mjs` — single deterministic builder. Emits both params files in one run.
- `artifacts/patchF5_store_prep_params.json` — output for `ME_Memory_Store_Prep`.
- `artifacts/patchF5_supersede_prep_params.json` — output for `ME_Memory_Supersede_Prep`.
- `artifacts/prep_me_memory_store_prep_pre_f5.js` — v1 jsCode dump (audit baseline).
- `artifacts/prep_me_memory_supersede_prep_pre_f5.js` — v1 jsCode dump (audit baseline).
- `artifacts/wf_me_01_pre_f5.json` — full pre-F5 workflow snapshot (audit baseline).

Builder self-checks (build will fail if violated):

- Each emitted `jsCode` contains `SUBJECTIVE_RO` (existing RO array name preserved), `LOCALE_LISTS`, `SUPPORTED_LOCALES`, `SUBJECTIVE_JUDGMENT_FORBIDDEN`, `ME_Validate_Dispatcher_Result`, and the node-specific idempotency prefix (`store_memory:` / `supersede_memory:`).
- Each emitted `jsCode` preserves all six v1 RO regex literal patterns byte-identically.
- Builder refuses to emit if any RO regex string has changed.

## 7. Rollout

Two `patch-node` calls, each is an MCP `mcp__n8n__patch_workflow_nodes` invocation with `patchSpec.set.parameters.jsCode = <new jsCode>`. Each call returns a new `versionId`; the lineage is captured in the `apply_evidence_f5_20260421.md` record.

Since we are autonomous and the mutation MCP `mcp__n8n__patch_workflow_nodes` is allowed here (used identically by F4 via its `n8n-patch.mjs` CLI, which is an equivalent PUT path), we reuse that channel. No new allow prompts expected — the patch tool is already in the loaded toolset.

Dry-run expectation (identical diff shape on both nodes):

- keys modified: `parameters.jsCode` (1 key).
- keys added / removed: none.
- nodeCount / connectionCount: unchanged (45 / 63).

## 8. Smoke plan (per operator decision §4)

Six minimums + one supersede mirror. Execution tenant / thread / ec reused from F4:

- `tenant_id = aaaaaaaa-0000-0000-0000-000000000001`
- `thread_id = 77777777-0000-0000-0000-000000000007`
- `execution_context_id = d4f82a41-01cd-4fb7-9d70-573557348e74`

Idempotency-key scope: `mem-smoke-v2f5:<case>` so F5 rows are auditable but isolated from F1 (`mem-smoke-v2f1`) and F4 (`mem-smoke-v2f4`) scopes.

| Case | Action | locale | memory_type | content (abridged) | Expected |
|---|---|---|---|---|---|
| F5-1 | store | `"ro"` | observation | "Clientul este un prost incompetent." | reject `SUBJECTIVE_JUDGMENT_FORBIDDEN` |
| F5-2 | store | `"en"` | observation | "The user is a lazy idiot." | reject `SUBJECTIVE_JUDGMENT_FORBIDDEN` |
| F5-3 | store | `"en"` | observation | "User prefers morning meetings over evening meetings." | allowed (row inserted) |
| F5-4 | store | _missing_ | pattern | "Om de rău caracter." | reject via `ro` default |
| F5-5 | store | `"xx"` | pattern | "Este dezgustator." | reject via `ro` fallback |
| F5-6 | store | `"en"` | fact | "The user is a lazy idiot." | allowed — guard only runs on observation/pattern |
| F5-7 | supersede | `"en"` | observation | "User is incompetent." + `supersedes_memory_id=<F5-3 id>` | reject `SUBJECTIVE_JUDGMENT_FORBIDDEN` (mirror proof) |

Oracle per case: check `ME_Return_Result`'s final `module_result.status` / top-level `_error.error_code` in the execution trace. For allowed cases, confirm the row landed in `memory_items` with expected tenant/content/memory_type and the F5 idempotency_key.

## 9. Verification

`mcp__n8n__verify_workflow` after each `patch_workflow_nodes` call, expecting:

- `nodeCount=45`, `connectionCount=63` — unchanged.
- Per-node field probe on `parameters.jsCode` — response `got` should contain `LOCALE_LISTS`, `SUBJECTIVE_RO`, and the node-specific idempotency prefix. (No `equals` comparator — matches F4/PatchA precedent.)

## 10. Rollback

Two `patch_workflow_nodes` calls, each restoring `parameters.jsCode` to its v1 content. The v1 jsCode is captured verbatim in `artifacts/prep_me_memory_store_prep_pre_f5.js` and `artifacts/prep_me_memory_supersede_prep_pre_f5.js`. Builder exposes a `--revert` flag option (see §6) or operator can paste the pre-F5 jsCode directly into the `patchSpec.set` payload. No schema / SQL / structural rollback needed.

## 11. Out-of-scope (not residuals — deliberately deferred)

- Automatic language detection heuristic (Option B): rejected by operator. Callers must pass `locale` explicitly for English; missing / unknown defaults to Romanian safety floor.
- External HTTP classifier (Option C): rejected by operator. No network calls in the write path.
- Additional locales (`es`, `fr`, `it`, etc.): deferred. Requires fresh operator decision + regression-style smoke.
- Per-tenant regex overrides (tenant-specific lexicon on top of shared `LOCALE_LISTS`): not requested. If it arrives as a future ask, model it as another DIVERGENCE + patch plan.

## 12. Success criteria

- Both nodes patched, `mcp__n8n__verify_workflow` 2/2 green.
- 7-case smoke green (all expected `SUBJECTIVE_JUDGMENT_FORBIDDEN` emissions fire; all expected allowed rows land).
- `MEMORY_V2_STATE.md` / `MEMORY_V2_PHASE_GATES.md` (F5.0–F5.2) / `MEMORY_V2_DECISION_LEDGER.md` / `SESSION_HANDOFF_NEXT.md` updated.
- `CLOSURE_REPORT_MEMORY_V2_F5.md` written with exact versionId lineage + smoke exec IDs + DB-invariant table.
- `WORK_LOG_MEMORY_V2_F5.md` contains the full audit trail.
