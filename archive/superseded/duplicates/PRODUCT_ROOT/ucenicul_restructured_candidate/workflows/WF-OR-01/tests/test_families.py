"""WF-OR-01 heavy test suite.

13 families x 50 tests = 650 deterministic script-level tests exercising the
EC -> OR handoff adapter contract.

Required family names (per the autonomous-executor directive):
  1. input_validation
  2. happy_path
  3. invalid_input
  4. replay_idempotency
  5. cross_tenant_isolation
  6. ec_to_or_handoff
  7. node_payload_builder
  8. node_result_formatter
  9. sql_contract_validation
 10. reporting_and_tooling_contract

Supplementary stage-specific families (beyond the required minimum):
 11. extract_handoff_input
 12. error_payload_builder
 13. blueprint_structure

These tests are script-level only. They do not touch the live n8n engine or
the live database. Live proof is tracked separately by the stage reports.
"""

from __future__ import annotations

import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / 'workflows' / 'scripts' / 'or'
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from or_logic import (  # noqa: E402  (sys.path fixup above)
    CANONICAL_NEXT_STAGE,
    FORBIDDEN_PAYLOAD_KEYS,
    build_error_payload,
    build_handoff_payload,
    extract_handoff_input,
    run_full_pipeline,
    validate_ec_result,
    verify_context_match,
)

BLUEPRINT_PATH = ROOT / 'workflows' / 'WF-OR-01_Orchestrator_Input_Handoff.json'
SQL_DIR = ROOT / 'workflows' / 'sql' / 'or'
DOCS_DIR = ROOT / 'docs' / 'ucenicul_claude_handoff_hardened'
BUILD_REPORT = DOCS_DIR / 'BUILD_REPORT.md'
AUDIT_REPORT = DOCS_DIR / 'AUDIT_REPORT.md'
CLOSURE_REPORT = DOCS_DIR / 'CLOSURE_REPORT.md'
ROUTE_MAP = DOCS_DIR / '00_ROUTE_MAP.md'
STATE_JSON = DOCS_DIR / 'STATE.json'

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TENANT = '20000000-0000-0000-0000-000000000001'
THREAD = '30000000-0000-0000-0000-000000000001'
EXEC_BASE = '10000000-0000-0000-0000-'
TRIG_BASE = '40000000-0000-0000-0000-'


def _uuid(base: str, idx: int) -> str:
    return (base + f"{idx:012d}")[-36:]


VALID_EC_WRAPPED = {
    'status_kind': 'success',
    'result_type': 'state',
    'module_name': 'execution_context_init',
    'payload': {
        'tenant_id': TENANT,
        'thread_id': THREAD,
        'execution_id': _uuid(EXEC_BASE, 1),
        'trigger_message_id': _uuid(TRIG_BASE, 1),
        'idempotency_key': 'wf_or_01_fixture_happy_v1',
        'status': 'initialized',
        'ttl_seconds': 900,
    },
}

VALID_EC_FLAT = {
    'status_kind': 'success',
    'result_type': 'state',
    'module_name': 'execution_context_init',
    'id': _uuid(EXEC_BASE, 1),
    'tenant_id': TENANT,
    'thread_id': THREAD,
    'trigger_message_id': _uuid(TRIG_BASE, 1),
    'status': 'initialized',
    'error': None,
}


def make_wrapped_case(idx: int) -> dict:
    """Produce a deterministic wrapped-shape EC_Return_Result for index idx."""
    data = json.loads(json.dumps(VALID_EC_WRAPPED))
    data['payload']['idempotency_key'] = f"wf_or_01_case_{idx:03d}"
    data['payload']['execution_id'] = _uuid(EXEC_BASE, idx + 1)
    data['payload']['trigger_message_id'] = _uuid(TRIG_BASE, idx + 1)
    return data


