# sql/

## Purpose

Workflow-specific SQL for WF-TR-01 Thread Resolver.

## Contents

- `MIGRATION_messages_for_WF-TR-01.sql` — one-off migration against the `messages` table required by the WF-TR-01 thread-resolution logic.

## Canonicality

- This file is the canonical location for the WF-TR-01 messages migration.

## Not source of truth

- Node-level SQL used inside the workflow JSON is canonical inside the JSON, not here. This folder holds only off-node SQL.

## Parameter signature policy

This workflow's SQL follows the canonical policy defined in `docs/architecture/n8n_Workflow_Mapping.md` §5: parameterized queries preferred; sanitized inline interpolation acceptable only when the n8n node does not support parameter binding, with rationale documented.
