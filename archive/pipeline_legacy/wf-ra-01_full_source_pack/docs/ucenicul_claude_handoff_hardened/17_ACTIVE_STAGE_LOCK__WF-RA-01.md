# 17_ACTIVE_STAGE_LOCK — WF-RA-01 CLOSED (live_closed)

LOCK_STATUS: CLOSED
ACTIVE_STAGE: WF-RA-01
POSTURE: live_closed
SCORE: 10 / 10
SCORE_CAP: 10 / 10
UPSTREAM_CLOSED_REQUIRED: WF-ME-01
DOWNSTREAM_STAGE: WF-SU-01
DOWNSTREAM_ADVANCE_ALLOWED: true
LIVE_WORKFLOW_ID: 5RcNLtxNjAHJsZPE
LIVE_VERSION_ID: 8eeb0bd0-477c-40a3-839a-8f76415bc962
LIVE_E2E_EXECUTIONS: 736 (V3 happy), 737 (V5 context mismatch), 738 (V4 malformed batch)

## Hard rules (preserved, informational)
- WF-RA-01 is closed at 10/10 with full live E2E proof across V1–V6.
- WF-SU-01 may now be activated as the next stage; it consumes WF-RA-01's canonical `aggregated_result` with `allowed_next_stage=WF-SU-01`, `state_update_allowed=true`, `domain_writes_performed=false`.
- Preserve module-result batch boundaries.
- Preserve read-only posture; no writes are allowed in this stage.
- Do not regress the reconciled connection count (14) or drop canonical SQL bridge files.
- Do not replace the canonical JS in the 9 Code nodes with placeholders.
- Do not remove the Postgres `options.queryReplacement` binding on `RA_Load_Execution_Context`.
- Do not attempt another MCP `update_workflow` full-body PUT — the validator has been shown to reject the re-serialised body and one prior attempt wiped the live nodes. Any future edits must go through `patch_workflow_nodes` or the n8n UI.
- Do not remove the user-pinned pinData from `RA_Manual_Test_Trigger` without recording the closure evidence first — it is the audit trail for V3/V4/V5 E2E.
