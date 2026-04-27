# Blocker Register — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

No open blockers. Mission closed SUCCESS 2026-04-22.

## Historical observations (not blockers, captured for memory_module follow-up docs)

1. **Supersede input shape** — `ME_Memory_Supersede_Prep` requires `supersedes_memory_id`, `content`, `memory_type`, `category`, `source_thread_id` at the top of `inputs`. Nesting replacement fields under a `replacement: {}` object (as initial E2 runs did) triggers `MISSING_REQUIRED_FIELDS`. Surfaced via E2.1–E2.5 execs 3939–3975. Corrected in E2r runs 3984–4020.

2. **Promote field name** — `ME_Memory_Promote_Prep` requires `promotion_target: "long_term"`, not `tier: "long_term"`. Surfaced via E9.1–E9.5 execs 4283–4319. Corrected in E9r runs 4328–4364. Note: E1.1–E1.5 also used `tier` but promoted successfully — the Prep node's handling under that particular row set warrants a small follow-up note in memory_module docs, but is unrelated to V2-OBS.

Neither observation affected the V2-OBS fix's correctness — both module-input-shape issues surfaced writeful paths that still emitted envelopes with `domain_writes_performed: false` and were accepted by RA.
