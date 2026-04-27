# CLAUDE.md — Repo Instructions for Claude

> **Document status: LEVEL 3 — SUBORDINATE OPERATIONAL**
> These are repo-level instructions for Claude. They are subordinate to the canonical architecture spec.
> In case of conflict, `docs/architecture/Architecture_Spec_v3_Ucenicul.md` wins.

---

## Authority Hierarchy

Claude MUST obey this document hierarchy when making decisions:

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` — architecture truth (HIGHEST)
2. `docs/migration/Migration_Plan_Ucenicul.md` — migration truth
3. Level 2 subordinate specs under `docs/architecture/` (Module Registry, Module Specs, Thread Resolution, Memory Model, Workflow Mapping)
4. This file (`CLAUDE.md`) — repo-level instructions
5. `README.md` — repo orientation only

If this file contradicts the architecture spec, the architecture spec wins automatically.

## Source of Truth Boundaries

| Domain | Source of Truth | NOT Source of Truth |
|---|---|---|
| System architecture | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` | This file, README, brain_contract.json |
| Migration rules | `docs/migration/Migration_Plan_Ucenicul.md` | Legacy workflow notes |
| Intent/field validation | `brain_contract.json` | (Scoped to brain layer only) |
| Module contracts | `docs/architecture/Module_Spec_*.md` + `docs/architecture/Module_Registry_Ucenicul.md` | Inline code comments |
| n8n execution layout | `docs/architecture/n8n_Workflow_Mapping.md` | Legacy workflow notes |
| DB schema (implemented) | `db/README.md` + `db/schema/README.md` | Inferred from code |
| DB schema (target) | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` Section X (Schema Gap Register) | Legacy DB docs alone |

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

Claude MUST follow the canonical PostgreSQL query policy defined in `docs/architecture/n8n_Workflow_Mapping.md` Section 5.

Summary:

- Prefer parameterized queries ($1, $2) for all variable input
- Use sanitized inline interpolation only when the n8n node does not support parameterized binding
- Always document why parameterized binding was not used when using inline interpolation
- Never use raw string concatenation with unvalidated input

## What Claude Must Do Before Implementation

1. Read `docs/architecture/Architecture_Spec_v3_Ucenicul.md` first
2. Check that the change aligns w