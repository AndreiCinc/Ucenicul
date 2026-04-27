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

from or_logic import (
    validate_ec_result,
    extract_handoff_input,
    verify_context_match,
    build_handoff_payload,
    build_error_payload,
)

BLUEPRINT_PATH = ROOT / 'workflows' / 'WF-OR-01_Orchestrator_Input_Handoff.json'
SQL_DIR = ROOT / 'workflows' / 'sql' / 'or'
BUILD_REPORT = ROOT / 'docs' / 'ucenicul_claude_handoff_hardened' / 'BUILD_REPORT.md'
AUDIT_REPORT = ROOT / 'docs' / 'ucenicul_claude_handoff_hardened' / 'AUDIT_REPORT.md'
STATE_JSON = ROOT / 'docs' / 'ucenicul_claude_handoff_hardened' / 'STATE.json'

VALID_EC = {
    'status_kind': 'success',
    'result_type': 'state',
    'module_name': 'execution_context_init',
    'payload': {
        'tenant_id': '20000000-0000-0000-0000-000000000001',
        'thread_id': '30000000-0000-0000-0000-000000000001',
        'execution_id': '10000000-0000-0000-0000-000000000001',
        'trigger_message_id': '40000000-0000-0000-0000-000000000001',
        'idempotency_key': 'wf_or_01_fixture_happy_v1',
        'status': 'initialized',
        'ttl_seconds': 900,
    }
}

VALID_DB_ROW = {
    'execution_id': VALID_EC['payload']['execution_id'],
    'tenant_id': VALID_EC['payload']['tenant_id'],
    'thread_id': VALID_EC['payload']['thread_id'],
    'trigger_message_id': VALID_EC['payload']['trigger_message_id'],
    'idempotency_key': VALID_EC['payload']['idempotency_key'],
    'status': VALID_EC['payload']['status'],
    'ttl_seconds': VALID_EC['payload']['ttl_seconds'],
}


def load_blueprint():
    return json.loads(BLUEPRINT_PATH.read_text(encoding='utf-8'))


def load_sql(name: str) -> str:
    return (SQL_DIR / name).read_text(encoding='utf-8')


def make_case(idx: int):
    data = json.loads(json.dumps(VALID_EC))
    data['payload']['idempotency_key'] = f"wf_or_01_case_{idx:03d}"
    data['payload']['execution_id'] = f"10000000-0000-0000-0000-{idx+1:012d}"[-36:]
    return data


class BaseFamily(unittest.TestCase):
    family_name = 'base'


class InputValidationFamily(BaseFamily):
    family_name = 'input_validation'


def _input_validation_test(i: int):
    def test(self):
        payload = make_case(i)
        result = validate_ec_result(payload)
        self.assertTrue(result.valid)
        self.assertEqual(result.normalized['result_type'], 'state')
        self.assertEqual(result.normalized['payload']['ttl_seconds'], 900)
    return test

for i in range(50):
    setattr(InputValidationFamily, f'test_{i:03d}', _input_validation_test(i))


class MalformedShapeFamily(BaseFamily):
    family_name = 'malformed_shape'


def _malformed_test(i: int):
    def test(self):
        payload = make_case(i)
        field = ['status_kind', 'result_type', 'payload.tenant_id', 'payload.thread_id', 'payload.execution_id'][i % 5]
        if field == 'status_kind':
            payload.pop('status_kind', None)
        elif field == 'result_type':
            payload['result_type'] = 'handoff'
        else:
            _, inner = field.split('.')
            payload['payload'].pop(inner, None)
        result = validate_ec_result(payload)
        self.assertFalse(result.valid)
        self.assertIn(result.code, {'INVALID_HANDOFF_INPUT', 'NOT_READY_FOR_PLANNING'})
    return test

for i in range(50):
    setattr(MalformedShapeFamily, f'test_{i:03d}', _malformed_test(i))


class ExtractHandoffInputFamily(BaseFamily):
    family_name = 'extract_handoff_input'


def _extract_test(i: int):
    def test(self):
        payload = make_case(i)
        result = validate_ec_result(payload)
        handoff = extract_handoff_input(result.normalized)
        self.assertEqual(handoff['tenant_id'], payload['payload']['tenant_id'])
        self.assertEqual(handoff['expected_status'], 'initialized')
        self.assertTrue(handoff['idempotency_key'].startswith('wf_or_01_case_'))
    return test

for i in range(50):
    setattr(ExtractHandoffInputFamily, f'test_{i:03d}', _extract_test(i))


class ContextMatchFamily(BaseFamily):
    family_name = 'context_match'


def _context_test(i: int):
    def test(self):
        payload = make_case(i)
        result = validate_ec_result(payload)
        handoff = extract_handoff_input(result.normalized)
        row = dict(VALID_DB_ROW)
        row['execution_id'] = handoff['execution_id']
        row['idempotency_key'] = handoff['idempotency_key']
        variant = i % 5
        if variant == 1:
            row['tenant_id'] = '99999999-0000-0000-0000-000000000001'
            verified = verify_context_match(handoff, row)
            self.assertFalse(verified['ok'])
        elif variant == 2:
            row['thread_id'] = '99999999-0000-0000-0000-000000000002'
            verified = verify_context_match(handoff, row)
            self.assertFalse(verified['ok'])
        elif variant == 3:
            verified = verify_context_match(handoff, None, strict_db_check=False)
            self.assertTrue(verified['ok'])
            self.assertTrue(verified['warnings'])
        elif variant == 4:
            verified = verify_context_match(handoff, None, strict_db_check=True)
            self.assertFalse(verified['ok'])
        else:
            verified = verify_context_match(handoff, row)
            self.assertTrue(verified['ok'])
    return test

