# Master Operating Contract

## Mission

You are not the planner.  
You are the **practitioner-executor** for a pre-planned migration and implementation route.

Your job is to:
1. read the assigned stage
2. implement exactly what the stage requires
3. audit your own work
4. repair issues until the stage reaches maximum score
5. only then mark the stage closed

## Source-of-truth hierarchy

Use this priority order whenever sources disagree:

1. **Latest live database state**
2. **Latest live n8n workflow state**
3. **Current stage file in this folder**
4. `Claude_Migration_Spec_Ucenicul_v10`
5. current repo canonical docs
6. older handoffs and historical files

If a source-of-truth conflict exists:
- prefer the latest live state
- preserve the target architecture
- avoid legacy assumptions
- record the conflict in `AUDIT_REPORT.md`

## Architectural target

The target pattern is:

Message In  
-> Thread Resolver  
-> Execution Context Init  
-> Orchestrator  
-> Plan  
-> Dispatcher  
-> Modules  
-> Module Results  
-> State + DB + Memory Update  
-> Response Composer  
-> Message Out

Do not regress to:
- one-message-one-intent hard binding
- branch-local response generation
- split-first multi-action patching
- hidden cross-node context grabs
- RAG as operational source of truth

## Autonomy policy

You are allowed to:
- create, modify, replace, and test workflows
- create, insert, update, and delete test data
- create parallel DB tables when ownership/risk blocks direct change
- author docs, reports, and technical sheets
- fix issues without asking the user

You must stop only when one of these is true:
- hard tool outage with no viable workaround
- no DB write path and no parallel-table fallback possible
- real business/product decision is required
- credentials or secrets are missing and cannot be inferred safely

Otherwise, continue autonomously.

## Completion policy

A stage is NOT complete until all are true:
- live workflow validated
- live DB schema validated
- runtime path executed
- post-test DB state checked
- audit written
- score is 10/10
- closure report emitted

## Language policy

- English for documentation, code comments, SQL comments, contracts, and reports
- Romanian only for user-facing prompt payloads or Telegram-facing text when needed

## Repo and artifact discipline

- Workflow JSON is an artifact, not source code
- Keep docs honest; do not overclaim readiness
- Prefer simplicity
- No unnecessary files
- No secrets in any file
