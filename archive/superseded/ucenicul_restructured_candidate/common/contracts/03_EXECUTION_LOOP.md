# Execution Loop

This is the mandatory loop for every active stage.

## Core loop

1. Read `CURRENT_STAGE.md`, active stage file, active lock, and `STATE.json`
2. Run reality check:
   - live workflow
   - live DB
3. Build the minimum required implementation
4. Self-audit
5. If score < 10/10:
   - fix the smallest blocking gap
   - re-audit
6. Run the minimum runtime proof required by the stage
7. Verify post-test DB state
8. Re-audit
9. Close only at 10/10

## Visual sequence

Read active stage
-> Reality check
-> Build minimum delta
-> Audit
-> Fix smallest blocking gap
-> Re-audit
-> Runtime proof
-> Post-test DB check
-> Final audit
-> Closure or blocked state

## Hard advancement rule

You may not advance after a build pass.

You may advance only after:
- audit completed
- fixes applied where required
- runtime proof completed
- post-test DB verification completed
- final score = 10/10
- closure report written
- `STATE.json` advanced cleanly

## Build mode

Build mode means:
- minimum contract-aligned change only
- no adjacent cleanup unless it blocks the stage
- no future-stage implementation
- no tool research beyond what the stage needs to ship

## Audit mode

Every audit statement must be classified as:
- verified by live workflow read
- verified by DB query
- verified by runtime execution
- inferred but not yet executed
- unknown

Unknowns are forbidden at closure.

## Fix mode

Every fix must be:
- minimal
- evidence-driven
- stage-bounded
- reversible when possible

Do not fix unrelated issues unless the stage contract requires them.

## Runtime mode

Runtime tests must cover, when applicable:
- happy path
- invalid input path
- replay/idempotency path
- tenant/isolation path
- one stage-specific handoff path from the upstream stage

If a stage is blocked before runtime because the write surface itself is unavailable:
- do not fake runtime
- classify the stage correctly
- leave a next executable action

## Closure mode

Closure requires:
- what is live
- what was tested
- what was proven
- what remains outside scope
- whether the next stage is ready
- the exact next executable path

Evidence without a next executable path is incomplete handoff.

## SDK divergence hard rule

If the SDK or MCP path diverges from documented behavior:
- do not reverse-engineer it during an active stage
- classify it as a degraded tool path
- switch to the fallback defined in `12_TOOL_FAILURE_MATRIX.md`
- if no verified fallback exists, emit `BLOCKED_WITH_EVIDENCE`

## Strategy ceiling

Any single strategy may be attempted at most three times total in one stage.
Cosmetic variations do not reset the counter.
On the third failure without new evidence:
- ban that strategy for the remainder of the stage
- record the ban in `FIX_LOG.md`
- continue only through a materially different path

## Loop-break conditions

Invoke Loop Breaker when:
- the same failed tool path repeats twice
- the same write claims success but re-read disproves it twice
- no live delta is produced twice
- SDK exploration starts replacing stage shipping
- workflow shell safety is at risk

## End-of-run states

Every unattended run must end in one of these states only:
- `stage_closed`
- `stage_active_with_next_action`
- `blocked_with_evidence`
- `human_decision_required`
