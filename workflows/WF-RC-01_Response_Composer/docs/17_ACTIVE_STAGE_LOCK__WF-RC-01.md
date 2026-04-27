# 17_ACTIVE_STAGE_LOCK — WF-RC-01 Candidate Active (pre_live_ready)

LOCK_STATUS: CANDIDATE_ACTIVE
ACTIVE_STAGE: WF-RC-01
POSTURE: pre_live_ready
SCORE: 9.7 / 10
SCORE_CAP: 9.7 / 10
UPSTREAM_CLOSED_REQUIRED: WF-SU-01
DOWNSTREAM_STAGE: MESSAGE_OUT

## Hard rules
- Do not claim CLOSED or 10/10 before live V1–V6 evidence exists.
- Preserve one-final-response ownership at RC.
- Preserve zero-write posture in this stage.
- Preserve trigger count (2) and fallback error branches.
- Preserve Postgres queryReplacement bindings if Postgres nodes are used.
- Do not bypass RC with branch-local response fragments.
