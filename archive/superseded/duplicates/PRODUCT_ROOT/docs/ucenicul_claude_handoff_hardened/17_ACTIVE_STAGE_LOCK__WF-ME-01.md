# 17_ACTIVE_STAGE_LOCK — WF-ME-01 Candidate Active

LOCK_STATUS: CANDIDATE_ACTIVE
ACTIVE_STAGE: WF-ME-01
UPSTREAM_CLOSED_REQUIRED: WF-DI-01
DOWNSTREAM_STAGE: WF-RA-01

## Hard rules
- WF-ME-01 is active only as a candidate source pack until live proof exists.
- No claim of 10/10 or CLOSED before live import + V1–V6 + DB drift verification.
- Do not start WF-RA-01 as active truth from this pack.
- Preserve dispatcher contract boundaries.
- Preserve task_module-first posture; unsupported modules must fail closed.
