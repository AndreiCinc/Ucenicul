# README_APPLY_FIRST — WF-RC-01

1. Import `workflows/WF-RC-01_Response_Composer.json` into n8n as a new workflow.
2. Rebind the Postgres credential placeholders if you intend to use the read-only context loads.
3. Re-read shell integrity:
   - 14 nodes
   - 13 main edges
   - 2 triggers
   - 2 switches
   - 2 Postgres reads
4. Run the deterministic off-node suite if needed:
   - `python workflows/tests/rc/test_families.py`
5. Only after live V1–V6 proof may RC be marked closed.

Honesty rule:
- This pack is pre-live ready.
- It is not live-closed yet.
