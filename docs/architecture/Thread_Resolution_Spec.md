# Thread Resolution Spec — Ucenicul (v2.0)

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.

---

## 1. Goal

Given a new Message, the Thread Resolver must determine one of three outcomes:

- Attach to an existing active thread
- Reopen a latent thread
- Create a new thread

Thread resolution MUST happen before planning. No execution context or plan may be created without a resolved thread.

---

## 2. Priority Order for Matching

The Thread Resolver MUST evaluate thread candidates in this strict order:

1. **Explicit thread reference** — if the message contains an explicit `thread_id` or is passed with an explicit thread context, use it directly
1b. **Explicit via reply context** — if the message is passed with `reply_to_thread_id` explicitly set, use it directly
2. **Direct reply linkage** — if the message is a reply to another message that has a `thread_id`, look up that thread
2a. **Reply linkage with known thread** — resolve the referenced message and extract its `thread_id`
3. **Active thread with same primary entity AND high semantic match** — entity + content alignment
4. **Active thread with strong semantic match** — content alignment alone, no entity match required
5. **Latent thread with strong semantic AND temporal relevance** — inactive but contextually relevant
6. **Create new thread** — if no candidate meets thresholds

---

## 3. Scoring Algorithm with Latent Reopen Separation

**Key D-16 fix:** Latent threads above attach threshold are reopened, not attached (separate decision path).

```
def resolve_thread(message, policy):
    # Priority 1: Explicit thread_id
    if message.thread_id:
        return attach_existing_thread(message.thread_id)
    
    # Priority 1b: Explicit via reply context
    if message.reply_to_thread_id:
        return attach_or_reopen(message.reply_to_thread_id)
    
    # Priority 2: Direct reply linkage
    if message.reply_to_message_id:
        referenced_msg = load_message(message.reply_to_message_id)
        if referenced_msg and referenced_msg.thread_id:
            return attach_existing_thread(referenced_msg.thread_id)
    
    # Priority 3-5: Score-based matching
    candidates = fetch_recent_threads(message.tenant_id, policy.candidate_window_days)
    
    scored = []
    for thread in candidates:
        score = compute_score(message, thread, policy)
        scored.append((thread.id, score, thread.status))
    
    if not scored:
        return create_new_thread()
    
    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)
    best = scored[0]
    second_best = scored[1] if len(scored) > 1 else None
    
    # D-18 fix: Ambiguity rule with AMBIGUITY_MINIMUM
    if best[1] < policy.ambiguity_minimum:
        return create_new_thread()
    
    if second_best and (best[1] - second_best[1]) < policy.ambiguity_margin:
        return create_new_thread(ambiguity=true)
    
    # D-16 fix: Separate active-attach from latent-reopen
    # If best thread is latent and score >= reopen_threshold
    if best[2] == "latent" and best[1] >= policy.reopen_threshold:
        return reopen_latent_thread(best[0], best[1])
    
    # If best thread is active/waiting/blocked and score >= attach_threshold
    if best[2] in ["active", "waiting", "blocked"] and best[1] >= policy.attach_threshold:
        return attach_existing_thread(best[0], best[1])
    
    # Score too low for any action
    return create_new_thread()
```

---

## 4. Threshold Configuration

All thresholds are now per-request configurable via `resolution_policy` in ThreadResolutionRequest, with global defaults:

| Threshold | Default | Type | Description |
|---|---|---|---|
| `attach_threshold` | 0.75 | Per-request | Minimum score to attach to an existing active/waiting/blocked thread |
| `reopen_threshold` | 0.65 | Per-request | Minimum score to reopen a latent thread |
| `ambiguity_margin` | 0.05 | Per-request | Maximum gap between top two scores before ambiguity rule fires |
| `ambiguity_minimum` | 0.60 | Per-request | Minimum absolute score before any matching attempt (D-18 fix) |
| `max_candidate_threads` | 50 | Per-request | Maximum threads evaluated |
| `allow_latent_reopen` | true | Per-request | Feature flag: allow latent thread reopening |
| `allow_entity_assisted_match` | true | Per-request | Feature flag: allow entity matching to boost score |
| `candidate_window_days` | 30 | Per-tenant config | How far back to look for candidate threads |

These values are configurable per tenant and per request. They MUST be documented in operational configuration.

---

## 5. Scoring Components

### entity_match_score (0.0 to 0.30)

