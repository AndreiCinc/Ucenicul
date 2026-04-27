# F3.1 family summary — supersede_idempotency

- target: 25
- executed: 25
- PASS: 25
- FAIL: 0
- BLOCKED: 0
- not yet executed: 0

## Verdicts

| case_id | verdict | bucket | reason |
|---|---|---|---|
| f31-supersede-001 | PASS | — | supersede oracle all checks pass (happy-active-recent target_state=active tier=recent scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-002 | PASS | — | supersede oracle all checks pass (replay-accept-same-step target_state=active tier=recent scope=reused_after_accept cat=smoke_store mt=fact) |
| f31-supersede-003 | PASS | — | supersede oracle all checks pass (happy-active-recent-obs target_state=active tier=recent scope=fresh cat=smoke_store mt=observation) |
| f31-supersede-004 | PASS | — | supersede oracle all checks pass (happy-active-recent-pricing target_state=active tier=recent scope=fresh cat=pricing mt=fact) |
| f31-supersede-005 | PASS | — | supersede oracle all checks pass (happy-active-recent-pref target_state=active tier=recent scope=fresh cat=pricing mt=preference) |
| f31-supersede-006 | PASS | — | supersede oracle all checks pass (happy-active-longterm target_state=active tier=long_term scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-007 | PASS | — | supersede oracle all checks pass (replay-longterm target_state=active tier=long_term scope=reused_after_accept cat=smoke_store mt=fact) |
| f31-supersede-008 | PASS | — | supersede oracle all checks pass (happy-longterm-obs target_state=active tier=long_term scope=fresh cat=smoke_store mt=observation) |
| f31-supersede-009 | PASS | — | supersede oracle all checks pass (already-super-recent target_state=superseded tier=recent scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-010 | PASS | — | supersede oracle all checks pass (already-super-recent-obs target_state=superseded tier=recent scope=fresh cat=smoke_store mt=observation) |
| f31-supersede-011 | PASS | — | supersede oracle all checks pass (already-super-recent-pricing target_state=superseded tier=recent scope=fresh cat=pricing mt=fact) |
| f31-supersede-012 | PASS | — | supersede oracle all checks pass (already-super-replay-error target_state=superseded tier=recent scope=reused_after_error cat=smoke_store mt=fact) |
| f31-supersede-013 | PASS | — | supersede oracle all checks pass (missing-target-1 target_state=missing tier=recent scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-014 | PASS | — | supersede oracle all checks pass (missing-target-2 target_state=missing tier=recent scope=fresh cat=smoke_store mt=observation) |
| f31-supersede-015 | PASS | — | supersede oracle all checks pass (missing-target-pricing target_state=missing tier=recent scope=fresh cat=pricing mt=fact) |
| f31-supersede-016 | PASS | — | supersede oracle all checks pass (missing-target-replay target_state=missing tier=recent scope=reused_after_error cat=smoke_store mt=fact) |
| f31-supersede-017 | PASS | — | supersede oracle all checks pass (cross-tenant-active target_state=cross_tenant tier=recent scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-018 | PASS | — | supersede oracle all checks pass (cross-tenant-active-obs target_state=cross_tenant tier=recent scope=fresh cat=smoke_store mt=observation) |
| f31-supersede-019 | PASS | — | supersede oracle all checks pass (cross-tenant-longterm target_state=cross_tenant tier=long_term scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-020 | PASS | — | supersede oracle all checks pass (cross-tenant-replay target_state=cross_tenant tier=recent scope=reused_after_error cat=smoke_store mt=fact) |
| f31-supersede-021 | PASS | — | supersede oracle all checks pass (self-target target_state=active tier=recent scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-022 | PASS | — | supersede oracle all checks pass (happy-then-second-super-chain target_state=active tier=recent scope=fresh cat=smoke_store mt=fact) |
| f31-supersede-023 | PASS | — | supersede oracle all checks pass (happy-longterm-pref target_state=active tier=long_term scope=fresh cat=pricing mt=preference) |
| f31-supersede-024 | PASS | — | supersede oracle all checks pass (happy-recent-constraint target_state=active tier=recent scope=fresh cat=smoke_store mt=constraint) |
| f31-supersede-025 | PASS | — | supersede oracle all checks pass (replay-fresh-never-happened target_state=active tier=recent scope=reused_after_accept cat=pricing mt=fact) |
