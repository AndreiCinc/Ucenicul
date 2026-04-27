# design_f5_proposal.md — F5 subjective-guard multi-language (proposal-only)

Date: 2026-04-21.
Frontier: **F5 — subjective-guard multi-language**.
Status: **PROPOSAL_AWAITING_DECISION** (per continuation contract §13: F5 deliverable is a proposal of ≤ 1 page with 2–3 options + trade-offs; controlled stop after save).

## 1. Context

v1 ships a hardcoded Romanian-only lexical guard inside `ME_Memory_Store_Prep` and `ME_Memory_Supersede_Prep` that rejects `observation`/`pattern` content matching any of 6 hand-picked regexes (insult/character-judgment patterns: `prost`, `dezgustator`, `idiot`, `lenes`, `incompetent`, `ra(u|i) caracter|om|persoana`). On match: `SUBJECTIVE_JUDGMENT_FORBIDDEN`. ADR-003 deferred multi-language coverage to v2 explicitly. F5 must extend the guard so non-Romanian tenants get a comparable safety net **without** redesigning the upstream contract or breaking the existing Romanian path.

Authority constraint: the regex list is embedded in the canonical patch JSON; any production change goes through `n8n-patch.mjs` (CLI rollout, audit + before/after snapshots). v1 frozen artefacts on disk are not modified — patches go on the live workflow only, with a new versionId in the lineage.

## 2. Options

### Option A — Tenant-scoped static locale list (per-tenant config)

Mechanism: caller envelope adds an optional `locale` field on `step.inputs` (e.g. `"ro"`, `"en"`); Prep node has an embedded `LOCALE_LISTS = {ro: [...], en: [...]}` map and picks the right regex array at runtime. Default `locale = "ro"` preserves v1 behaviour. Unknown locale ⇒ no guard fires (safe-by-default-permit) OR fall-back to `ro` list (safe-by-default-deny) — TBD per option's sub-decision.

- Pros: deterministic; zero per-call latency overhead; auditable; rollback-safe (single-node patch); no new MCP/HTTP dependency; works offline; cheap to extend (add another locale ⇒ edit the embedded map + re-rollout).
- Cons: caller has to know its own locale and pass it explicitly; mismatched locale (e.g. Romanian content tagged `en`) silently bypasses the guard; per-locale word lists are still hand-curated by the maintainer (lexicon drift).
- Rollout: identical channel as F4 (`patch-node` jsCode swap on Store_Prep + Supersede_Prep). 2 nodes touched, no schema, no SQL.
- Cost: ~100 lines of jsCode total (50 lines x 2 nodes).
- Risk: low.

### Option B — Prep-layer language detection heuristic (auto-locale)

Mechanism: tiny embedded language detector inside Prep — scores content against a small set of high-signal diacritics/stopwords per supported locale (e.g. `ro: ['și', 'în', 'că', 'ț', 'ș']`, `en: ['the', 'and', 'is']`). Picks the highest-scoring locale; falls back to `ro` on ambiguity. Then applies the per-locale regex list (same `LOCALE_LISTS` map as Option A).

- Pros: caller doesn't need to set `locale`; works for mixed-tenant deployments where the same tenant sends multiple languages; safer-by-default than Option A's permit-on-unknown.
- Cons: heuristic is itself drift-prone (short sentences fool the detector); adds 30–80 lines of Prep code and a small per-call CPU cost (still microseconds, but worth measuring); harder to audit "why was this content guarded under locale X?" because the locale is implicit in the run.
- Rollout: same channel as A. Extra step in design freeze: pin the detector implementation (which stopword set, which scoring function) so future versions are reproducible.
- Cost: ~150 lines of jsCode total + a 1-page detector reference doc.
- Risk: medium (detector drift, harder to debug false-positives).

### Option C — External HTTP classifier node (LLM-class judgement)

