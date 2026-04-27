# Phase 3 · WF-RD-01 False-Sent Guard Fix Plan

## Status of `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP`

**Already CLOSED 2026-04-27** by the same-day `aggregate_counts_fix`
mission. `RD_Aggregate_Result.parameters.jsCode` v1.0 → v1.1 is in the
live workflow today. WF-RD-01 versionId `9744e3a6-…`. Verified via
TR exec 10804 (`counts.skipped_missing_target=1, errors=0`).

This file therefore focuses on the remaining safety work: the
**false-sent guard** on `RD_Live_Mark_Sent`.

## Risk

`RD_Live_Mark_Sent.parameters.options.queryReplacement` currently
hardcodes `'sent'` in $1, regardless of whether the Telegram node
actually returned a `message_id`:

```
={{ ['sent', new Date().toISOString(), $json.live_payload && $json.live_payload.provider_message_ref || null, null, $json.__db.tenant_id, $json.__db.task_id, $json.__db.due_occurrence_iso] }}
```

Failure modes that produce a false `sent` row:

1. **NoOp placeholder reached on the live branch** (current state):
   `$json` is a passthrough from `RD_Live_Build_Body`. There's no
   `message_id` and `live_payload.provider_message_ref` is undefined.
   The current code writes `delivery_status='sent'` with
   `provider_message_ref=NULL`. **False sent.**
2. **Telegram returns an error** with `continueOnFail` enabled: same
   shape (`$json` has no `message_id`), same false-sent.
3. **Wrong upstream node order**: any path that reaches Mark_Sent
   without a real Telegram response.

## Fix design

Rewrite the `queryReplacement` IIFE to:

- read provider_ref from the canonical Telegram response shapes
  (`$json.message_id` or `$json.result.message_id`);
- set `delivery_status='sent'` ONLY when `provider_ref` is truthy;
- otherwise set `delivery_status='failed'`, `sent_at=NULL`,
  `last_error='no_provider_message_id'`.

```js
={{ (() => {
  const c = $("RD_Classify_And_Build").item.json;
  const tg = $json || {};
  const provider_ref = (tg.message_id != null) ? String(tg.message_id)
                     : ((tg.result && tg.result.message_id != null) ? String(tg.result.message_id) : null);
  const status     = provider_ref ? "sent" : "failed";
  const sent_at    = provider_ref ? new Date().toISOString() : null;
  const last_error = provider_ref ? null : "no_provider_message_id";
  return [status, sent_at, provider_ref, last_error,
          c.__db.tenant_id, c.__db.task_id, c.__db.due_occurrence_iso];
})() }}
```

## Patch envelope

| Bucket | Value |
|---|---|
| Workflow patched | WF-RD-01 only |
| Apply channel | V2-028 local CLI (`replace`) |
| Node delta | 0 |
| Connection delta | 0 |
| `active` | preserved at false |
| Other workflows touched | none |
| Schema mutation | none |
| DB writes from this patch | none (the queryReplacement is invoked only when the live branch executes — which never reaches the Mark_Sent node while the placeholder is NoOp because… see below) |

## Important nuance about the NoOp passthrough

`n8n-nodes-base.noOp` passes its input items through unchanged. If the
live branch is invoked with the NoOp in place (placeholder), the
chain does reach `RD_Live_Mark_Sent` — the node executes the
`UPDATE` query. With the new guard, the row is marked `failed`
instead of `sent`, with `last_error='no_provider_message_id'`.

This is the explicit safety property required by the mission brief:
**"Cu NoOp: live path nu marchează `sent`."**

## Tests (inline JS simulation)

The Phase 3 fix plan validates the IIFE against three mock scenarios
(see `FIX_TEST_RESULTS.md`):

1. Telegram success: `$json = { ok:true, result:{ message_id: 999 } }` ⇒ status='sent'.
2. NoOp passthrough: `$json` is a Build_Body output ⇒ status='failed'.
3. Telegram error with continueOnFail: `$json = { error:{...} }` ⇒ status='failed'.

## Rollback plan

Single-node revert via V2-028:

```bash
node n8n-patch.mjs replace nc7rTC3hjO9QqbXs artifacts/WF-RD-01_phase3_pre.json
```

The pre-snapshot is captured pre-patch. Restore returns to the
Phase 2 final state (`9744e3a6-…`).
