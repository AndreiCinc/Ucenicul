# Workflow Snapshot and Rollback

This file defines how Claude must protect workflow integrity before, during, and after any live workflow change.

Use this file for every stage that changes an n8n workflow.

## 0. Goal

Prevent these failures:
- blank workflow after update
- silent loss of nodes or connections
- drift between intended patch and live active state
- inability to restore the user-provided workflow shell

## 1. Snapshot rule

Before any workflow write:
- read the live workflow
- capture a full before-snapshot
- record workflow id, version id, node count, connection count, and current trigger shape
- do not write unless a known-good snapshot exists

After any workflow write:
- re-read the workflow immediately
- capture an after-snapshot
- compare before vs after at the minimum required structural level

## 2. Minimum snapshot contents

Every snapshot must contain:
- workflow id
- workflow name
- active version id if available
- draft version id if available
- node count
- connection count
- ordered node-name list
- the exact fields targeted by the patch
- timestamp
- stage code

If a write touches routing or SQL nodes, the snapshot must also capture:
- switch routing fields
- Postgres query fields
- query parameter fields if applicable

## 3. Snapshot naming convention

Use this convention in reports or local artifacts:
- `snapshot_<stage>_before_<timestamp>`
- `snapshot_<stage>_after_<timestamp>`
- `snapshot_<stage>_rollback_source_<timestamp>`

If local files are used, keep the same naming shape.

## 4. Before-write checklist

Before each workflow write, all must be true:
- current stage file read
- workflow shell identity confirmed
- before-snapshot exists
- patch target fields identified
- rollback source identified
- expected node count range understood

If any item is missing:
- do not write

## 5. Structural comparison rules

After each write, compare at minimum:
- workflow still exists
- workflow id unchanged
- workflow name unchanged unless stage explicitly allows rename
- node count not unexpectedly collapsed
- connection count not unexpectedly collapsed
- targeted node names still exist
- targeted patched fields now match intent
- active vs draft status understood

Do not treat “write succeeded” as evidence until this comparison passes.

## 6. Blank-workflow detection

Treat the workflow as broken immediately if any is true:
- nodes array is empty unexpectedly
- connection object is empty unexpectedly
- target node names disappeared
- shell workflow exists but no longer represents the stage implementation

Action:
- rollback immediately
- classify the prior write path as unsafe for current stage
- do not retry the same strategy

## 7. Rollback sources in priority order

If rollback is required, use in this order:
1. latest live before-snapshot from the same stage attempt
2. last known good live snapshot from the current stage
3. original user-provided shell state if the stage has not yet been implemented

Do not invent a rollback payload from memory.

## 8. Rollback procedure

When rollback is required:
1. stop all new writes
2. restore from the highest-priority valid rollback source
3. re-read the workflow live
4. confirm shell identity preserved
5. confirm node count and connection count are sane
6. mark failed path in `FIX_LOG.md`
7. switch to a safer write strategy

## 9. Safe-write preference order

When choosing a workflow write strategy, prefer in this order:
1. minimal patch to existing live JSON
2. shell-preserving structural replacement with full verification
3. rollback + alternate minimal patch path

Do not prefer helper abstraction exploration over verified JSON discipline.

## 10. Stage advancement constraint

A workflow-changing stage cannot close unless:
- at least one before-snapshot exists
- at least one after-snapshot exists
- the final live workflow matches the intended structure
- no unresolved blank-workflow risk remains

## 11. Required reporting

Log in the relevant report:
- snapshot ids or labels used
- rollback source if any
- reason rollback was triggered
- exact structural delta verified
- current safest known write path
