# F6A-FOLLOWUP-SUPERSEDE-EMBED — Apply Command

Issued: 2026-04-24
Canonical channel: V2-028 autonomous agent-run local `n8n-patch` pack.
Agent owns the apply; no operator hand-off.

## Exact command (single step)

```bash
cd /sessions/tender-amazing-franklin/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch && \
  node n8n-patch.mjs replace uq26nh1grIpnHju0 \
    /sessions/tender-amazing-franklin/mnt/Ucenicul/docs/architecture/memory/v2/f6a_followup_supersede_embed/artifacts/WF-ME-01_post_f6a_followup.json
```

Secrets: the pack's local `.env` (N8N_API_KEY + N8N_API_URL) is consumed by `n8n-patch.mjs` internally. The contents are never printed to chat/docs and never passed via argv.

## Payload

- Path: `artifacts/WF-ME-01_post_f6a_followup.json`
- sha256: `7f2816afdda50021b1b9a561eed23df4ad72d5ad7db1c3f1e9205cff589773b4`
- Shape: 49 nodes, 67 connections (pre: 47/65; +2 nodes, +2 net edges).

## Safety properties of the CLI

- GET → mutate → PUT; never PATCH (per `n8n-patch.mjs` help banner).
- PUT body restricted to `{name, nodes, connections, settings}`.
- Settings filtered via n8n OpenAPI whitelist (ref n8n-io/n8n#19587).
- `.audit.jsonl` entry appended automatically; snapshots saved under `snapshots/`.
- Activation state not touched (no `--reactivate` flag — workflow stays `active=true` as-is).

## Pre-apply verification evidence

Recorded in `F6A_FOLLOWUP_SUPERSEDE_EMBED_APPLY_EVIDENCE_20260424.md §Pre-state` (Phase 5).

## Post-apply verification plan (Phase 6)

Immediately after the CLI reports exit-zero + new `versionId`:

1. `mcp__n8n__verify_workflow` expecting `nodeCount=49`, `connectionCount=67`, active=true, versionId ≠ baseline.
2. Dump live post-apply via `n8n-patch.mjs get …` and sha256-hash; compare node-by-node with the staged post payload.
3. Re-run the 14 WD checks against the live post vs the pre snapshot (alternative: re-run against the staged post — both valid proofs).
4. Re-run MU-1..MU-9 against the live jsCode (extracted into the same pure-function contract as Phase 4).
5. Fill `F6A_FOLLOWUP_SUPERSEDE_EMBED_APPLY_EVIDENCE_20260424.md §Post-state §Diff-surface`.

## Rollback

If post-verify fails:

```bash
node n8n-patch.mjs replace uq26nh1grIpnHju0 \
  /sessions/tender-amazing-franklin/mnt/Ucenicul/docs/architecture/memory/v2/f6a_followup_supersede_embed/artifacts/WF-ME-01_pre_f6a_followup.json
```

Rollback is an allowed safe operation through the same canonical channel. No Path 5 under any circumstance.
