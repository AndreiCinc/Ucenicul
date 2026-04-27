# Skill 33 — Subworkflow Connector Patcher

## Goal
Persistently connect canonical workflow edges inside n8n.

## Default mechanism
`Execute Workflow` with synchronous wait semantics.

## Responsibilities
- detect missing canonical connector
- make target callable as a subworkflow if needed
- define source → target input mapping
- snapshot pre-patch JSON
- patch locally
- patch live
- verify persistence
- run smoke case
- emit connector patch record

## Required output artifact
Produce a `CONNECTOR_PATCH_RECORD` artifact for every applied or attempted canonical patch.

## Rule
A correct canonical patch remains in place.