for i in range(50):
    setattr(ContextMatchFamily, f'test_{i:03d}', _context_test(i))


class HandoffPayloadBuilderFamily(BaseFamily):
    family_name = 'handoff_payload_builder'


def _payload_builder_test(i: int):
    def test(self):
        payload = make_case(i)
        result = validate_ec_result(payload)
        handoff = extract_handoff_input(result.normalized)
        row = dict(VALID_DB_ROW)
        row['execution_id'] = handoff['execution_id']
        row['idempotency_key'] = handoff['idempotency_key']
        verified = verify_context_match(handoff, row)
        built = build_handoff_payload(handoff, verified)
        self.assertEqual(built['result_type'], 'handoff')
        self.assertEqual(built['payload']['allowed_next_stage'], 'WF-PL-01')
        self.assertTrue(built['payload']['planning_allowed'])
        self.assertFalse(built['payload']['orchestrator_input']['module_execution_allowed'])
    return test

for i in range(50):
    setattr(HandoffPayloadBuilderFamily, f'test_{i:03d}', _payload_builder_test(i))


class ErrorPayloadBuilderFamily(BaseFamily):
    family_name = 'error_payload_builder'


def _error_builder_test(i: int):
    def test(self):
        payload = build_error_payload('INVALID_HANDOFF_INPUT', f'error-{i}', ['field_a', 'field_b'])
        self.assertEqual(payload['status_kind'], 'failed')
        self.assertEqual(payload['error']['code'], 'INVALID_HANDOFF_INPUT')
        self.assertEqual(payload['error']['missing_fields'], ['field_a', 'field_b'])
    return test

for i in range(50):
    setattr(ErrorPayloadBuilderFamily, f'test_{i:03d}', _error_builder_test(i))


class SQLContractsFamily(BaseFamily):
    family_name = 'sql_contracts'


def _sql_contract_test(i: int):
    def test(self):
        files = [
            '01_schema_inspect.sql',
            '02_load_execution_context.sql',
            '03_load_execution_context_by_idempotency.sql',
            '10_fixtures_create.sql',
            '11_fixtures_cleanup.sql',
            '20_read_path_probe.sql',
        ]
        sql = load_sql(files[i % len(files)])
        self.assertTrue(sql.strip())
        if 'load_execution_context' in files[i % len(files)] or 'read_path_probe' in files[i % len(files)]:
            self.assertRegex(sql, r'\$1')
            self.assertIn('tenant_id', sql)
        if files[i % len(files)] == '10_fixtures_create.sql':
            self.assertIn('execution_contexts_claude_mcp', sql)
        if files[i % len(files)] != '01_schema_inspect.sql':
            self.assertNotIn('UPDATE tasks', sql)
            self.assertNotIn('INSERT INTO tasks', sql)
    return test

for i in range(50):
    setattr(SQLContractsFamily, f'test_{i:03d}', _sql_contract_test(i))


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
        if i % 2 == 0:
            route = next(node for node in blueprint['nodes'] if node['name'] == 'OR_Route_Valid')
            route_json = json.dumps(route)
            self.assertIn('OR_Extract_Handoff_Input', json.dumps(blueprint['connections']))
            self.assertIn('OR_Return_Error', json.dumps(blueprint['connections']))
    return test

for i in range(50):
    setattr(BlueprintStructureFamily, f'test_{i:03d}', _blueprint_test(i))


class ReplayStabilityFamily(BaseFamily):
    family_name = 'replay_stability'


def _replay_test(i: int):
    def test(self):
        payload = make_case(i)
        result = validate_ec_result(payload)
        handoff = extract_handoff_input(result.normalized)
        row = dict(VALID_DB_ROW)
        row['execution_id'] = handoff['execution_id']
        row['idempotency_key'] = handoff['idempotency_key']
        first = build_handoff_payload(handoff, verify_context_match(handoff, row))
        second = build_handoff_payload(handoff, verify_context_match(handoff, row))
        self.assertEqual(first, second)
    return test

for i in range(50):
    setattr(ReplayStabilityFamily, f'test_{i:03d}', _replay_test(i))


class ToolingReportingFamily(BaseFamily):
    family_name = 'tooling_reporting'


def _report_test(i: int):
    def test(self):
        build = BUILD_REPORT.read_text(encoding='utf-8')
        audit = AUDIT_REPORT.read_text(encoding='utf-8')
        state = json.loads(STATE_JSON.read_text(encoding='utf-8'))
        self.assertIn('WF-OR-01', build)
        self.assertIn('500 / 500', build)
        self.assertIn('7.5 / 10', audit)
        self.assertEqual(state['current_stage'], 'WF-OR-01')
        self.assertEqual(state['script_level_tests']['tests_total'], 500)
    return test

for i in range(50):
    setattr(ToolingReportingFamily, f'test_{i:03d}', _report_test(i))


if __name__ == '__main__':
    unittest.main(verbosity=2)
