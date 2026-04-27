# AMBIGUOUS CONTENT GUARDS · Design Freeze

> Mission: `AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP`
> Authority: subordinate to `Architecture_Spec_v3_Ucenicul.md`; mirrors
> `IMPROVEMENT_MODULE_LIVE_EXECUTION` precedent for ME Prep guards.

---

## 1. Frozen decisions

| # | Decision |
|---|---|
| D1 | Guards live in **ME Prep nodes only** (`ME_Task_Create_Prep`, `ME_Memory_Store_Prep`). |
| D2 | No PL changes. PL's `stripVerbPrefix` / `stripMemoryWritePrefix` and the `\|\| g` fallback stay byte-identical. |
| D3 | No DB node changes. Existing `queryReplacement` `_error ? [null,…] : […]` short-circuit handles the no-write path. |
| D4 | No Result node changes. Both Result nodes already propagate `_error` (Task via `safeNode(Prep)`, Memory via `$json._error` continueOnFail passthrough). |
| D5 | Reject codes: `AMBIGUOUS_OR_EMPTY_TASK` and `AMBIGUOUS_OR_EMPTY_MEMORY` (uppercase, `_OR_EMPTY_` middle, mirroring `AMBIGUOUS_OR_EMPTY_FEEDBACK`). |
| D6 | Min content lengths (after defense-in-depth strip + trim): `MIN_TASK_LEN = 6`, `MIN_MEMORY_LEN = 6`. Chosen so that `"asta"` (4), `"X"` (1), `"do X"` (4) reject; legitimate short facts like `"TVA 19%"` (7), names with context, etc. pass. |
| D7 | Demonstrative-only regex rejects: `asta`, `aceasta`, `aia`, `acea`, `aceea`, `chestia`, `cestia`, `the thing`, `something`, `ceva`, `that`, `this`, plus any of these followed by another demonstrative or a `pentru mine / for me / for us / pentru noi` qualifier. |
| D8 | Bare-reminder regex (task only) rejects: a `description` whose normalized form (after defense-in-depth strip) collapses to `amintește-mi`, `aminteste-mi`, `remind me`, `reminder`, `aminteste`, etc. with no body. |
| D9 | Apply channel: V2-028 canonical local `n8n-patch.mjs replace`. **No Path 5**, **no MCP `patch_workflow_nodes`**, **no duplicate workflow**. |
| D10 | Out-of-scope: Memory V2 reopen, schema migration, broader planner rewrite, IMPROVEMENT_MODULE_LIST, MEMORY_SUPERSEDE_PL_INTENTMAP, MEMORY_RECALL_PL_INTENTMAP. |

## 2. Reject envelope contract

Returned from a guarded Prep node when input is ambiguous:

```json
{
  "_error": true,
  "error_code": "AMBIGUOUS_OR_EMPTY_TASK",        // or AMBIGUOUS_OR_EMPTY_MEMORY
  "error_message": "<short Romanian/English explanation>",
  "missing_fields": ["title_or_description"],     // or ["content"]
  "needs_followup": true
}
```

Downstream effects (per existing chain wiring):

- DB node: `queryReplacement` evaluates `$json._error` truthy → all-null parameter array; Postgres v2.4 query executes with NULL `tenant_id::uuid` in the WHERE clause / VALUES; `continueOnFail: true` swallows the resulting NotNullViolation; **no row written**.
- Result node: reads either `safeNode(Prep)._error` (Task) or `$json._error` (Memory continueOnFail passthrough); emits canonical envelope with `_error: true, error_code, error_message`. RC consumes the typed error and emits a user-safe Romanian summary asking for clarification (existing behavior, verified for AMBIGUOUS_OR_EMPTY_FEEDBACK).
- Aggregate flags emitted by ME for that step: `module_execution_started: false, domain_writes_performed: false, response_generation_allowed: false`. (These flags propagate honestly because the Result short-circuit returns early before composing the success envelope.)

## 3. Guard pseudocode — `ME_Task_Create_Prep`

Inserted **after** the existing missing-fields check and **before** the priority/due_at parsing block:

```js
// AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP — added 2026-04-25.
// Mirrors ME_Improvement_Capture_Prep's AMBIGUOUS_OR_EMPTY_FEEDBACK pattern.
const MIN_TASK_LEN = 6;

// Compose effective content for guard evaluation; prefer description, fall back to title.
let effective = (description || title || '').trim();

// Defense-in-depth: PL already strips most prefixes, but the OR-fallback in PL can put
// them back. Re-strip leading task/reminder verbs so this guard also catches the case
// where PL handed the original goal verbatim because its strip emptied the content.
effective = effective
  .replace(/[!.?,;:\s]+$/u, '')
  .replace(/^\s*(?:amintest?e[\-\s]?(?:m[ăa]|mi|ne)|reminder|remind\s+(?:me|us))\s*[:\-–,]?\s*/iu, '')
  .replace(/^\s*(?:f[ăa]|fa|do|make|create|cre(?:ea[zș]ă|az[ăa]))\s*[:\-–,]?\s*/iu, '')
  .replace(/^\s*(?:t[ăa]sk|task|to[\-\s]?do|todo)\s*[:\-–]\s*/iu, '')
  .replace(/[!.?,;:\s]+$/u, '')
  .trim();

if (!effective || effective.length < MIN_TASK_LEN) {
  return [{ json: {
    _error: true,
    error_code: 'AMBIGUOUS_OR_EMPTY_TASK',
    error_message: 'Task content is empty or too short — please specify what to do.',
    missing_fields: ['title_or_description'],
    needs_followup: true
  }}];
}

// Demonstrative-only: content is just pronouns/demonstratives, optionally followed by
// a "pentru mine / for me / for us / pentru noi" qualifier. No concrete object.
const DEMONSTRATIVE_ONLY = /^(?:chestia|cestia|the\s+thing|something|ceva|asta|aceasta|aia|acea|aceea|that|this)(?:\s+(?:asta|aceasta|aia|acea|aceea|that|this))?(?:\s+(?:pentru|for)\s+(?:mine|me|noi|us))?$/iu;
if (DEMONSTRATIVE_ONLY.test(effective)) {
  return [{ json: {
    _error: true,
    error_code: 'AMBIGUOUS_OR_EMPTY_TASK',
    error_message: 'Task has no concrete object (only demonstrative pronouns) — please specify what to do.',
    missing_fields: ['title_or_description'],
    needs_followup: true
  }}];
}
```

## 4. Guard pseudocode — `ME_Memory_Store_Prep`

Inserted **after** the existing required-fields + category-shape checks, **before** the subjective-judgment block (so the more specific subjective guard still fires when applicable):

```js
// AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP — added 2026-04-25.
const MIN_MEMORY_LEN = 6;

let effective = String(inputs.content).trim();

// Defense-in-depth: PL already strips most "Ține minte că ..." prefixes, but if PL
// fell back to the original goal, re-strip here.
effective = effective
  .replace(/[!.?,;:\s]+$/u, '')
  .replace(/^\s*(?:[țt]ine\s+minte\s+(?:c[ăa]\s+)?|reține\s+(?:c[ăa]\s+)?|noteaz[aă]\s+(?:c[ăa]\s+)?|salveaz[aă]\s+(?:c[ăa]\s+)?|memoreaz[aă]\s+(?:c[ăa]\s+)?|[îi]nregistreaz[aă]\s+(?:c[ăa]\s+)?|remember\s+(?:that\s+)?|note\s+(?:that\s+)?|save\s+(?:that\s+)?|memo(?:rize)?\s+(?:that\s+)?)/iu, '')
  .replace(/[!.?,;:\s]+$/u, '')
  .trim();

if (!effective || effective.length < MIN_MEMORY_LEN) {
  return [{ json: {
    _error: true,
    error_code: 'AMBIGUOUS_OR_EMPTY_MEMORY',
    error_message: 'Memory content is empty or too short for durable storage — please specify what to remember.',
    missing_fields: ['content'],
    needs_followup: true
  }}];
}

const PURE_DEMONSTRATIVE = /^(?:chestia|cestia|the\s+thing|something|ceva|asta|aceasta|aia|acea|aceea|that|this)(?:\s+(?:asta|aceasta|aia|acea|aceea|that|this))?\s*$/iu;
if (PURE_DEMONSTRATIVE.test(effective)) {
  return [{ json: {
    _error: true,
    error_code: 'AMBIGUOUS_OR_EMPTY_MEMORY',
    error_message: 'Memory content is purely demonstrative — please specify what to remember.',
    missing_fields: ['content'],
    needs_followup: true
  }}];
}
```