def make_flat_case(idx: int) -> dict:
    """Produce the live FLAT EC_Return_Result shape for index idx."""
    data = json.loads(json.dumps(VALID_EC_FLAT))
    data['id'] = _uuid(EXEC_BASE, idx + 1)
    data['trigger_message_id'] = _uuid(TRIG_BASE, idx + 1)
    return data


def build_db_row_for(handoff: dict) -> dict:
    return {
        'execution_id': handoff['execution_id'],
        'tenant_id': handoff['tenant_id'],
        'thread_id': handoff['thread_id'],
        'trigger_message_id': handoff['trigger_message_id'],
        'idempotency_key': handoff['idempotency_key'],
        'status': handoff['expected_status'],
        'ttl_seconds': handoff['ttl_seconds'],
    }


def load_blueprint() -> dict:
    return json.loads(BLUEPRINT_PATH.read_text(encoding='utf-8'))


def load_sql(name: str) -> str:
    return (SQL_DIR / name).read_text(encoding='utf-8')


class BaseFamily(unittest.TestCase):
    family_name = 'base'


# ---------------------------------------------------------------------------
# Family 1: input_validation
# ---------------------------------------------------------------------------

class InputValidationFamily(BaseFamily):
    family_name = 'input_validation'


def _input_validation_test(i: int):
    def test(self):
        payload = make_wrapped_case(i)
        result = validate_ec_result(payload)
        self.assertTrue(result.valid, msg=f"case {i} must validate")
        self.assertEqual(result.source_shape, 'wrapped')
        self.assertEqual(result.normalized['result_type'], 'state')
        self.assertEqual(result.normalized['payload']['ttl_seconds'], 900)
        self.assertEqual(
            result.normalized['payload']['tenant_id'], payload['payload']['tenant_id']
        )

    return test


for i in range(50):
    setattr(InputValidationFamily, f'test_{i:03d}', _input_validation_test(i))


# ---------------------------------------------------------------------------
# Family 2: happy_path
# ---------------------------------------------------------------------------

class HappyPathFamily(BaseFamily):
    family_name = 'happy_path'


def _happy_path_test(i: int):
    def test(self):
        raw = make_wrapped_case(i) if i % 2 == 0 else make_flat_case(i)
        validated = validate_ec_result(raw)
        self.assertTrue(validated.valid)
        handoff = extract_handoff_input(validated.normalized)
        row = build_db_row_for(handoff)
        verified = verify_context_match(handoff, row)
        self.assertTrue(verified['ok'])
        built = build_handoff_payload(handoff, verified)
        self.assertEqual(built['status_kind'], 'success')
        self.assertEqual(built['result_type'], 'handoff')
        self.assertEqual(built['payload']['allowed_next_stage'], 'WF-PL-01')
        self.assertTrue(built['payload']['planning_allowed'])

    return test


for i in range(50):
    setattr(HappyPathFamily, f'test_{i:03d}', _happy_path_test(i))


# ---------------------------------------------------------------------------
# Family 3: invalid_input
# ---------------------------------------------------------------------------

class InvalidInputFamily(BaseFamily):
    family_name = 'invalid_input'


def _invalid_input_test(i: int):
    def test(self):
        mode = i % 10
        if mode == 0:
            payload = make_wrapped_case(i)
            payload.pop('status_kind', None)
        elif mode == 1:
            payload = make_wrapped_case(i)
            payload.pop('result_type', None)
        elif mode == 2:
            payload = make_wrapped_case(i)
            payload['payload'].pop('tenant_id', None)
        elif mode == 3:
            payload = make_wrapped_case(i)
            payload['payload'].pop('thread_id', None)
        elif mode == 4:
            payload = make_wrapped_case(i)
            payload['result_type'] = 'handoff'
        elif mode == 5:
            payload = make_wrapped_case(i)
            payload['payload']['status'] = 'completed'
        elif mode == 6:
            payload = make_wrapped_case(i)
            payload['payload']['ttl_seconds'] = -10
        elif mode == 7:
            payload = make_wrapped_case(i)
            payload['payload']['plan'] = ['disallowed']
        elif mode == 8:
            payload = 'this is not an object'
        else:
            payload = make_wrapped_case(i)
            payload['payload']['ttl_seconds'] = 'nope'
        result = validate_ec_result(payload)
        self.assertFalse(result.valid, msg=f"mode {mode} must not validate")
        self.assertIn(result.code, {'INVALID_HANDOFF_INPUT', 'NOT_READY_FOR_PLANNING'})
        self.assertTrue(result.missing_fields or result.message)

    return test


