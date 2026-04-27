# Workflow Snapshot and Rollback

This file defines how Claude must protect workflow integrity before, during, and after any live workflow change.

Use it for every workflow-changing stage.

## Goal

Prevent:
- blank workflow after update
- silent loss of nodes or connections
- drift between intended patch and live state
- inability to restore the user-created shell

## Snapshot rule

Before any workflow write:
- read live workflow
- capture a full before-snapshot
- record workflow id, version ids if visible, node count, connection count, trigger shape, and target fields

After any workflow write:
- re-read immediately
- capture after-snapshot
- compare before vs after structurally

## Minimum snapshot contents

Every snapshot must include:
- workflow id
- workflow name
- active version id if available
- draft version id if available
- node count
- connection count
- ordered node-name list
- exact fields targeted by the patch
- timestamp
- stage code

If routing or SQL nodes are touched, also capture:
- switch routing fields
- SQL query text
- parameter surface
- relevant node positions if the patch changes positions

## Snapshot naming convention

Use:
- `snapshot_<stage>_before_<timestamp>`
- `snapshot_<stage>_after_<timestamp>`
- `snapshot_<stage>_rollback_source_<timestamp>`

## Before-write checklist

All must be true:
- active stage file read
- shell identity confirmed
- before-snapshot exists
- target fields identified
- rollback source identified
- expected node-count range understood

If any item is missing:
- do not write

## Structural comparison rules

After each write, compare at minimum:
- workflow still exists
- workflow id unchanged
- workflow name unchanged unless stage allows rename
- node count not unexpectedly collapsed
- connection count not unexpectedly collapsed
- targeted node names still exist
- patched fields now match intent
- shell identity preserved

## Blank-workflow detection

Treat workflow as broken immediately if any is true:
- nodes array unexpectedly empty
- connections unexpectedly empty
- target node names disappeared
- shell still exists but no longer represents the stage implementation

Action:
- rollback immediately
- classify prior path unsafe
- ban that strategy for the stage

## Rollback sources in priority order

1. latest live before-snapshot from the same attempt
2. last known good live snapshot in the stage
3. original user-created shell state if stage implementation never persisted

Never invent rollback payload from memory.

## Rollback procedure

1. stop all new writes
2. restore from highest-priority valid rollback source
3. re-read live workflow
4. confirm shell identity preserved
5. confirm node and connection counts are sane
6. log failed path in `FIX_LOG.md`
7. switch to safer strategy

## Safe-write preference order

1. minimal patch to existing native live JSON
2. shell-preserving structural replacement using native live JSON
3. rollback + alternate minimal patch path
4. blocked evidence capture

Do not prefer helper exploration over verified JSON discipline.

## Stage advancement constraint

A workflow-changing stage cannot close unless:
- at least one before-snapshot exists
- at least one after-snapshot exists when a write actually persisted
- final live workflow matches intended structure
- no unresolved shell-loss risk remains

## Required reporting

Log:
- snapshot ids used
- rollback source if any
- reason rollback was triggered
- verified structural delta
- safest known remaining write path