Mechanism: insert a new HTTP node `ME_Memory_Subjective_Guard_Classify` between `*_Prep` and `*_DB` for `observation`/`pattern` writes; calls an Anthropic/OpenAI/FastText endpoint returning `{lang, is_subjective_judgment, confidence}`. On `is_subjective_judgment=true && confidence≥0.7`, emit `SUBJECTIVE_JUDGMENT_FORBIDDEN`. On HTTP error ⇒ fall back to the embedded `LOCALE_LISTS["ro"]` regex (i.e. preserve v1 safety floor). Same architectural pattern as F2's embedding producer (HTTP node + lexical fallback).

- Pros: language-agnostic by construction; catches paraphrases that regex misses; aligned with the F2 producer-node precedent (operationally familiar); easiest to extend the *quality* of the guard later (swap providers).
- Cons: per-call latency (200–800 ms); per-call cost (~$0.0001–$0.001 if LLM-class); requires an external credential and an `onError=continueRegularOutput` fallback path; expands the `WF-ME-01` failure surface (network errors, classifier rate limits); only meaningful for `observation`/`pattern` writes (~minority of total traffic) so cost-amortization is poor.
- Rollout: structural change ⇒ `n8n-patch.mjs replace` (not `patch-node`). 2 new nodes per write-path leg (Store + Supersede) ⇒ 4 new nodes + 4–6 new edges. New DIVERGENCE entry. New credential bind.
- Cost: ~250 lines patch + classifier reference doc + cost-monitoring note.
- Risk: medium-to-high (external dependency in the write path).

## 3. Recommendation matrix

| Axis | Option A | Option B | Option C |
|---|---|---|---|
| Latency | 0 ms | <1 ms | 200–800 ms |
| External dependency | none | none | yes (HTTP) |
| Caller burden | sets `locale` | none | none |
| Coverage breadth | locales we explicitly add | locales we explicitly detect | language-agnostic |
| Rollback | single `patch-node` | single `patch-node` | full `replace` + node deletion |
| Audit friendliness | high (regex visible) | medium (locale implicit) | low (LLM black box) |
| Drift risk | regex curation | detector + regex curation | provider/version drift |
| F2 precedent reuse | none | none | full |

## 4. Required input from operator

To proceed past this proposal, the operator must decide:

1. **Coverage scope.** Which locales beyond `ro` matter for the v2 product? (en only? en + es? full EU set?)
2. **Acceptable per-call latency budget.** Is 200–800 ms in the write path acceptable, or must guard stay sub-ms?
3. **Acceptable external-dependency surface.** Does product policy permit calling an external classifier from the write path, or does the guard need to remain self-contained?
4. **Default behaviour on unknown locale (Option A specific).** Permit (safe-by-default-permit) vs fall-back to `ro` regex (safe-by-default-deny)?
5. **Lexicon stewardship.** Who owns the per-locale regex list and reviews additions over time (Options A & B)?

Without (1) + (3) at minimum, the implementation choice is undecidable. (1) bounds the lexicon work; (3) gates A/B vs C.

## 5. Frozen artefacts

This proposal is the only F5 artefact produced in this session. No code patches, no node JSON, no SQL. Per continuation contract §13, F5 implementation work waits on operator decision; the proposal-and-stop is the controlled exit.

If the operator picks Option A or B, the next agent should open `v2/f5/patch_plan_f5.md` + `v2/f5/artifacts/build_patch_f5.mjs` along the F4 template (single `patch-node` rollout, jsCode-only). If Option C, follow the F2 template (`replace` rollout with 4 new nodes + DIVERGENCE entry).

## 6. Controlled stop

F5 enters `PROPOSAL_AWAITING_DECISION`. Memory v2 has no remaining executable frontier in this session. F3.1 walker/sidecar (full 150-case combinatorial expansion), accept-via-corroboration probe, store-path embedding producer, and the F5 implementation are all genuinely-blocked-on-decision and recorded in the next session handoff.