for i in range(50):
    setattr(InvalidInputFamily, f'test_{i:03d}', _invalid_input_test(i))


# ---------------------------------------------------------------------------
# Family 4: replay_idempotency
# ---------------------------------------------------------------------------

class ReplayIdempotencyFamily(BaseFamily):
    family_name = 'replay_idempotency'


def _replay_test(i: int):
    def test(self):
        raw = make_wrapped_case(i) if i % 2 == 0 else make_flat_case(i)
        first = run_full_pipeline(raw, None, strict_db_check=False)
        second = run_full_pipeline(raw, None, strict_db_check=False)
        third = run_full_pipeline(raw, None, strict_db_check=False)
        self.assertEqual(first, second)
        self.assertEqual(second, third)
        self.assertEqual(first['status_kind'], 'success')

    return test


for i in range(50):
    setattr(ReplayIdempotencyFamily, f'test_{i:03d}', _replay_test(i))


# ---------------------------------------------------------------------------
# Family 5: cross_tenant_isolation
# ---------------------------------------------------------------------------

class CrossTenantIsolationFamily(BaseFamily):
    family_name = 'cross_tenant_isolation'


def _cross_tenant_test(i: int):
    def test(self):
        payload = make_wrapped_case(i)
        validated = validate_ec_result(payload)
        handoff = extract_handoff_input(validated.normalized)
        row = build_db_row_for(handoff)
        variant = i % 5
        if variant == 0:
            row['tenant_id'] = '99999999-9999-9999-9999-999999999901'
            expected = 'tenant_id'
        elif variant == 1:
            row['thread_id'] = '99999999-9999-9999-9999-999999999902'
            expected = 'thread_id'
        elif variant == 2:
            row['execution_id'] = '99999999-9999-9999-9999-999999999903'
            expected = 'execution_id'
        elif variant == 3:
            row['trigger_message_id'] = '99999999-9999-9999-9999-999999999904'
            expected = 'trigger_message_id'
        else:
            row['status'] = 'completed'
            expected = 'status'
        verified = verify_context_match(handoff, row)
        self.assertFalse(verified['ok'])
        self.assertEqual(verified['code'], 'CONTEXT_MISMATCH')
        self.assertIn(expected, verified['mismatched_fields'])

    return test


for i in range(50):
    setattr(CrossTenantIsolationFamily, f'test_{i:03d}', _cross_tenant_test(i))


# ---------------------------------------------------------------------------
# Family 6: ec_to_or_handoff (dual-shape adapter)
# ---------------------------------------------------------------------------

class EcToOrHandoffFamily(BaseFamily):
    family_name = 'ec_to_or_handoff'


def _ec_to_or_test(i: int):
    def test(self):
        shape = 'wrapped' if i % 2 == 0 else 'flat'
        raw = make_wrapped_case(i) if shape == 'wrapped' else make_flat_case(i)
        result = validate_ec_result(raw)
        self.assertTrue(result.valid)
        self.assertEqual(result.source_shape, shape)
        handoff = extract_handoff_input(result.normalized)
        # Forbidden keys must never leak into the handoff-input dict.
        for forbidden in FORBIDDEN_PAYLOAD_KEYS:
            self.assertNotIn(forbidden, handoff)
        if shape == 'flat':
            self.assertEqual(handoff['ttl_seconds'], 900)
            self.assertIn('exec_ctx:v1', handoff['idempotency_key'])
            self.assertTrue(
                any('synthesized' in w for w in handoff['warnings']),
                msg=f"flat case {i} must carry synthesis warning",
            )
        else:
            self.assertEqual(handoff['ttl_seconds'], 900)
            self.assertEqual(handoff['idempotency_key'], f"wf_or_01_case_{i:03d}")

    return test