Contribution: 0-0.30 (component weight in final score)

**Rules:**
- If message author entity exactly matches thread primary_entity_id: +0.30
- If message author entity is in thread related_entity_ids: +0.15
- If message mentions an entity in thread related_entity_ids: +0.15 per mention (capped at 0.30 total)
- Otherwise: +0.0

**Implementation note:** If `allow_entity_assisted_match` is false, this component returns 0.0 always.

### semantic_match_score (0.0 to 0.40)

Contribution: 0-0.40 (component weight in final score)

**MVP implementation (Romanian-aware stemming + character trigram hybrid):**

1. Normalize both message content and thread summary to lowercase
2. Remove punctuation and extra whitespace
3. Apply Romanian-aware stemming (e.g., "apartament", "apartamante" both stem to "apartam")
4. Extract character trigrams from normalized text
5. Compute Jaccard similarity of trigram sets
6. Scale result to 0.0-0.40 range

**Production implementation (embedding-based):**

1. Embed message normalized_content using a multingual Romanian-aware model
2. Embed thread summary using the same model
3. Compute cosine similarity between embeddings
4. Scale to 0.0-0.40 range

**Example (MVP):**
- Message: "Ion cauta apartament in centru pe strada Mihai"
- Thread summary: "Ion apartament centru pret locatie"
- After stemming: ["ion", "caut", "apartam", "centru", "strada", "mihai"] vs ["ion", "apartam", "centru", "pret", "locat"]
- Trigram overlap indicates strong match: 0.35-0.40 score

### temporal_proximity_score (0.0 to 0.20)

Contribution: 0-0.20 (component weight in final score)

**Decaying score based on time since thread.last_activity_at:**

- Within 1 hour: +0.20
- Within 24 hours: +0.15
- Within 7 days: +0.10
- Within 30 days: +0.05
- Older than 30 days: +0.0

### channel_relevance_score (0.0 to 0.10)

Contribution: 0-0.10 (component weight in final score)

- If message channel is in thread.source_channels: +0.10
- Otherwise: +0.0

### Total Score Computation

```
total_score = entity_match_score + semantic_match_score + temporal_proximity_score + channel_relevance_score
```

Range: 0.0 to 1.0

---

## 6. Entity-Semantic Divergence Rule

**Situation:** Entity match is absent but semantic match is very high (0.75+).

**Problem:** High semantic match without entity confirmation might indicate:
- False positive (message about entity A but thread is about entity B with similar subject)
- Entity disambiguation needed

**Rule:**

If `allow_entity_assisted_match` is true and message has `author_entity_id`:

1. Compute base semantic + temporal + channel score
2. If entity_match_score == 0.0 (no entity match) AND (semantic + temporal + channel) >= 0.75:
   - Require base score >= 0.80 to proceed with attachment
   - If 0.75 <= base score < 0.80, treat as ambiguous; create new thread instead
3. Rationale: Without entity confirmation, we need higher confidence in semantic alignment

**Example:**
- Thread A: "Bianca nutrition coaching discussion" (primary_entity: Bianca)
- Message from unknown entity: "I need nutritionist advice, diet planning"
- Semantic match: 0.78 (high but not primary entity)
- Entity match: 0.0 (no author entity provided)
- Base score (sem + temporal + channel): 0.78
- 0.75 <= 0.78 < 0.80: apply ambiguity rule; create new thread

---

## 7. Reopen Rules

- Reopening a latent thread transitions it from `latent` to `active`
- The reopen event must be logged with: thread_id, trigger_message_id, reopen_score, timestamp
- Reopening updates `thread.last_activity_at` and `thread.updated_at` immediately
- Reopening is a separate decision from attachment (D-16 fix): latent threads meeting `reopen_threshold` are reopened, not attached as active threads
- Feature flag `allow_latent_reopen` controls whether latent candidates are even evaluated; if false, only active/waiting/blocked threads are eligible

---

## 8. Ambiguity Rule

**D-18 fix with explicit AMBIGUITY_MINIMUM:**

If multiple threads are plausible and no single candidate dominates, the Thread Resolver MUST create a new thread rather than contaminating an existing one.

**Ambiguity fires if:**
1. Best candidate score is below `ambiguity_minimum` (default 0.60): always create new
2. Best and second-best scores differ by less than `ambiguity_margin` (default 0.05): create new with `ambiguity_detected: true`

