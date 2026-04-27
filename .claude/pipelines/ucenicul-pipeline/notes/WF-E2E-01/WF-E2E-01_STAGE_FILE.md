# WF-E2E-01 — Progressive Runtime Chain Verification

**Status:** `BLOCKED_ON_FEEDER_STAGES`
**Posture:** out-of-band meta-stage. **Does not displace CURRENT_STAGE.**
**Active canonical stage remains:** `WF-EC-01` (per `CURRENT_STAGE.md`, `00_ROUTE_MAP.md`).
**Authorisation:** user, 2026-04-18 — Option B (limited stitch + shell/smoke only). No full Option C.

---

## Purpose

Wire and verify the canonical Ucenicul runtime chain end-to-end:

```
TR → EC → OR → PL → DI → ME → RA → SU → RC → MO
```

This stage is a meta-stage: it depends on each canonical stage being
individually closed at 10/10. It does not replace per-stage closure work.

## Why this is currently blocked

Six of the ten chain stages are not individually closed at 10/10:
**EC-01, OR-01, PL-01, DI-01, ME-01, RA-01.** Per the closure-first
principle in CLAUDE.md, the chain cannot be closed until each link
contract is authoritative. PL-01 is explicitly `BLOCKED_WITH_EVIDENCE`
at 8.3/10, gated on EC-01 + OR-01.

Additionally, **9 sub-workflow connector nodes are missing live**:
the chain workflows exist as individuals but no `executeWorkflow` node
in any workflow currently invokes any other chain workflow.

## What this stage will do during the gating period (Option B narrow)

Allowed within Option B:

- **Documentation only** (no live mutation):
  - Per-link chain contract map (`WF-E2E-01_CHAIN_CONTRACT_MAP.md`).
  - Pack↔live diff table for every chain workflow (`WF-E2E-01_PACK_VS_LIVE_DIFF.md`).
- **Hygiene**:
  - Disposition of duplicate workflow `rooFWDryqC0YDyVa` (4-node
    LangChain agent stub erroneously named "WF-MO-01"): deactivate +
    rename, do not delete. Decision log in
    `WF-E2E-01_DUPLICATE_DISPOSITION.md`.
  - Fold `STATE_WF-SU-01.json` into top-level `STATE.json` as
    `su_01_live_impl` for tracking consistency.
- **Safe additive connector — exactly one, only with explicit per-call
  go-ahead**:
  - `RC-01 → MO-01` (both stages 10/10 verified). Plan at
    `WF-E2E-01_RC01_TO_MO01_CONNECTOR_PLAN.md`.
  - **Shipped 2026-04-18T12:34Z under Option A (Ship-Disabled).** Two
    nodes added to RC-01 (`RC_Prepare_MO_01_Handoff` and
    `RC_Dispatch_To_MO_01_SUBCALL`), both `disabled: true`. Payload
    gate (`dispatch_to_mo_01 === true`) adds a second guard. All 8
    existing jsCode bodies sha256-preserved. Zero DB drift. Zero
    Telegram fired. Activation recipe, preconditions, rollback, and
    non-closure acknowledgement documented in
    `WF-E2E-01_RC01_TO_MO01_CONNECTOR_ACTIVATION.md`. No link closure
    claimed.

Not allowed within Option B:

- Adding any `executeWorkflowTrigger` to TR-01, EC-01, OR-01, PL-01,
  DI-01, SU-01.
- Touching EC-01 (active canonical stage; under stage-lock).
- Touching PL-01, OR-01, DI-01, ME-01, RA-01 (unclosed feeders).
- Running any "40 tests per link × 9 links" matrix.
- Running a full chain end-to-end with a real Telegram delivery.
- Claiming any link or chain closure.

## Feeder closure backlog

Order matches the canonical route map:

1. **WF-TR-01** — currently route-map-asserted CLOSED with no closure
   report or STATE entry at repo root. **Re-verification required**
   (per user direction 2026-04-18) before E2E-01 may rely on its
   contract.
2. **WF-EC-01** — active canonical stage. Build + close per
   `06_STAGE_WF-EC-01.md`.
3. **WF-OR-01** — planned next.
4. **WF-PL-01** — `BLOCKED_WITH_EVIDENCE` at 8.3/10; resolve HDR-1..HDR-5
   and run V1..V6 per `WF-PL-01_IMPORT_PATCH_PLAN.md`.
5. **WF-DI-01** — planned.
6. **WF-ME-01** — planned. Has `executeWorkflowTrigger` already.
7. **WF-RA-01** — planned. Has `executeWorkflowTrigger` already.
8. **WF-SU-01** — accepted as closed-enough for E2E-01 by user
   direction 2026-04-18. State folded into top-level `STATE.json` as
   `su_01_live_impl`.
9. **WF-RC-01** — closed 10/10. Verified.
10. **WF-MO-01** — closed 10/10. Verified.

## Exit criteria for `BLOCKED_ON_FEEDER_STAGES`

E2E-01 may transition out of `BLOCKED_ON_FEEDER_STAGES` only when all of:

- TR-01 re-verified (V2..V6 + drift zero) and recorded in top-level
  STATE.json as `tr_01_live_impl` or equivalent.
- EC-01, OR-01, PL-01, DI-01, ME-01, RA-01 each individually closed at
  10/10 with their own closure report and STATE entry.
- Live chain has all 9 sub-workflow connectors in place.
- Each downstream stage that today lacks an `executeWorkflowTrigger`
  has had one added with a documented payload contract.

Until then, E2E-01 sits in this status. No closure may be claimed.
No false-green E2E may be reported.

## Audit trail

- `WF-E2E-01_PHASE_A_B_SYNTHESIS.md` — Phase A+B honest discovery
  report, written before any mutation.
- `WF-E2E-01_CHAIN_CONTRACT_MAP.md` — link contracts (this stage).
- `WF-E2E-01_PACK_VS_LIVE_DIFF.md` — 11-row diff (this stage).
- `WF-E2E-01_DUPLICATE_DISPOSITION.md` — `rooFWDryqC0YDyVa` decision.
- `WF-E2E-01_RC01_TO_MO01_CONNECTOR_PLAN.md` — connector plan with
  three option menu (A/B/C) + risk surface; superseded for this
  session by user GO on option A.
- `WF-E2E-01_RC01_TO_MO01_CONNECTOR_ACTIVATION.md` — shipped-disabled
  live state, activation preconditions, recipe, rollback.
- `tools/n8n-patch/snapshots/e2e-01-discovery/*.json` — pre-mutation
  snapshots of all 11 workflows (incl. duplicate).
- `tools/n8n-patch/.audit.jsonl` — every mutation that does occur is
  appended here automatically by `n8n-patch`.

## Final reminder

Per CLAUDE.md:
> No stage may be considered complete before 10/10 closure.
> Claude must only work on the ACTIVE stage.

E2E-01 is meta to the route map. It must not be used as a back door
to claim aggregate closure that masks individual stage gaps. Any future
work on E2E-01 must respect the feeder backlog above.
