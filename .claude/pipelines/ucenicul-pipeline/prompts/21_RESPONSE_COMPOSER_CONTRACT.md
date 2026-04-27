# RESPONSE COMPOSER CONTRACT

## 1. Purpose

Defines strict final-response generation rules for Ucenicul runtime.

Response Composer is the only layer allowed to produce final user-facing output.

No module may bypass this rule.

---

## 2. Canonical role

Response Composer receives:
- module outputs
- warnings
- execution status
- partial failures
- memory relevance signals

Response Composer produces:
- one final response
- one coherent output
- one channel-safe payload

---

## 3. One execution = one response rule

A single execution may produce only one final response.

Forbidden:
- branch-local final replies
- partial independent replies
- module-level final messages

---

## 4. Mandatory input contract

Response Composer must receive:

- execution_id
- tenant_id
- thread_id
- module result set
- execution status
- warning set

If any mandatory input missing:
response generation is incomplete.

---

## 5. Module result normalization

Before composing:
all module outputs must be normalized.

Each module output must contain:
- success / failure
- affected resource
- human-readable summary
- warnings

No raw module payload reaches final response directly.

---

## 6. Priority order for composition

Response order:

1. critical failure
2. completed actions
3. pending actions
4. warnings
5. optional contextual memory

This order is mandatory.

---

## 7. Failure composition rule

If one module fails but others succeed:

Response must:
- preserve completed actions
- explicitly mention failed action
- state safe continuation

No hidden partial failure allowed.

---

## 8. Memory insertion rule

Memory may appear only when:
- relevant now
- improves action clarity
- does not dominate response

Forbidden:
- unsolicited long recall
- weak memory injection
- speculative memory

---

## 9. Tone rule

Response must remain:
- concise
- operational
- human-readable
- non-theatrical

Forbidden:
- exaggerated assistant tone
- artificial verbosity
- overexplaining internal logic

---

## 10. Task + reminder merge rule

When both task and reminder exist:

Response must merge them coherently.

Forbidden:
- duplicate confirmation blocks
- separate parallel confirmations

---

## 11. Warning visibility rule

Warnings appear only when operationally useful.

Warnings must be:
- short
- explicit
- actionable

---

## 12. Channel adaptation rule

Composer must preserve same logic across channels.

Telegram and WhatsApp may differ only in formatting.

Business meaning must remain identical.

---

## 13. Privacy rule

Final response must not leak:
- hidden identifiers
- internal DB ids
- internal execution ids
- internal memory metadata

---

## 14. Runtime safety rule

If ambiguity remains unresolved:
prefer safe minimal response over speculative completeness.

---

## 15. Canonical decision rule

If expressive richness conflicts with runtime clarity:

runtime clarity always wins.