## 5. Acceptance reasoning per failing C7 case

| Case | After PL extraction | Effective after Prep strip | Match? | Verdict |
|---|---|---|---|---|
| RC-C7-01 | `description="chestia aia pentru mine"` | `"chestia aia pentru mine"` (length=23, > MIN_TASK_LEN) | DEMONSTRATIVE_ONLY: `^chestia\s+aia\s+pentru\s+mine$` ✅ matches | rejected — `AMBIGUOUS_OR_EMPTY_TASK` |
| RC-C7-05 | `content="asta"` | `"asta"` (length=4, < MIN_MEMORY_LEN=6) | length check fires first | rejected — `AMBIGUOUS_OR_EMPTY_MEMORY` |
| RC-C7-07 | `description="Amintește-mi."` (PL fallback `\|\| g`) | strip removes `"."` → `"Amintește-mi"` → leading-verb strip removes `"Amintește-mi"` → `""` | length check (empty) fires | rejected — `AMBIGUOUS_OR_EMPTY_TASK` |

Cross-check against legitimate inputs (must NOT reject):

| Legitimate input | Effective | Pass? |
|---|---|---|
| `description="regression smoke pentru chain post-improvement"` | unchanged (length=46, no demonstrative pattern) | ✅ pass |
| `description="pregătește contractul cu clientul X"` | `"pregătește contractul cu clientul X"` | ✅ pass |
| `description="validate regression smoke"` (post PL strip of "Remind me tomorrow at 17 to") | `"validate regression smoke"` (length=25) | ✅ pass |
| `content="prefer întâlnirile online via Google Meet, nu Zoom"` | unchanged | ✅ pass |
| `content="adresa noastră de billing este billing@ucenicul.test"` | unchanged | ✅ pass |
| `content="our annual planning session is in November"` | strip leading `remember that` → original (no leading match) | ✅ pass |

## 6. P0 invariants reasoning

- ✅ Cross-tenant isolation unaffected: guard runs before `__db.tenant_id` is composed; on reject, no DB row attempted.
- ✅ Idempotency unaffected: legitimate paths still flow Prep → DB; the SELECT-before-INSERT CTEs still hold replay guarantees.
- ✅ `public.reminders` write count: 0 (out of scope; reminder-as-task path stays valid for legitimate reminder inputs).
- ✅ Schema mutation: 0.
- ✅ Workflow duplicate: 0 (single-workflow PUT replace via V2-028).
- ✅ Path 5: not used.
- ✅ Memory V2 reopen: not done — this is a Prep-layer guard, not a Memory V2 internals change. Memory V2 design freeze, write-fence, and decision ledger are not touched.

## 7. Apply plan

1. Pull live `WF-ME-01` JSON.
2. Compute new `parameters.jsCode` for `ME_Task_Create_Prep` (existing prologue + guard injection + existing tail).
3. Compute new `parameters.jsCode` for `ME_Memory_Store_Prep` (existing prologue + guard injection + existing tail).
4. Build the PUT-ready JSON with only `name, nodes, connections, settings` (V2-028 whitelist).
5. Run `node n8n-patch.mjs replace uq26nh1grIpnHju0 <next.json> --reactivate`.
6. Verify post-apply: workflow versionId changes; node count stays 61; connection count stays 79; jsCode of the 2 nodes contains the new `AMBIGUOUS_OR_EMPTY_*` literals; no other node bytes change.
7. Run live test matrix.
