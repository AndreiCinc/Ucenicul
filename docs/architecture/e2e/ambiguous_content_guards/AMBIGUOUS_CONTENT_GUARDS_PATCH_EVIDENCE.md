# AMBIGUOUS CONTENT GUARDS · Patch Evidence

> Mission: `AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP`
> Apply channel: V2-028 canonical local CLI `n8n-patch.mjs replace`.

---

## Workflow versions before / after

| Workflow | id | versionId before | versionId after | nodes | connections | active |
|---|---|---|---|---|---|---|
| WF-ME-01 | `uq26nh1grIpnHju0` | `161a612d-603a-49a7-9580-a256e1c69be5` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | 61 (unchanged) | 79 (unchanged) | ✅ |

All 9 other canonical workflows unchanged from RCP1 closeout:

| WF | versionId (preserved) |
|---|---|
| TR | `89b783f8…` |
| EC | `78569035…` |
| OR | `2d37a1f3…` |
| PL | `dce0febe-1bc0-42e3-a44a-a41e6737e1e7` |
| DI | `8b10a865…` |
| RA | `4a2be8b4…` |
| SU | `4e7bc0d1…` |
| RC | `6d3f5208…` |
| MO | `4e0163b2…` |

## Diff surface

- **Nodes touched**: 2 — `ME_Task_Create_Prep`, `ME_Memory_Store_Prep` (jsCode rewrite only).
- **Nodes added/removed**: 0.
- **Connections changed**: 0.
- **Schema changes**: 0.
- **DB queries changed**: 0 (existing `_error ? all-null : […]` queryReplacement handles the no-write path).
- **Result-node code changed**: 0 (existing `_error` short-circuit pattern propagates the new typed error codes).

## Byte-identity audit on non-target nodes

Spot-checked 5 unrelated jsCode nodes against `WF-ME-01.pre.json` post-apply:

| Node | byte-identical |
|---|---|
| `ME_Improvement_Capture_Prep` | ✅ |
| `ME_Task_List_Prep` | ✅ |
| `ME_Memory_Search_Prep` | ✅ |
| `ME_Validate_Dispatcher_Result` | ✅ |
| `ME_Build_RA_Envelope` | ✅ |

(All other ME nodes preserved by V2-028 PUT-replace, which only modifies the two target node objects.)

## New jsCode literals confirmed live in post-apply pull

```
versionId: 4fd95689-39f9-4dff-8ed2-6d0ccb5270de
task_prep AMBIGUOUS_OR_EMPTY_TASK:   true
task_prep DEMONSTRATIVE_ONLY:        true
task_prep asciiFold:                 true
mem_prep  AMBIGUOUS_OR_EMPTY_MEMORY: true
mem_prep  PURE_DEMONSTRATIVE:        true
mem_prep  asciiFold:                 true
```

## Apply channel evidence

```
$ cd .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch
$ node n8n-patch.mjs replace uq26nh1grIpnHju0 \
    docs/architecture/e2e/ambiguous_content_guards/artifacts/WF-ME-01.next.json \
    --reactivate
{
  "id": "uq26nh1grIpnHju0",
  "name": "WF-ME-01 Module Execution"
}
reactivated uq26nh1grIpnHju0
```

n8n MCP `verify_workflow` post-apply:

```json
{
  "summary": {
    "id": "uq26nh1grIpnHju0",
    "nodeCount": 61,
    "connectionCount": 79,
    "active": true,
    "updatedAt": "2026-04-25T23:32:33.396Z",
    "versionId": "4fd95689-39f9-4dff-8ed2-6d0ccb5270de"
  },
  "checks": [
    { "check": "nodeCount", "pass": true, "got": 61, "want": 61 },
    { "check": "connectionCount", "pass": true, "got": 79, "want": 79 }
  ],
  "allPass": true
}
```

## No Path 5 / no duplicate / no unauthorized MCP write

- Path 5 (direct `workflow_entity` SQL): not used.
- Duplicate workflows: 0 — only `uq26nh1grIpnHju0` modified in place.
- MCP `patch_workflow_nodes` write: not used. The MCP tool was used only for the read-only `verify_workflow` check after the V2-028 PUT-replace.

