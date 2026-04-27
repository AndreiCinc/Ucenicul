# LOCAL_ENV_PRECHECK

## Goal
Confirm the repository is fully readable and writable enough for autonomous execution.

## Mandatory Checks
- can list `workflows/`
- can open at least 3 workflow directories
- can read at least 1 local workflow `README.md`
- can read at least 1 workflow JSON
- can create and delete a benign probe file inside `inventory/`

## Failure Rule
If any of the above fails because the filesystem is virtualized, cloud-placeholder based, locked, or partially unavailable:
- classify the run as `ENVIRONMENT_BLOCKED`
- emit blocker report
- stop the run before queue processing

## Important
Path visibility alone is not enough.
A successful stat without successful read is considered failure.