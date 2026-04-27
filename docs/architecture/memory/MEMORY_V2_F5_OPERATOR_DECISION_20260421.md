# MEMORY_V2_F5_OPERATOR_DECISION_20260421.md

> **Authoritative operator unlock for F5** (subjective-guard multi-language).
> Date: 2026-04-21.
> Supersedes the `AWAITING_OPERATOR_DECISION` status on `v2/f5/design_f5_proposal.md`.
> Drives the F5 implementation work beyond the proposal-only stop point mandated by continuation contract §13.

## 1. Chosen option

**Option A — tenant-scoped static locale list (per-tenant config).**

Rationale: zero per-call latency, no external dependency, auditable (regexes visible in node jsCode), single-node rollback, and fits the F4 `patch-node` precedent exactly. F5 is an additive safety net — drift in a hand-curated regex list is tolerable; adding an external classifier or detector in the write path is not.

## 2. Operator answers to `design_f5_proposal.md §4`

| # | Question | Answer |
|---|---|---|
| Q1 | Coverage scope beyond `ro` | **Romanian + English only in this rollout.** Do not expand to full EU coverage in F5. |
| Q2 | Latency budget | **Sub-ms / no network call in the write path.** |
| Q3 | External-dependency policy | **External classifier not permitted.** Guard must remain self-contained. |
| Q4 | Unknown-locale behaviour (Option A) | **Fall back to the Romanian regex list (`ro`) as the safety floor.** (Safe-by-default-deny.) |
| Q5 | Lexicon stewardship | **Memory-module maintainer / architecture owner.** Every lexicon update must go through documented review, canonical rollout, smoke evidence, and state / ledger / handoff updates. |

## 3. Implementation constraints (binding on F5)

- Supported locales in this rollout: `ro`, `en` (exactly these two).
- Patch scope: `ME_Memory_Store_Prep` and `ME_Memory_Supersede_Prep` only. No other node.
- Canonical channel: `n8n-patch.mjs patch-node` (F4 template). `jsCode`-only merge. Minimum diff surface.
- No schema changes. No SQL changes. No new HTTP node. No new credentials.
- Preserve existing Romanian behaviour: the six pre-existing Romanian regexes stay under `ro`, unmodified.
- Missing `step.inputs.locale` (or empty / non-string) ⇒ treat as `ro`.
- Unknown locale (anything outside `{ro, en}` after normalization) ⇒ fall back to `ro`.
- Do not reopen F3 first-batch unless a real regression surfaces.
- Do not touch frozen v1 artefacts.
- Respect autonomy rules: 3-attempt ceiling, no schema inference, evidence-capture must produce the next executable path.

## 4. Smoke minimums (binding)

1. `locale=ro` + subjective Romanian observation/pattern ⇒ `SUBJECTIVE_JUDGMENT_FORBIDDEN`.
2. `locale=en` + subjective English observation/pattern ⇒ `SUBJECTIVE_JUDGMENT_FORBIDDEN`.
3. `locale=en` + neutral English observation/pattern ⇒ allowed (row inserted).
4. Missing `locale` + Romanian subjective text ⇒ reject via `ro` default.
5. Unknown `locale` (e.g. `xx`) + Romanian subjective text ⇒ reject via `ro` fallback.
6. Non-guarded path (memory_type ∉ {observation, pattern}) ⇒ allowed even with subjective-looking content.
7. Supersede path mirrors store path behaviour (at least one en-subjective reject via supersede).

## 5. Close conditions

F5 implemented + runtime-tested + `mcp__n8n__verify_workflow` green + state/gates/ledger/handoff updated ⇒ write `CLOSURE_REPORT_MEMORY_V2_F5.md` and update `SESSION_HANDOFF_NEXT.md`. If blocked mid-implementation, stop controlled with `BLOCKED_WITH_EVIDENCE` and an exact next executable path.

## 6. Stewardship hand-off

This operator decision pins F5 coverage to `{ro, en}`. Any future expansion of the supported locale list (e.g. adding `es`, `fr`) must:

1. Open a fresh DIVERGENCE entry (or extension of F5 in the decision ledger).
2. Reuse the same `patch-node` rollout channel.
3. Re-run the same smoke minimums for each new locale + the two already-pinned locales (regression guard).
4. Update `MEMORY_V2_STATE.md` + `MEMORY_V2_PHASE_GATES.md` + `MEMORY_V2_DECISION_LEDGER.md` + `SESSION_HANDOFF_NEXT.md`.
5. Freeze evidence under `v2/f5-<lang>/` to keep this frontier's evidence tree clean.

The memory-module maintainer is the sole owner of the regex list; no silent expansion through code review without a matching state/ledger/handoff update.
