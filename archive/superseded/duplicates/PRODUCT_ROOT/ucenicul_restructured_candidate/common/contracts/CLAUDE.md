# CLAUDE.md — Repo Instructions for Claude

> **Document status: LEVEL 3 — SUBORDINATE OPERATIONAL**
> These are repo-level instructions for Claude. They are subordinate to the canonical architecture spec.
> In case of conflict, `docs/Architecture_Spec_v3_Ucenicul.md` wins.

---

## Authority Hierarchy

Claude MUST obey this document hierarchy when making decisions:

1. `docs/Architecture_Spec_v3_Ucenicul.md` — architecture truth (HIGHEST)
2. `docs/Migration_Plan_Ucenicul.md` — migration truth
3. Level 2 subordinate specs (Module Registry, Module Specs, Thread Resolution, Memory Model, Workflow Mapping)
4. This file (`CLAUDE.md`) — repo-level instructions
5. `README.md` — repo orientation only

If this file contradicts the architecture spec, the architecture spec wins automatically.

## Source of Truth Boundaries

| Domain | Source of Truth | NOT Source of Truth |
|---|---|---|
| System architecture | `docs/Architecture_Spec_v3_Ucenicul.md` | This file, README, brain_contract.json |
| Migration rules | `docs/Migration_Plan_Ucenicul.md` | Legacy workflow notes |
| Intent/field validation | `brain_contract.json` | (Scoped to brain layer only) |
| Module contracts | `docs/Module_Spec_*.md` + `docs/Module_Registry_Ucenicul.md` | Inline code comments |
| n8n execution layout | `docs/n8n_Workflow_Mapping.md` | Legacy workflow notes |
| DB schema (implemented) | `db/README.md` + `db/schema/README.md` | Inferred from code |
| DB schema (target) | `docs/Architecture_Spec_v3_Ucenicul.md` Section X (Schema Gap Register) | Legacy DB docs alone |

## brain_contract.json Scope

`brain_contract.json` governs **intent classification and field validation within the brain layer only**. It does NOT govern:

- System-level architecture
- Module contracts
- Thread resolution
- Execution context
- Privacy boundaries
- Response composition

When Claude modifies `brain_contract.json`, it must ensure changes are consistent with the architecture spec but must not treat `brain_contract.json` as the architectural authority.

## PostgreSQL Query Policy

Claude MUST follow the canonical PostgreSQL query policy defined in `docs/n8n_Workflow_Mapping.md` Section 5.

Summary:

- Prefer parameterized queries ($1, $2) for all variable input
- Use sanitized inline interpolation only when the n8n node does not support parameterized binding
- Always document why parameterized binding was not used when using inline interpolation
- Never use raw string concatenation with unvalidated input

## What Claude Must Do Before Implementation

1. Read `docs/Architecture_Spec_v3_Ucenicul.md` first
2. Check that the change aligns with target architecture, not legacy pattern
3. Verify module is in the registry if creating module logic
4. Ensure Module Request/Result contracts are used for module communication
5. Update relevant documentation if the change affects architecture

## What Claude Must NOT Do

- Present the legacy intent-first flow as the target architecture
- Claim Phase 2 privacy features are implemented (they are NO-OP in MVP)
- Invent persistence layers not documented in the architecture spec
- Create hidden module-to-module calls
- Flow raw PII into LLM/RAG in target-state code
- Add extra source-of-truth tables without documenting them
- Optimize the old route-by-intent model as if it were the target

## Consistency Rules

- Every code change must be consistent with the architecture spec
- If Claude changes `brain_contract.json`, it must verify alignment with the architecture spec
- If Claude changes workflow logic, it must verify alignment with `docs/n8n_Workflow_Mapping.md`
- If Claude changes DB schema, it must update `db/README.md` and `db/schema/README.md`
- No document may present the legacy pattern as target architecture

## Acceptance Gate

Before Claude considers any implementation complete, it must confirm:

- Thread-first resolution exists or is preserved
- Execution context is explicit
- One final response rule is preserved
- Privacy boundary placeholders exist
- Module contracts are explicit
- Migration status of touched artifacts is recorded

---

> **Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-15
