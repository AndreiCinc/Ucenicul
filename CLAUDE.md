# Ucenicul — Claude Project Instructions

## What this repo is

Ucenicul is an AI-powered operational assistant for small business owners. It uses n8n workflows as the orchestration layer, PostgreSQL + pgvector for structured and semantic memory, and a Telegram bot as the primary interface. The system is designed for multi-tenant operation, with privacy-aware processing from the start.

## How Claude should behave in this repo

- **Never commit secrets.** No API keys, tokens, passwords, or real credentials in any file. Use environment variable references or `.env.example` placeholders.
- **Workflow JSON files are artifacts, not source code.** Treat them as exported build outputs. When reviewing, focus on node naming, credential references, and data flow — not code style.
- **Keep documentation honest.** Do not claim features are production-ready unless they are. Mark work-in-progress clearly.
- **Prefer simplicity.** This is an MVP built by a solo developer. Every suggestion should pass the filter: "Does this help ship faster?"
- **Write in English** for all code, comments, and documentation. Romanian is acceptable only in user-facing prompt content and Telegram response templates.

## Coding expectations

- JavaScript (ES2020+) for n8n Code nodes and utility scripts
- SQL for PostgreSQL — always parameterized, never string-interpolated
- No TypeScript, no build step, no framework overhead for MVP
- Functions should be small and testable outside n8n when possible

## Workflow JSON handling

- Exported n8n workflows go in `workflows/`
- Before committing: replace all credential IDs with `CREDENTIAL_PLACEHOLDER`
- Remove any `staticData` or execution-specific data
- Keep node names descriptive and consistent with the architecture docs
- Document each workflow's purpose in `workflows/README.md`

## Repository quality

- Keep the repo portfolio-friendly at all times
- Every directory should have a README explaining its purpose
- Architecture docs in `docs/` should stay aligned with actual implementation
- Do not create files that serve no purpose
- Do not add dependencies without justification

## Brain contract

`src/brain/brain_contract.json` is the single source of truth for all intents, fields, and validation rules. Any change to the brain's behavior starts there. The parser, prompt, workflow SQL, and tests must all stay consistent with this file.

## Testing

Tests in `testing/` validate workflow structure, cross-artifact consistency, and Telegram message pipeline correctness. They run with plain Node.js — no test framework needed for MVP.
