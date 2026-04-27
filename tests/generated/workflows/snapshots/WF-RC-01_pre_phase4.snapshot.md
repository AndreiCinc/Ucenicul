# WF-RC-01 pre-Phase-4 snapshot (2026-04-19)

- id: TClXgmO8H8zsSwMb
- nodeCount: 16
- connectionCount: 15
- active: true
- versionId: 64135f8f-ee1a-4e5a-935d-4fc468dd1822

Disabled nodes pending re-enable (RC→MO edge):
- RC_Prepare_MO_01_Handoff (rc-prepare-mo-handoff): disabled=true, at [2700, 360]
- RC_Dispatch_To_MO_01_SUBCALL (rc-dispatch-to-mo-01-subcall): executeWorkflow → OooZdC0DgsDR6gm0 (WF-MO-01), disabled=true, at [2940, 360]

Existing connections already wire:
- RC_Build_Output_Envelope.main[0] → [RC_Return_Result, RC_Prepare_MO_01_Handoff]
- RC_Prepare_MO_01_Handoff.main[0] → [RC_Dispatch_To_MO_01_SUBCALL]

Patch plan: unset `disabled` on both nodes. No new connections required.