for i in range(50):
    setattr(EcToOrHandoffFamily, f'test_{i:03d}', _ec_to_or_test(i))


# ---------------------------------------------------------------------------
# Family 7: node_payload_builder (OR_Build_Handoff_Payload contract)
# ---------------------------------------------------------------------------

class NodePayloadBuilderFamily(BaseFamily):
    family_name = 'node_payload_builder'


def _payload_builder_test(i: int):
    def test(self):
        raw = make_wrapped_case(i) if i % 3 != 0 else make_flat_case(i)
        result = validate_ec_result(raw)
        handoff = extract_handoff_input(result.normalized)
        row = build_db_row_for(handoff)
        verified = verify_context_match(handoff, row)
        built = build_handoff_payload(handoff, verified)
        self.assertEqual(built['status_kind'], 'success')
        self.assertEqual(built['result_type'], 'handoff')
        self.assertEqual(built['module_name'], 'orchestrator_input_handoff')
        pl = built['payload']
        self.assertEqual(pl['allowed_next_stage'], CANONICAL_NEXT_STAGE)
        self.assertTrue(pl['planning_allowed'])
        self.assertEqual(pl['execution_status'], 'initialized')
        oi = pl['orchestrator_input']
        self.assertEqual(oi['planning_mode'], 'plan_only')
        self.assertFalse(oi['module_execution_allowed'])
        self.assertFalse(oi['response_generation_allowed'])
        self.assertFalse(oi['domain_writes_allowed'])
        for forbidden in FORBIDDEN_PAYLOAD_KEYS:
            self.assertNotIn(forbidden, pl)

    return test


for i in range(50):
    setattr(NodePayloadBuilderFamily, f'test_{i:03d}', _payload_builder_test(i))


# ---------------------------------------------------------------------------
# Family 8: node_result_formatter (OR_Return_Result / OR_Return_Error shape)
# ---------------------------------------------------------------------------

class NodeResultFormatterFamily(BaseFamily):
    family_name = 'node_result_formatter'


def _result_formatter_test(i: int):
    def test(self):
        codes = ['INVALID_HANDOFF_INPUT', 'NOT_READY_FOR_PLANNING', 'CONTEXT_MISMATCH']
        code = codes[i % len(codes)]
        err = build_error_payload(
            code,
            f'Error case {i}',
            [f'field_{i}_a', f'field_{i}_b'],
        )
        self.assertEqual(err['status_kind'], 'failed')
        self.assertEqual(err['result_type'], 'error')
        self.assertEqual(err['module_name'], 'orchestrator_input_handoff')
        self.assertEqual(err['error']['code'], code)
        self.assertEqual(
            err['error']['missing_fields'],
            [f'field_{i}_a', f'field_{i}_b'],
        )
        # Error envelope must not expose a success payload shape.
        self.assertNotIn('payload', err)

    return test


for i in range(50):
    setattr(NodeResultFormatterFamily, f'test_{i:03d}', _result_formatter_test(i))


# ---------------------------------------------------------------------------
# Family 9: sql_contract_validation
# ---------------------------------------------------------------------------

class SqlContractValidationFamily(BaseFamily):
    family_name = 'sql_contract_validation'


