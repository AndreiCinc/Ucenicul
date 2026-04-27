# Ucenicul

> **Document status: LEVEL 3 — SUBORDINATE OPERATIONAL**
> This README provides repo orientation only. It is NOT the architectural authority.
> For architecture truth, see `docs/Architecture_Spec_v3_Ucenicul.md`.

---

## What is Ucenicul?

Ucenicul is a modular AI orchestrator designed to manage operational tasks, reminders, memory, and intelligent follow-ups through conversational interfaces (Telegram, WhatsApp, Web). It is built on n8n workflows with PostgreSQL + pgvector as the persistence backbone.

## Current Implementation Status

**The current implementation is a transitional monolith** that routes messages by single intent classification. This is the legacy pattern, not the target architecture.

The current system:

- Receives messages via Telegram webhook
- Classifies a single intent per message (brain/intent classifier)
- Routes to one branch per intent via switch node
- Executes domain logic inline in branches
- Composes partial responses per branch

**This is NOT the target architecture.** The target is a modular, thread-first, plan-first orchestration pattern described in the canonical architecture spec.

## Target Architecture (Summary)

The target architecture follows this flow:

```
Message In -> Thread Resolver -> Execution Context -> Orchestrator Planner
-> Dispatcher -> Modules -> Result Aggregator -> Response Composer -> Message Out
```

Key principles: thread-first, plan-first, modular execution, one final response, explicit contracts, privacy-ready by design.

For full details, see the canonical documentation.

## Canonical Documentation

| Document | Location | Purpose |
|---|---|---|
| Architecture Spec v3 | `docs/Architecture_Spec_v3_Ucenicul.md` | **Canonical** — architecture truth |
| Migration Plan | `docs/Migration_Plan_Ucenicul.md` | **Canonical** — migration truth |
| Module Registry | `docs/Module_Registry_Ucenicul.md` | Module contracts and registry |
| Module Specs | `docs/Module_Spec_*.md` | Per-module contracts |
| Thread Resolution | `docs/Thread_Resolution_Spec.md` | Thread resolution algorithm |
| Memory Model | `docs/Memory_Model_Spec.md` | Memory tiers and promotion rules |
| Workflow Mapping | `docs/n8n_Workflow_Mapping.md` | n8n execution layout |
| DB Documentation | `db/README.md`, `db/schema/README.md` | Schema documentation |
| Verification Checklist | `docs/Documentation_Verification_Checklist_Ucenicul.md` | Compliance verification |

## Technology Stack

- **Orchestration:** n8n
- **Database:** PostgreSQL
- **Vector store:** pgvector (PostgreSQL extension)
- **Messaging:** Telegram (primary), extensible to WhatsApp/Web
- **Language:** JavaScript/TypeScript within n8n, SQL for persistence

## Important Notes

- The legacy intent-first workflow is documented as historical/transitional only
- The `brain_contract.json` governs intent/field validation only, not system architecture
- Privacy features (pseudonymization, token mapping) are NO-OP in MVP; architecture is prepared for Phase 2
- All architectural decisions are governed by `docs/Architecture_Spec_v3_Ucenicul.md`

---

> **Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-15
