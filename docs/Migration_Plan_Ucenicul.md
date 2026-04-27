# Migration Plan — Ucenicul

> **Canonicality: LEVEL 1 — CANONICAL**
> This document governs migration truth: artifact disposition, cutover order, rollback, and transitional rules.
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md` for architectural definitions.

---

## 1. Current Artifact -> Replacement Artifact Table

| Current Artifact | Action | Reason | Replacement Artifact |
|---|---|---|---|
| `Claude_Migration_Spec_Ucenicul_v10.pdf` | Archive after absorption | Strong migration source, but PDF must not remain living canonical truth | `docs/Architecture_Spec_v3_Ucenicul.md` + this document |
| `Claude_Migration_Spec_Ucenicul_v10 (1).pdf` | Delete/archive duplicate | Duplicate of same content | None |
| `Ghid_Tehnic_de_Implementare_...pdf` | Archive after absorption | Useful orchestration ideas; contains conflicting storage assumptions (Redis/Pinecone/Weaviate) | `docs/n8n_Workflow_Mapping.md` + module specs |
| Root `README.md` (legacy) | Rewrite | Mixes active MVP with target architecture; presents intent-first as canonical | Rewritten root `README.md` (subordinate to arch spec) |
| `CLAUDE.md` (legacy) | Rewrite | Elevates `brain_contract.json` above arch spec; asserts conflicting SQL rules | Rewritten `CLAUDE.md` (subordinate to arch spec) |
| `db/README.md` | Rewrite | Must separate implemented schema from target schema delta | Rewritten `db/README.md` |
| `db/schema/README.md` | Rewrite | Must include privacy field placeholders and target objects | Rewritten `db/schema/README.md` |
| `COMPILARIS_UCENICUL_OVERVIEW.md` | Archive/reference | Business overview, not engineering truth | None (historical reference) |
| `COMPILARIS_RAG_MESSAGES.md` | Keep as fixture | Test/seed content only, not implementation truth | Same file, marked as non-canonical fixture |
| Legacy PNG diagrams | Replace | Superseded by Mermaid source in Architecture Spec v3 | Mermaid diagrams in arch spec |
| `Architecture_Spec_v2_-_Ucenicul.pdf` | Not available for audit | Referenced but not found | Superseded by v3 |
| `architecture.md` | Not available for audit | Referenced but not found | Superseded by v3 |
| `repository-structure.md` | Not available for audit | Referenced but not found | Root README covers repo orientation |
| Legacy intent-router workflow logic in n8n | Refactor/deprecate | Conflicts with thread-first plan-first architecture | Orchestrator/module pattern |
| Old branch-level response formatting | Delete | Violates one-final-response rule | Centralized response composer |
| Ad hoc memory writes in unrelated branches | Delete/refactor | Violates module ownership and privacy-readiness | `memory_module` |
| Temporary old CRUD nodes (task/reminder) | Keep temporarily with wrapper | Allows staged migration | Module Request/Result wrappers |

---

## 2. Preserve / Refactor / Deprecate / Archive / Delete Classification

| Classification | Items |
|---|---|
| **Preserve** | PostgreSQL operational DB, pgvector memory base, Telegram gateway integration, existing error logging infrastructure, existing parser logic (within modules), brain_contract.json (scoped to intent/field validation only) |
| **Refactor** | Task CRUD logic -> task_module contract, Reminder CRUD logic -> reminder_module contract, Memory write logic -> memory_module contract, Feedback capture -> improvement_module, DB schema -> add target objects and privacy fields |
| **Deprecate** | One-intent-first as central truth, switch-first route-by-intent core architecture, per-branch partial response generation, split-first multi-action handling, memory writes piggybacked in unrelated branches, README/CLAUDE.md as architectural authority |
| **Archive** | Migration PDFs (after absorption), Technical guide PDF (after absorption), COMPILARIS_UCENICUL_OVERVIEW.md, Legacy PNG diagrams |
| **Delete** | Hidden cross-node coupling patterns, branch-local response formatting as final truth, old branch-level user response generation, duplicate PDF copies |

---

## 3. Current Monolith -> Target Orchestrator Mapping

| Current Monolith Component | Target Orchestrator Component | Notes |
|---|---|---|
| Message intake (Telegram webhook) | Input Gateway + Normalize Message | Preserve gateway; add normalization layer |
| Intent classification (brain) | Orchestrator Planner (within thread context) | Intent classification becomes an input to planning, not the routing mechanism |
| Route-by-switch | Thread Resolver + Execution Context Manager | Replace switch with thread resolution + plan generation |
| Branch execution (task/reminder/etc.) | Dispatcher + Module sub-workflows | Each branch becomes a module behind contracts |
| Per-branch response text | Response Composer (centralized) | All partial results aggregated before composition |
| Scattered memory writes | memory_module (single module) | All memory operations go through one module |
| No execution tracking | Execution Context + Plan objects | New — explicit state tracking |
| No thread concept | Thread Resolver + threads table | New — thread-first architecture |

---

## 4. Cutover Order

### Phase 1 — Freeze and Inventory

- Freeze documentation; mark current intent-first flow as legacy/current-state
- Inventory all current workflows and nodes
- Mark each workflow/node as: preserve, refactor, deprecate, or delete
- Identify all response generation points
- Identify all memory write points
- Identify all DB write points

### Phase 2 — Introduce the New Core

- Create canonical Message object handling
- Implement Thread Resolver
- Implement Execution Context Manager
- Implement Orchestrator Planner node
- Implement Dispatcher
- Implement Result Aggregator
- Implement Response Composer
- Create Capability Registry

### Phase 3 — Refactor Operational Modules

- Refactor task logic into task_module behind Module Request/Result contracts
- Refactor reminder logic into reminder_module
- Refactor memory logic into memory_module
- Refactor feedback capture into improvement_module

### Phase 4 — Remove Legacy Pathing

- Remove old route-by-single-intent as central pattern
- Remove response normalization performed in each branch
- Remove split-first as default architectural strategy
- Remove ad hoc cross-branch coupling

### Phase 5 — Add Watcher Path

- Add watcher_module_basic as a module path
- Watcher outputs flow through Result Aggregator
- Not central orchestration logic

### Phase 6 — Schema and Privacy Alignment

- Add threads, entities, execution_contexts tables
- Add privacy content class fields to messages
- Add privacy_audit_records placeholder
- Prepare secure_identity_mapping store placeholder

---

## 5. Transitional Layer Rules

- Current monolith n8n workflow may remain as transitional implementation during migration
- It is NOT target architecture and must never be treated as such
- Existing task/reminder CRUD SQL may be wrapped in module contracts rather than immediately rewritten
- Existing parser/brain logic may remain temporarily while planner/module contracts are introduced
- All transitional wrappers must have explicit sunset criteria documented here
- No new feature development may optimize the old route-by-intent model
- Transitional code must not introduce new coupling to the old pattern

---

## 6. Rollback Note

- Each phase can be rolled back independently if the previous phase's transitional wrappers are preserved
- Phase 2 (new core) can coexist with legacy routing temporarily if needed
- Rollback of Phase 4 (legacy removal) requires keeping legacy branches until all module contracts are validated
- Full rollback to pre-migration state is possible by restoring archived n8n workflows, but this is a last resort
- All rollback procedures assume PostgreSQL schema changes are backward-compatible (additive columns only)

---

## 7. Incompatibility List

| New Architecture Requirement | Incompatible Legacy Pattern | Resolution |
|---|---|---|
| Thread-first resolution | No thread concept; messages processed independently | Implement Thread Resolver; cannot coexist with no-thread assumption |
| Plan-first execution | Route-by-switch intent routing | Plan replaces switch; transitional wrapper may route to old branches temporarily |
| One final response | Per-branch response generation | Response Composer must be sole producer; old branch responses must be removed |
| Module contracts | Inline business logic in n8n branches | Wrap or refactor; inline logic cannot persist as target-state |
| Privacy content classes | Single content field (messages.content) | Schema migration required; additive — old field preserved temporarily |

---

## 8. Legacy Anti-pattern Elimination Checklist

- [ ] One message -> one intent hard binding: ELIMINATED
- [ ] Split-first multi-action handling as main logic: ELIMINATED
- [ ] Branch-specific user response generation before aggregation: ELIMINATED
- [ ] Fragile node coupling through implicit context grabs: ELIMINATED
- [ ] Memory writes piggybacked in unrelated branches: ELIMINATED
- [ ] Module chaining without orchestrator control: ELIMINATED
- [ ] Using RAG as source of truth for operational status: ELIMINATED
- [ ] Storing strong subjective conclusions after one weak signal: ELIMINATED
- [ ] Full-history dumps into every module prompt: ELIMINATED
- [ ] Retry logic that duplicates side effects: ELIMINATED

---

## 9. Phase-based Acceptance Criteria

### Phase 1 Acceptance

- All current workflows inventoried with preserve/refactor/deprecate/delete classification
- Documentation frozen with legacy markers applied
- No new features built on old pattern

### Phase 2 Acceptance

- Thread Resolver functional and logging decisions
- Execution Context created per trigger message
- Orchestrator Planner generates valid Plan objects
- Dispatcher dispatches to at least one module
- Response Composer produces single final response
- Capability Registry contains all MVP modules

### Phase 3 Acceptance

- task_module, reminder_module, memory_module, improvement_module all respond to Module Request with Module Result
- Old inline logic no longer called directly by orchestrator
- Module read/write scopes enforced

### Phase 4 Acceptance

- No remaining code path routes by single-intent switch as central logic
- No branch-local response generation
- No ad hoc cross-branch coupling

### Phase 5 Acceptance

- watcher_module_basic produces proposals through Result Aggregator
- Watcher outputs do not bypass orchestrator

### Phase 6 Acceptance

- threads, entities, execution_contexts tables exist in PostgreSQL
- messages table includes llm_safe_content, rag_safe_content columns
- Privacy Gate Inbound and Outbound nodes exist as NO-OP in workflow

---

## 10. Deprecation Notice Templates

### For deprecated documentation

```
> **DEPRECATED**: This document describes the legacy intent-first architecture.
> It is retained as historical reference only.
> The canonical architecture is defined in `docs/Architecture_Spec_v3_Ucenicul.md`.
> Do not use this document for new implementation decisions.
```

### For deprecated code/workflow patterns

```
// DEPRECATED: This branch uses the legacy route-by-intent pattern.
// Target architecture uses Thread Resolver + Orchestrator Planner + Dispatcher.
// See docs/Architecture_Spec_v3_Ucenicul.md for canonical pattern.
// Sunset target: Phase 4 completion.
```

---

## 11. Workflow Mapping Dependencies

| Migration Phase | Depends On |
|---|---|
| Phase 2 (new core) | Phase 1 (inventory complete) |
| Phase 3 (module refactor) | Phase 2 (dispatcher exists) |
| Phase 4 (legacy removal) | Phase 3 (all modules behind contracts) |
| Phase 5 (watchers) | Phase 2 (result aggregator exists) |
| Phase 6 (schema/privacy) | Phase 2 (thread resolver exists); can run partially in parallel with Phase 3 |

---

## 12. Legacy Workflow Notes Status

**All legacy workflow notes, descriptions, and documentation that describe the monolithic intent-first pattern are classified as HISTORICAL ONLY.**

They may be used for:

- Understanding what currently exists in the codebase
- Identifying business logic to preserve within module contracts
- Debugging during transitional period

They MUST NOT be used for:

- Architectural direction
- New feature design
- Target-state documentation

---

## Document Canonicality Footer

> **This document is Level 1 — Canonical (migration truth).**
> Version: 1.0 | Last updated: 2026-04-15 | Status: Approved for implementation handoff
> Subordinate to Architecture Spec v3 for architectural definitions.