## Offline simulation summary

The new jsCode was simulated locally against 24 inputs before the live PUT:

| Class | Cases | Verdict |
|---|---|---|
| TASK PREP ambiguous (must REJECT) | 7 | ✅ all 7 returned `_error: true, error_code: 'AMBIGUOUS_OR_EMPTY_TASK'` |
| TASK PREP positive (must PASS) | 6 | ✅ all 6 returned `__db.title` |
| MEM PREP ambiguous (must REJECT) | 6 | ✅ all 6 returned `_error: true, error_code: 'AMBIGUOUS_OR_EMPTY_MEMORY'` |
| MEM PREP positive (must PASS) | 5 | ✅ all 5 returned `__db.idempotency_key` |

Cases:

```
=== TASK PREP ambiguous (must REJECT) ===
C7-01 chestia aia            _error=true code=AMBIGUOUS_OR_EMPTY_TASK
C7-07 Amintește-mi           _error=true code=AMBIGUOUS_OR_EMPTY_TASK
asta                         _error=true code=AMBIGUOUS_OR_EMPTY_TASK
remind me                    _error=true code=AMBIGUOUS_OR_EMPTY_TASK
aminteste-mi                 _error=true code=AMBIGUOUS_OR_EMPTY_TASK
reminder                     _error=true code=AMBIGUOUS_OR_EMPTY_TASK
fă-l                         _error=true code=AMBIGUOUS_OR_EMPTY_TASK

=== TASK PREP positive (must PASS) ===
REG-01 long task             title=regression smoke pentru chain post-improvement
C8-01 contract               title=pregătește contractul cu clientul X
REG-02 reminder              title=validate regression smoke
F14 task                     title=F14 regression smoke pentru task path
C8-04 prezentare             title=pregătește prezentarea pentru investitori vineri
short legitimate             title=sună João

=== MEM PREP ambiguous (must REJECT) ===
C7-05 asta                   _error=true code=AMBIGUOUS_OR_EMPTY_MEMORY
this                         _error=true code=AMBIGUOUS_OR_EMPTY_MEMORY
X                            _error=true code=AMBIGUOUS_OR_EMPTY_MEMORY
aia asta                     _error=true code=AMBIGUOUS_OR_EMPTY_MEMORY
something                    _error=true code=AMBIGUOUS_OR_EMPTY_MEMORY
Ține minte asta              _error=true code=AMBIGUOUS_OR_EMPTY_MEMORY

=== MEM PREP positive (must PASS) ===
C2-01 google meet            idem=store_memory:exec-test-1:step_01
REG-05 billing               idem=store_memory:exec-test-1:step_01
C9 annual                    idem=store_memory:exec-test-1:step_01
short fact (TVA 19%)         idem=store_memory:exec-test-1:step_01
andrei tech                  idem=store_memory:exec-test-1:step_01
```

The live runtime test matrix (`AMBIGUOUS_CONTENT_GUARDS_RUNTIME_RESULTS.md`) follows next.

## Artifacts

- `artifacts/WF-ME-01.pre.json` — pre-apply baseline (61n / 79c, versionId `161a612d…`)
- `artifacts/WF-ME-01.next.json` — PUT-applied JSON (61n / 79c)
- `artifacts/WF-ME-01.post.json` — post-apply re-pull (61n / 79c, versionId `4fd95689…`)
- `artifacts/task_prep.js` — new ME_Task_Create_Prep jsCode (v1.1)
- `artifacts/mem_prep.js` — new ME_Memory_Store_Prep jsCode (v1.1)
- `artifacts/ME_Task_Create_Prep.pre.js` — pre-apply jsCode (v1.0)
- `artifacts/ME_Memory_Store_Prep.pre.js` — pre-apply jsCode (v1.0)
- `artifacts/ME_Improvement_Capture_Prep.pre.js` — reference pattern
- `artifacts/PL_Build_Planner_Input.pre.js` — PL extractor (read-only reference)
- `artifacts/build_acg_patch.mjs` — assembler (V2-028 channel)
