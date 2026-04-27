# WF-MO-01_NODE_MAP

## Triggers
- `MO_Input` — executeWorkflowTrigger, canonical upstream entry
- `MO_Manual_Test_Trigger` — manualTrigger, live pinData / manual verification path

## Guards
- `MO_Validate_Composed_Response_Input` — validates RC envelope and gateway eligibility
- `MO_Route_Valid` — routes valid vs invalid
- `MO_Verify_Lineage_And_Replay` — verifies execution_context, thread, tenant, replay, and target/channel readiness
- `MO_Route_Context_Ready` — routes ready vs context_error

## Read nodes
- `MO_Load_Execution_Context`
- `MO_Load_Thread_Context`
- `MO_Load_Channel_Delivery_Context`
- `MO_Replay_Guard_Probe`

## Build / route nodes
- `MO_Build_Delivery_Request`
- `MO_Route_Channel`

## Delivery / logging nodes
- `MO_Send_Channel_PLACEHOLDER`
- `MO_Log_Outbound_Message`

## Terminals
- `MO_Build_Delivery_Result`
- `MO_Return_Result`
- `MO_Return_Error`
- `MO_Return_Context_Error`