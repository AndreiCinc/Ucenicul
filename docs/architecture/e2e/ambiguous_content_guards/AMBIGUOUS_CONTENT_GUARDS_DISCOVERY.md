# AMBIGUOUS CONTENT GUARDS · Discovery

> Mission: `AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP`
> Predecessor: `E2E_REMAINING_CORRIDORS_PHASE1_PARTIAL_WITH_BLOCKERS`

---

## 1. Failing C7 cases inspected

Source: `docs/architecture/e2e/remaining_corridors_phase1/REMAINING_CORRIDORS_PHASE1_RUNTIME_RESULTS.md` §3 (C7 — Ambiguous (partial)) and §4.1 (P0 finding).

| Case | Goal text | Action | Side effect | Should be |
|---|---|---|---|---|
| RC-C7-01 | `"Fă chestia aia pentru mine."` | `create_task` | `tasks` row title=`"chestia aia pentru mine"` (length=23) | rejected — `AMBIGUOUS_OR_EMPTY_TASK` |
| RC-C7-05 | `"Ține minte asta."` | `store_memory` | `memory_items` row content=`"asta"` (length=4) | rejected — `AMBIGUOUS_OR_EMPTY_MEMORY` |
| RC-C7-07 | `"Amintește-mi."` | `create_reminder→create_task` | `tasks` row title=`"Amintește-mi"` (length=12) | rejected — `AMBIGUOUS_OR_EMPTY_TASK` |

The 4th C7 ambiguous corridor case (RC-C7-06 `"Sugestie:"` empty feedback) was already rejected by the existing `ME_Improvement_Capture_Prep.AMBIGUOUS_OR_EMPTY_FEEDBACK` guard — that case is the proof-of-pattern for this mission.

## 2. PL extraction trace for each failing case

Source: `WF-PL-01.PL_Build_Planner_Input.parameters.jsCode` v2.2 (versionId `dce0febe-…`).

### 2.1 C7-01 — `"Fă chestia aia pentru mine."` → `create_task`

`extractInputsForAction('create_task', g)` calls `stripVerbPrefix(g)`:

1. `[.!?]+\s*$` strip → `"Fă chestia aia pentru mine"`
2. Trailing temporal/reminder strip → no match → unchanged
3. Leading verb strip — pattern matches `f[ăa]\s+` → strips `"Fă "` → `"chestia aia pentru mine"`
4. Returns `"chestia aia pentru mine"` (length=23)

Result inputs: `{description: "chestia aia pentru mine", due_type: "flexible", due_date: null, due_at: null}`. 
ME_Task_Create_Prep currently passes the existing `if (!description && !title)` check (description is non-empty) → DB writes a row.

### 2.2 C7-05 — `"Ține minte asta."` → `store_memory`

`extractInputsForAction('store_memory', g)` calls `stripMemoryWritePrefix(g)`:

1. `[.!?]+\s*$` strip → `"Ține minte asta"`
2. Leading-verb strip — pattern matches `[țt]ine\s+minte\s+(?:c[ăa]\s+)?` → strips `"Ține minte "` → `"asta"`
3. Returns `"asta"` (length=4)

Result inputs: `{content: "asta", memory_type: "fact", category: "general"}`. 
ME_Memory_Store_Prep currently passes the existing `required.filter(...)` check (content is non-empty after trim) → DB writes a row with content=`"asta"`.

### 2.3 C7-07 — `"Amintește-mi."` → `create_reminder → create_task`

`extractInputsForAction('create_task', g)` (called via the `create_reminder → create_task` late-binding rewrite) calls `stripVerbPrefix(g)`:

1. `[.!?]+\s*$` strip → `"Amintește-mi"`
2. Trailing temporal/reminder strip → no match
3. Leading verb strip — pattern matches `amintest?e[\-\s]?mi(?:\s+s[ăa])?` → strips the entire `"Amintește-mi"` → `""`
4. Returns `"".trim() = ""`
5. **`description = stripVerbPrefix(g) || g`** → since strip returned empty, fallback to the original `g` → `"Amintește-mi."`

Result inputs: `{description: "Amintește-mi.", due_type: "flexible", ...}`. 
ME_Task_Create_Prep currently passes the existing missing-fields check (description non-empty) → DB writes a row with title=`"Amintește-mi"` (the trailing period gets clipped somewhere in title.slice(0, 240) flow or the message normalizer).

The OR fallback `stripVerbPrefix(g) || g` is the structural reason a bare reminder verb survives PL — and it's correct as a defense against over-stripping legitimate inputs (e.g., a user types `"creează"` with no body — over-strip would lose context). The right place to detect this is **after final extraction**, in the ME Prep layer, where the Prep node sees the actual, post-fallback `description` and can decide if the content is meaningful.

## 3. ME_Improvement_Capture_Prep guard pattern (reference)

