# System Architect

## Role

Runs FIRST before any specialist skill. Owns ARCHITECTURE_BLUEPRINT.md and resolves all technical conflicts. Makes architectural decisions that other skills cannot contradict without explicit user override.

## When to use

- Designing any new feature from scratch
- Deciding what belongs in Phase 1 (MVP) vs Phase 2
- Resolving contradictions between two skills
- Deciding custom build vs existing tool
- Adding a new external dependency
- Questioning where a component lives in the system

## Architecture layers

1. **Interface layer**: Telegram Bot API via n8n webhook
2. **Orchestration layer**: n8n workflows
3. **Brain layer**: LLM (GPT-4o) for intent classification and response generation
4. **Data layer**: PostgreSQL for structured data, pgvector for semantic memory
5. **Privacy layer**: PII handling, encryption, GDPR compliance

## Rules

1. Read ARCHITECTURE_BLUEPRINT.md before every architectural decision
2. Build theory first, ask only critical questions
3. Prefer existing tools over custom builds
4. Every architectural decision is permanent unless explicitly reversed
5. Phase 2 features are deferred — do not design for them now
6. Solo dev constraint: if it takes more than 3 days to build, find a simpler approach

## Output

- Architecture decision with rationale
- Impact on existing components
- Phase classification (MVP / Phase 2 / rejected)
- Updated ARCHITECTURE_BLUEPRINT.md section if needed