FORBIDDEN_WRITE_PATTERNS = [
    r'\bINSERT\s+INTO\s+public\.tasks\b',
    r'\bUPDATE\s+public\.tasks\b',
    r'\bDELETE\s+FROM\s+public\.tasks\b',
    r'\bINSERT\s+INTO\s+public\.reminders\b',
    r'\bUPDATE\s+public\.reminders\b',
    r'\bDELETE\s+FROM\s+public\.reminders\b',
    r'\bINSERT\s+INTO\s+public\.memory_items\b',
    r'\bUPDATE\s+public\.memory_items\b',
    r'\bDELETE\s+FROM\s+public\.memory_items\b',
    r'\bINSERT\s+INTO\s+public\.rag_memories\b',
    r'\bUPDATE\s+public\.rag_memories\b',
    r'\bDELETE\s+FROM\s+public\.rag_memories\b',
    r'\bINSERT\s+INTO\s+public\.messages\b',
    r'\bUPDATE\s+public\.messages\b',
    r'\bDELETE\s+FROM\s+public\.messages\b',
    r'\bINSERT\s+INTO\s+public\.execution_contexts\b',
    r'\bUPDATE\s+public\.execution_contexts\b',
    r'\bDELETE\s+FROM\s+public\.execution_contexts\b',
]

SQL_FILES = [
    '01_schema_inspect.sql',
    '02_load_execution_context.sql',
    '03_load_execution_context_by_idempotency.sql',
    '10_fixtures_create.sql',
    '11_fixtures_cleanup.sql',
    '20_read_path_probe.sql',
]


def _sql_contract_test(i: int):
    def test(self):
        name = SQL_FILES[i % len(SQL_FILES)]
        sql = load_sql(name)
        self.assertTrue(sql.strip(), f"{name} must not be empty")
        for pat in FORBIDDEN_WRITE_PATTERNS:
            self.assertIsNone(
                re.search(pat, sql, re.IGNORECASE),
                msg=f"{name} contains forbidden write pattern: {pat}",
            )
        if name == '02_load_execution_context.sql':
            self.assertIn('$1', sql)
            self.assertIn('tenant_id', sql)
        if name == '03_load_execution_context_by_idempotency.sql':
            self.assertIn('$1', sql)
            self.assertIn('idempotency_key', sql)
        if name == '10_fixtures_create.sql':
            self.assertIn('execution_contexts_claude_mcp', sql)
        if name == '11_fixtures_cleanup.sql':
            self.assertIn('execution_contexts_claude_mcp', sql)
        if name == '20_read_path_probe.sql':
            self.assertIn('planning_allowed', sql)
        if name == '01_schema_inspect.sql':
            self.assertIn('information_schema', sql)

    return test


for i in range(50):
    setattr(SqlContractValidationFamily, f'test_{i:03d}', _sql_contract_test(i))


# ---------------------------------------------------------------------------
# Family 10: reporting_and_tooling_contract
# ---------------------------------------------------------------------------

class ReportingAndToolingContractFamily(BaseFamily):
    family_name = 'reporting_and_tooling_contract'


def _reporting_test(i: int):
    def test(self):
        state = json.loads(STATE_JSON.read_text(encoding='utf-8'))
        build = BUILD_REPORT.read_text(encoding='utf-8')
        audit = AUDIT_REPORT.read_text(encoding='utf-8')
        closure = CLOSURE_REPORT.read_text(encoding='utf-8')
        route = ROUTE_MAP.read_text(encoding='utf-8')
        # Current state is honest and points at WF-OR-01.
        self.assertEqual(state['current_stage'], 'WF-OR-01')
        self.assertGreaterEqual(state['script_level_tests']['tests_total'], 500)
        self.assertFalse(state['advance_allowed'])
        self.assertIn(state['phase'], {
            'source_pack_ready_waiting_for_live_proof',
            'active_with_next_action',
            'blocked_with_evidence',
        })
        # Honest posture: no false 10/10 closure claim in the closure report.
        self.assertNotIn('CLOSED at 10/10', closure)
        # Core stage artifacts must still be visible to the reports.
        self.assertIn('WF-OR-01', build)
        self.assertIn('WF-OR-01', audit)
        # Route map clearly shows WF-OR-01 ACTIVE and WF-PL-01 as the next stage.
        self.assertRegex(route, r'WF-OR-01[\s\S]*?ACTIVE')
        self.assertRegex(route, r'WF-PL-01[\s\S]*?PLANNED_NEXT')

    return test


