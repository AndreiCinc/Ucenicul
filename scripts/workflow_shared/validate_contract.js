/**
 * validate_contract.js
 * WF-TR-01 Thread Resolver — Contract Validator
 *
 * Purpose: Validates ThreadResolutionRequest and ThreadResolutionResult
 * against the canonical contract defined in ThreadResolutionContracts.md.
 *
 * Supports both shapes:
 * - Flat shape: message_id, tenant_id, channel, etc. (workflow contract)
 * - Nested shape: request.message.*, reply_context.*, resolution_policy.* (user anchor fixtures)
 *
 * Usage:
 *   node validate_contract.js request <json_file_or_inline_json>
 *   node validate_contract.js result <json_file_or_inline_json>
 *   node validate_contract.js all    (runs built-in contract conformance tests)
 *
 * Exit codes:
 *   0 = all validations pass
 *   1 = validation failure(s) found
 */

const fs = require('fs');

// --- Contract definitions ---

const REQUIRED_REQUEST_FIELDS = [
  'message_id', 'tenant_id', 'channel', 'direction',
  'author_type', 'normalized_content', 'timestamp', 'source_message_ref'
];

const OPTIONAL_REQUEST_FIELDS = [
  'author_entity_id', 'thread_id', 'reply_to_message_id',
  'related_entity_ids', 'metadata'
];

const FORBIDDEN_REQUEST_FIELDS = ['raw_content', 'full_message_history'];

const ALLOWED_DIRECTIONS = ['inbound', 'outbound'];
const ALLOWED_AUTHOR_TYPES = ['user', 'system', 'bot'];

const REQUIRED_RESULT_FIELDS = [
  'resolution_id', 'message_id', 'tenant_id', 'decision',
  'resolved_thread_id', 'candidate_scores', 'ambiguity_detected',
  'content_class_used', 'decision_reason', 'timestamp', 'error'
];

const ALLOWED_DECISIONS = [
  'attach_existing_thread', 'reopen_latent_thread',
  'create_new_thread', 'fail_invalid_input'
];

const ALLOWED_CONTENT_CLASSES = ['normalized_content', 'llm_safe_content', 'none'];

// --- Helper to normalize nested to flat shape ---

function normalizeRequest(req) {
  // If nested shape (has request.message), flatten it
  if (req.request && req.request.message) {
    const nested = req.request;
    const msg = nested.message;
    const replyCtx = nested.reply_context || {};

    const flat = {
      // message fields
      message_id: msg.id || msg.message_id,
      tenant_id: msg.tenant_id,
      channel: msg.channel,
      direction: msg.direction,
      author_type: msg.author_type,
      normalized_content: msg.normalized_content,
      timestamp: msg.timestamp,
      source_message_ref: msg.source_message_ref,
      author_entity_id: msg.author_entity_id,
      thread_id: msg.thread_id,
      related_entity_ids: msg.related_entity_ids,
      metadata: msg.metadata,

      // reply_context fields
      reply_to_message_id: replyCtx.reply_to_message_id,
      reply_to_thread_id: replyCtx.reply_to_thread_id
    };

    // Remove undefined fields
    Object.keys(flat).forEach(k => flat[k] === undefined && delete flat[k]);

    // resolution_policy fields are per-request config, not required in validation
    return flat;
  }
  // Already flat
  return req;
}

// --- Validation functions ---

