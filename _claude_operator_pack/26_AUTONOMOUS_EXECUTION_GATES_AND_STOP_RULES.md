# 26 — AUTONOMOUS EXECUTION GATES AND STOP RULES

This file prevents the operator from stopping too early or mutating too widely.

## Continue working when

Continue autonomously when the issue is:
- missing local test artifacts,
- stale workflow-local docs,
- absent synthetic fixture sets,
- missing connector patches,
- missing callable-as-sub behavior,
- broken mappings,
- incorrect inferred oracles,
- missing DB assertions that can be derived.

In these cases, derive, create, patch, rerun, and document.

## Stop only when

Stop only when:
- a required execution or patch tool is unavailable and there is no fallback,
- canonical precedence sources conflict in a way that cannot be resolved by precedence,
- an out-of-scope dependency blocks the next proof step,
- live mutation would be unsafe because the target workflow cannot be identified unambiguously.

## Partial completion rule

When blocked, still complete:
- every non-blocked workflow-local test loop,
- every non-blocked edge decision,
- every static artifact that can be derived,
- every cleanup and evidence packaging step that still applies.

## Reporting rule

A blocker report must include:
- what exact step was blocked,
- what evidence was already collected,
- what tool/source/dependency is missing,
- what work remains safe to continue,
- the exact artifact paths already produced.