**Example:**
- Thread A score: 0.76
- Thread B score: 0.73
- Gap: 0.03 < ambiguity_margin (0.05)
- Decision: create_new_thread, ambiguity_detected: true

---

## 9. Auditability Requirements

For every thread resolution, the following MUST be logged (stored in execution context or audit trail):

| Field | Type | Description |
|---|---|---|
| `resolution_id` | string | Deterministic ID: `tr_{message_id}_{hash(idempotency_key)}` or `tr_{message_id}_{timestamp_ms}` fallback |
| `trigger_message_id` | UUID | The message that triggered resolution |
| `candidate_thread_ids` | array of UUID | All threads evaluated (up to max_candidate_threads) |
| `candidate_scores` | array of objects | Score breakdown for each candidate (entity, semantic, temporal, channel) |
| `decision` | string | `attach_existing_thread`, `reopen_latent_thread`, `create_new_thread`, or `fail_invalid_input` |
| `selected_thread_id` | UUID or null | The thread chosen (or null if new/error) |
| `confidence` | number 0.0-1.0 | Confidence in resolution (0.0 for new, score for attach/reopen) |
| `ambiguity_detected` | boolean | Was the ambiguity rule triggered? |
| `reopened_thread` | boolean | Was a latent thread reopened? |
| `error` | object or null | Error details if decision is fail_invalid_input or DB error |
| `timestamp` | ISO 8601 | When resolution occurred |

All decisions, including error paths, are unconditionally audited to ensure observability.

---

## 10. Edge Cases

- **No active or latent threads exist:** always create new thread
- **Message is a system/automated message:** may bypass thread resolution if configured (e.g., scheduled reminders); handled at orchestrator level, not in resolver
- **Message from unknown author (no author_entity_id):** proceed with resolution using semantic/temporal/channel scores only (no entity match component; component returns 0.0)
- **Thread is in `blocked` or `waiting` state:** treat as active for attachment purposes (new message may unblock or trigger new action)
- **Multiple messages in flight with same content:** first message creates thread; second message correctly attaches via semantic match; idempotent by design
- **Explicit thread_id refers to non-existent thread:** validation error; return `fail_invalid_input`
- **reply_to_message_id refers to non-existent message:** graceful null handling; continue to score-based matching
- **reply_to_message_id refers to message with no thread_id:** graceful null handling; continue to score-based matching

---

## 11. Scoring Pseudocode

```javascript
function computeScore(message, thread, policy) {
  let score = 0.0;
  
  // Entity matching
  if (policy.allow_entity_assisted_match && message.author_entity_id) {
    if (message.author_entity_id === thread.primary_entity_id) {
      score += 0.30;
    } else if (thread.related_entity_ids && thread.related_entity_ids.includes(message.author_entity_id)) {
      score += 0.15;
    }
  }
  
  // Semantic matching (Romanian-aware MVP)
  let semScore = romanianSemanticSimilarity(message.normalized_content, thread.summary);
  score += Math.min(semScore, 0.40);
  
  // Temporal proximity
  let hoursDiff = (Date.now() - thread.last_activity_at) / (1000 * 60 * 60);
  if (hoursDiff < 1) {
    score += 0.20;
  } else if (hoursDiff < 24) {
    score += 0.15;
  } else if (hoursDiff < 168) {  // 7 days
    score += 0.10;
  } else if (hoursDiff < 720) { // 30 days
    score += 0.05;
  }
  
  // Channel relevance
  if (thread.source_channels && thread.source_channels.includes(message.channel)) {
    score += 0.10;
  }
  
  return Math.min(score, 1.0);
}

function romanianSemanticSimilarity(text1, text2) {
  // MVP: character trigram Jaccard similarity
  let normalized1 = normalizeRomanian(text1);
  let normalized2 = normalizeRomanian(text2);
  
  let trigrams1 = extractTrigrams(normalized1);
  let trigrams2 = extractTrigrams(normalized2);
  
  let intersection = trigrams1.filter(t => trigrams2.includes(t)).length;
  let union = new Set([...trigrams1, ...trigrams2]).size;
  
  let jaccard = union > 0 ? intersection / union : 0.0;
  return jaccard * 0.40;  // Scale to 0.0-0.40 range
}
```

---

> **Level 2 — Canonical Subordinate.** Version: 2.0 | Last updated: 2026-04-15