function validateRequest(req) {
  const errors = [];
  const normalized = normalizeRequest(req);

  // Check required fields
  for (const field of REQUIRED_REQUEST_FIELDS) {
    if (normalized[field] === undefined || normalized[field] === null || normalized[field] === '') {
      errors.push(`MISSING_REQUIRED: ${field}`);
    }
  }

  // Check forbidden fields
  for (const field of FORBIDDEN_REQUEST_FIELDS) {
    if (normalized[field] !== undefined) {
      errors.push(`FORBIDDEN_FIELD: ${field} must not be present in request`);
    }
  }

  // Validate enums
  if (normalized.direction && !ALLOWED_DIRECTIONS.includes(normalized.direction)) {
    errors.push(`INVALID_ENUM: direction must be one of ${ALLOWED_DIRECTIONS.join(', ')}, got '${normalized.direction}'`);
  }
  if (normalized.author_type && !ALLOWED_AUTHOR_TYPES.includes(normalized.author_type)) {
    errors.push(`INVALID_ENUM: author_type must be one of ${ALLOWED_AUTHOR_TYPES.join(', ')}, got '${normalized.author_type}'`);
  }

  // Validate types
  if (normalized.tenant_id && typeof normalized.tenant_id !== 'string') {
    errors.push(`INVALID_TYPE: tenant_id must be string, got ${typeof normalized.tenant_id}`);
  }
  if (normalized.related_entity_ids && !Array.isArray(normalized.related_entity_ids)) {
    errors.push(`INVALID_TYPE: related_entity_ids must be array, got ${typeof normalized.related_entity_ids}`);
  }
  if (normalized.metadata && typeof normalized.metadata !== 'object') {
    errors.push(`INVALID_TYPE: metadata must be object, got ${typeof normalized.metadata}`);
  }

  // Validate content is not whitespace-only
  if (normalized.normalized_content) {
    const trimmed = normalized.normalized_content.trim();
    if (trimmed.length === 0) {
      errors.push(`INVALID_CONTENT: normalized_content must not be whitespace-only`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateResult(res) {
  const errors = [];

  // Check required fields
  for (const field of REQUIRED_RESULT_FIELDS) {
    if (res[field] === undefined) {
      errors.push(`MISSING_REQUIRED: ${field}`);
    }
  }

  // Validate decision enum
  if (res.decision && !ALLOWED_DECISIONS.includes(res.decision)) {
    errors.push(`INVALID_ENUM: decision must be one of ${ALLOWED_DECISIONS.join(', ')}, got '${res.decision}'`);
  }

  // Validate content_class_used
  if (res.content_class_used && !ALLOWED_CONTENT_CLASSES.includes(res.content_class_used)) {
    errors.push(`INVALID_ENUM: content_class_used must be one of ${ALLOWED_CONTENT_CLASSES.join(', ')}, got '${res.content_class_used}'`);
  }

  // Validate candidate_scores is array
  if (res.candidate_scores !== undefined && !Array.isArray(res.candidate_scores)) {
    errors.push(`INVALID_TYPE: candidate_scores must be array, got ${typeof res.candidate_scores}`);
  }

  // Validate ambiguity_detected is boolean
  if (res.ambiguity_detected !== undefined && typeof res.ambiguity_detected !== 'boolean') {
    errors.push(`INVALID_TYPE: ambiguity_detected must be boolean, got ${typeof res.ambiguity_detected}`);
  }

  // Validate resolution_id format (deterministic: must NOT use Date.now())
  if (res.resolution_id) {
    if (!res.resolution_id.startsWith('tr_')) {
      errors.push(`INVALID_FORMAT: resolution_id must start with 'tr_', got '${res.resolution_id}'`);
    }
    // Check that resolution_id does NOT include dynamic timestamp
    // Valid format: tr_{message_id} or tr_{message_id}_{version} or tr_{hash}
    // The key is: no 13-digit Unix timestamp (Date.now() returns milliseconds)
    const timestampPattern = /\d{13}/;
    if (timestampPattern.test(res.resolution_id)) {
      errors.push(`INVALID_FORMAT: resolution_id appears to include Date.now() timestamp (13-digit number)`);
    }
  }

  // Validate resolved_thread_id consistency
  if (res.decision === 'attach_existing_thread' || res.decision === 'reopen_latent_thread') {
    if (!res.resolved_thread_id) {
      errors.push(`CONSISTENCY: decision '${res.decision}' requires non-null resolved_thread_id`);
    }
  }
  if (res.decision === 'create_new_thread' || res.decision === 'fail_invalid_input') {
    if (res.resolved_thread_id !== null && res.resolved_thread_id !== undefined) {
      errors.push(`CONSISTENCY: decision '${res.decision}' requires null resolved_thread_id, got '${res.resolved_thread_id}'`);
    }
  }

  // Validate error field consistency
  if (res.decision === 'fail_invalid_input') {
    if (!res.error || typeof res.error !== 'object') {
      errors.push(`CONSISTENCY: decision 'fail_invalid_input' requires non-null error object`);
    } else {
      if (!res.error.code) errors.push(`MISSING_ERROR_FIELD: error.code`);
      if (!Array.isArray(res.error.missing_fields)) errors.push(`MISSING_ERROR_FIELD: error.missing_fields must be array`);
    }
  } else {
    if (res.error !== null && res.error !== undefined) {
      // error should be null for non-error decisions
      // (some implementations may set error: null explicitly, which is fine)
    }
  }

  // Validate candidate score entries
  if (Array.isArray(res.candidate_scores)) {
    for (let i = 0; i < res.candidate_scores.length; i++) {
      const cs = res.candidate_scores[i];
      const prefix = `candidate_scores[${i}]`;
      if (!cs.thread_id) errors.push(`${prefix}: missing thread_id`);
      if (cs.score === undefined) errors.push(`${prefix}: missing score`);
      if (cs.score !== undefined && (cs.score < 0 || cs.score > 1.0)) {
        errors.push(`${prefix}: score ${cs.score} out of range [0.0, 1.0]`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- Built-in conformance tests ---

function runConformanceTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

  function test(name, fn) {
    try {
      fn();
      passed++;
      results.push({ name, status: 'PASS' });
    } catch (e) {
      failed++;
      results.push({ name, status: 'FAIL', error: e.message });
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg);
  }

  // Request tests
  test('Request: valid minimal flat request passes', () => {
    const r = validateRequest({
      message_id: 'msg-001', tenant_id: 'tenant-001', channel: 'telegram',
      direction: 'inbound', author_type: 'user', normalized_content: 'Hello',
      timestamp: '2026-04-15T10:00:00Z', source_message_ref: 'tg_001'
    });
    assert(r.valid, `Expected valid, got errors: ${r.errors.join(', ')}`);
  });

  test('Request: valid nested request passes', () => {
    const r = validateRequest({
      request: {
        message: {
          id: 'msg-001', tenant_id: 'tenant-001', channel: 'telegram',
          direction: 'inbound', author_type: 'user', normalized_content: 'Hello',
          timestamp: '2026-04-15T10:00:00Z', source_message_ref: 'tg_001'
        },
        reply_context: {},
        resolution_policy: {}
      }
    });
    assert(r.valid, `Expected valid, got errors: ${r.errors.join(', ')}`);
  });

  test('Request: missing required field fails', () => {
    const r = validateRequest({ message_id: 'msg-001' });
    assert(!r.valid, 'Expected invalid');
    assert(r.errors.length >= 6, `Expected 6+ errors, got ${r.errors.length}`);
  });

  test('Request: forbidden raw_content field fails', () => {
    const r = validateRequest({
      message_id: 'msg-001', tenant_id: 'tenant-001', channel: 'telegram',
      direction: 'inbound', author_type: 'user', normalized_content: 'Hello',
      timestamp: '2026-04-15T10:00:00Z', source_message_ref: 'tg_001',
      raw_content: 'FORBIDDEN'
    });
    assert(!r.valid, 'Expected invalid');
    assert(r.errors.some(e => e.includes('FORBIDDEN_FIELD')), 'Expected FORBIDDEN_FIELD error');
  });

  test('Request: invalid direction fails', () => {
    const r = validateRequest({
      message_id: 'msg-001', tenant_id: 'tenant-001', channel: 'telegram',
      direction: 'invalid', author_type: 'user', normalized_content: 'Hello',
      timestamp: '2026-04-15T10:00:00Z', source_message_ref: 'tg_001'
    });
    assert(!r.valid, 'Expected invalid');
    assert(r.errors.some(e => e.includes('INVALID_ENUM') && e.includes('direction')), 'Expected direction enum error');
  });

  test('Request: whitespace-only content fails', () => {
    const r = validateRequest({
      message_id: 'msg-001', tenant_id: 'tenant-001', channel: 'telegram',
      direction: 'inbound', author_type: 'user', normalized_content: '   \n\t   ',
      timestamp: '2026-04-15T10:00:00Z', source_message_ref: 'tg_001'
    });
    assert(!r.valid, 'Expected invalid');
    assert(r.errors.some(e => e.includes('INVALID_CONTENT')), 'Expected content validation error');
  });

  // Result tests
  test('Result: valid attach result passes', () => {
    const r = validateResult({
      resolution_id: 'tr_msg001', message_id: 'msg-001',
      tenant_id: 'tenant-001', decision: 'attach_existing_thread',
      resolved_thread_id: 'thread-001', candidate_scores: [],
      ambiguity_detected: false, content_class_used: 'normalized_content',
      decision_reason: 'explicit reference', timestamp: '2026-04-15T10:00:00Z',
      error: null
    });
    assert(r.valid, `Expected valid, got errors: ${r.errors.join(', ')}`);
  });

  test('Result: valid create_new result passes', () => {
    const r = validateResult({
      resolution_id: 'tr_msg002', message_id: 'msg-002',
      tenant_id: 'tenant-001', decision: 'create_new_thread',
      resolved_thread_id: null, candidate_scores: [],
      ambiguity_detected: false, content_class_used: 'normalized_content',
      decision_reason: 'no candidates', timestamp: '2026-04-15T10:00:00Z',
      error: null
    });
    assert(r.valid, `Expected valid, got errors: ${r.errors.join(', ')}`);
  });

  test('Result: valid fail_invalid_input result passes', () => {
    const r = validateResult({
      resolution_id: 'tr_error', message_id: null,
      tenant_id: null, decision: 'fail_invalid_input',
      resolved_thread_id: null, candidate_scores: [],
      ambiguity_detected: false, content_class_used: 'none',
      decision_reason: 'INVALID_INPUT: tenant_id',
      timestamp: '2026-04-15T10:00:00Z',
      error: { code: 'INVALID_INPUT', missing_fields: ['tenant_id'] }
    });
    assert(r.valid, `Expected valid, got errors: ${r.errors.join(', ')}`);
  });

  test('Result: attach with null thread_id fails consistency', () => {
    const r = validateResult({
      resolution_id: 'tr_msg003', message_id: 'msg-003',
      tenant_id: 'tenant-001', decision: 'attach_existing_thread',
      resolved_thread_id: null, candidate_scores: [],
      ambiguity_detected: false, content_class_used: 'normalized_content',
      decision_reason: 'bug', timestamp: '2026-04-15T10:00:00Z', error: null
    });
    assert(!r.valid, 'Expected invalid');
    assert(r.errors.some(e => e.includes('CONSISTENCY')), 'Expected consistency error');
  });

  test('Result: invalid decision enum fails', () => {
    const r = validateResult({
      resolution_id: 'tr_msg004', message_id: 'msg-004',
      tenant_id: 'tenant-001', decision: 'invalid_decision',
      resolved_thread_id: null, candidate_scores: [],
      ambiguity_detected: false, content_class_used: 'normalized_content',
      decision_reason: 'test', timestamp: '2026-04-15T10:00:00Z', error: null
    });
    assert(!r.valid, 'Expected invalid');
  });

  test('Result: score out of range fails', () => {
    const r = validateResult({
      resolution_id: 'tr_msg005', message_id: 'msg-005',
      tenant_id: 'tenant-001', decision: 'create_new_thread',
      resolved_thread_id: null,
      candidate_scores: [{ thread_id: 'th-001', score: 1.5 }],
      ambiguity_detected: false, content_class_used: 'normalized_content',
      decision_reason: 'test', timestamp: '2026-04-15T10:00:00Z', error: null
    });
    assert(!r.valid, 'Expected invalid');
  });

  test('Result: deterministic resolution_id (no Date.now) passes', () => {
    const r = validateResult({
      resolution_id: 'tr_msg_abcd_v1', message_id: 'msg-006',
      tenant_id: 'tenant-001', decision: 'create_new_thread',
      resolved_thread_id: null, candidate_scores: [],
      ambiguity_detected: false, content_class_used: 'normalized_content',
      decision_reason: 'test', timestamp: '2026-04-15T10:00:00Z', error: null
    });
    assert(r.valid, `Expected valid, got errors: ${r.errors.join(', ')}`);
  });

  // Print results
  console.log('\n=== CONTRACT VALIDATION TEST RESULTS ===\n');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '  PASS' : '  FAIL';
    console.log(`${icon}: ${r.name}`);
    if (r.error) console.log(`        ${r.error}`);
  }
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  return failed === 0;
}

// --- Main ---

const args = process.argv.slice(2);
const mode = args[0];

if (mode === 'all') {
  const ok = runConformanceTests();
  process.exit(ok ? 0 : 1);
} else if (mode === 'request' || mode === 'result') {
  let input = args[1];
  if (!input) {
    console.error('Usage: node validate_contract.js request|result <json_or_file>');
    process.exit(1);
  }
  let data;
  try {
    if (fs.existsSync(input)) {
      data = JSON.parse(fs.readFileSync(input, 'utf8'));
    } else {
      data = JSON.parse(input);
    }
  } catch (e) {
    console.error(`Failed to parse input: ${e.message}`);
    process.exit(1);
  }
  const result = mode === 'request' ? validateRequest(data) : validateResult(data);
  if (result.valid) {
    console.log('VALID');
  } else {
    console.log('INVALID:');
    for (const err of result.errors) console.log(`  - ${err}`);
  }
  process.exit(result.valid ? 0 : 1);
} else {
  console.log('Usage:');
  console.log('  node validate_contract.js all                     Run all built-in tests');
  console.log('  node validate_contract.js request <json|file>     Validate a request');
  console.log('  node validate_contract.js result <json|file>      Validate a result');
  process.exit(0);
}