```js
const MIN_LEN = 4;
if (!content || content.length < MIN_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_FEEDBACK',
    error_message: 'Feedback content is empty or too short to capture meaningfully.',
    missing_fields: !content ? ['feedback_content'] : [] }}];
}

content = content.replace(/^\s*(?:sugestie|propunere|feedback)\s*[:\-–]\s*/i, '');
content = content.replace(/^\s*(?:am\s+o\s+sugestie|am\s+o\s+propunere)\s*[:\-–]?\s*/i, '');
content = content.trim();
if (!content || content.length < MIN_LEN) {
  return [{ json: { _error: true, error_code: 'AMBIGUOUS_OR_EMPTY_FEEDBACK', ... }}];
}
```

Behaviors:

- Strips defensive leading verbs even though PL already stripped them once (defense-in-depth).
- Re-checks length after second strip — catches the case where PL's fallback put the verb back in.
- Returns `_error: true` with a typed `error_code`. The DB node's `queryReplacement` evaluates `$json._error ? [null,…] : […]`, sending all-null params to a parameterized query whose first WHERE-clause fails (no row inserted). The Result node reads `safeNode('ME_Improvement_Capture_Prep')` (or `$json._error` for Memory) and emits the typed error in the canonical envelope.

Verified empirically by `IMPROVEMENT_MODULE_CLOSEOUT.md` §"Acceptance #8" — `"Sugestie:"` produced 0 row.

## 4. ME_Task_Create_Prep current behavior

Current `parameters.jsCode` (artifact `ME_Task_Create_Prep.pre.js`):

```js
const description = (inputs.description != null ? String(inputs.description) : '').trim();
const title       = (inputs.title       != null ? String(inputs.title)       : '').trim();
if (!description && !title) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', ...}}];
}
```

Only check is "non-empty title or description." Accepts:

- `description: "asta"` ❌ would write
- `description: "chestia aia pentru mine"` ❌ would write
- `description: "Amintește-mi."` ❌ would write

ME_Task_Create_Result already uses `safeNode('ME_Task_Create_Prep')` and handles `prep._error` short-circuit. So adding a Prep guard requires **only** the Prep jsCode rewrite — Result code stays byte-identical.

## 5. ME_Memory_Store_Prep current behavior

Current `parameters.jsCode` (artifact `ME_Memory_Store_Prep.pre.js`):

```js
const required = ['content','memory_type','category','source_thread_id'];
const VALID_TYPES = ['fact','observation','pattern','inference','preference','constraint'];
const missing = required.filter(k => !inputs[k] || (typeof inputs[k] === 'string' && !inputs[k].trim()));
…
```

Only check is "non-empty content." Accepts:

- `content: "asta"` ❌ would write
- `content: "X"` ❌ would write

A subjective-judgment guard exists (for `observation`/`pattern` memory types only) — **does not protect** `fact` (the default for store_memory). 

ME_Memory_Store_Result reads `$json._error` (not `safeNode('ME_Memory_Store_Prep')`). With the DB node's `continueOnFail: true` and the queryReplacement `_error ? all-nulls : payload`, the SQL fires with all-null parameters and fails the NOT NULL constraint on `tenant_id`. n8n's `continueOnFail` semantics preserve the input item's fields when the operation throws → `$json._error === true` continues to be visible in the Result node — same propagation pattern proven by the F14 + Improvement closeouts. 

## 6. PL alternative considered — rejected

Putting the guard in `WF-PL-01.PL_Build_Planner_Input.extractInputsForAction` was considered. Rejected because:

1. **Doesn't close all entry points.** Module envelopes can arrive at ME from non-PL upstreams (manual injection, future planners, alternative dispatchers). ME Prep is the canonical "last gate" before DB writes.
2. **Removing the OR fallback breaks legitimate paths.** `description = stripVerbPrefix(g) || g` exists to preserve content when stripping over-removes. Removing it would regress legitimate inputs that happen to contain a verb prefix as substring of the meaningful content.
3. **PL would still emit a bad envelope downstream.** Even if PL detects ambiguity, the cleanest user-safe response comes from the module Prep that owns the contract for that domain.
4. **Pack guidance** (`§"Required discovery" #6`): "ME Prep guard preferred if it protects all entry points."

## 7. Guard placement decision

✅ **ME Prep guards** (two jsCode rewrites):

| Node | Guard added | Reject code |
|---|---|---|
| `WF-ME-01.ME_Task_Create_Prep` | MIN_TASK_LEN + demonstrative-only + bare-reminder regex | `AMBIGUOUS_OR_EMPTY_TASK` |
| `WF-ME-01.ME_Memory_Store_Prep` | MIN_MEMORY_LEN + pure-demonstrative regex | `AMBIGUOUS_OR_EMPTY_MEMORY` |

Result nodes: 0 changes (already propagate `_error`).
DB nodes: 0 changes (existing `queryReplacement` `_error ? all-null : […]` short-circuit fires the no-write path).

## 8. Patch surface summary

- **Workflows touched**: 1 (`WF-ME-01`)
- **Nodes touched**: 2 (Prep nodes, jsCode rewrite only)
- **Node delta**: 0
- **Connection delta**: 0
- **Schema delta**: 0
- **Apply channel**: V2-028 canonical local CLI `n8n-patch.mjs replace`
- **No Path 5**, **no duplicate workflow**, **no MCP `patch_workflow_nodes` write**.