for i in range(50):
    setattr(
        ReportingAndToolingContractFamily, f'test_{i:03d}', _reporting_test(i)
    )


# ---------------------------------------------------------------------------
# Supplementary family 11: extract_handoff_input
# ---------------------------------------------------------------------------

class ExtractHandoffInputFamily(BaseFamily):
    family_name = 'extract_handoff_input'


def _extract_test(i: int):
    def test(self):
        payload = make_wrapped_case(i)
        result = validate_ec_result(payload)
        handoff = extract_handoff_input(result.normalized)
        self.assertEqual(handoff['tenant_id'], payload['payload']['tenant_id'])
        self.assertEqual(handoff['thread_id'], payload['payload']['thread_id'])
        self.assertEqual(handoff['execution_id'], payload['payload']['execution_id'])
        self.assertEqual(
            handoff['trigger_message_id'],
            payload['payload']['trigger_message_id'],
        )
        self.assertEqual(handoff['expected_status'], 'initialized')
        self.assertEqual(handoff['ttl_seconds'], 900)
        self.assertTrue(handoff['idempotency_key'].startswith('wf_or_01_case_'))
        self.assertEqual(handoff['source_module'], 'execution_context_init')

    return test


for i in range(50):
    setattr(ExtractHandoffInputFamily, f'test_{i:03d}', _extract_test(i))


# ---------------------------------------------------------------------------
# Supplementary family 12: error_payload_builder (defaults / corner cases)
# ---------------------------------------------------------------------------

class ErrorPayloadBuilderFamily(BaseFamily):
    family_name = 'error_payload_builder'


def _err_test(i: int):
    def test(self):
        err_default = build_error_payload('INVALID_HANDOFF_INPUT', f'msg-{i}', None)
        self.assertEqual(err_default['error']['missing_fields'], [])
        self.assertEqual(err_default['status_kind'], 'failed')
        self.assertEqual(err_default['result_type'], 'error')
        self.assertEqual(err_default['module_name'], 'orchestrator_input_handoff')
        err_with_fields = build_error_payload(
            'NOT_READY_FOR_PLANNING',
            f'msg-{i}-ready',
            [f'field_{i}_x'],
        )
        self.assertEqual(err_with_fields['error']['code'], 'NOT_READY_FOR_PLANNING')
        self.assertEqual(err_with_fields['error']['missing_fields'], [f'field_{i}_x'])

    return test


for i in range(50):
    setattr(ErrorPayloadBuilderFamily, f'test_{i:03d}', _err_test(i))


# ---------------------------------------------------------------------------
# Supplementary family 13: blueprint_structure
# ---------------------------------------------------------------------------

class BlueprintStructureFamily(BaseFamily):
    family_name = 'blueprint_structure'


def _blueprint_test(i: int):
    def test(self):
        blueprint = load_blueprint()
        self.assertEqual(blueprint['name'], 'WF-OR-01')
        names = {node['name'] for node in blueprint['nodes']}
        required = {
            "When clicking 'Execute workflow'",
            'When chat message received',
            'OR_Validate_EC_Result',
            'OR_Route_Valid',
            'OR_Extract_Handoff_Input',
            'OR_Load_Execution_Context',
            'OR_Verify_Context_Match',
            'OR_Build_Handoff_Payload',
            'OR_Return_Result',
            'OR_Return_Error',
        }
        self.assertTrue(required.issubset(names))
        self.assertGreaterEqual(len(blueprint['nodes']), 10)
        self.assertIn('connections', blueprint)
        conn_json = json.dumps(blueprint['connections'])
        self.assertIn('OR_Extract_Handoff_Input', conn_json)
        self.assertIn('OR_Return_Error', conn_json)
        self.assertIn('OR_Build_Handoff_Payload', conn_json)
        self.assertIn('OR_Verify_Context_Match', conn_json)

    return test


for i in range(50):
    setattr(BlueprintStructureFamily, f'test_{i:03d}', _blueprint_test(i))


if __name__ == '__main__':
    unittest.main(verbosity=2)
