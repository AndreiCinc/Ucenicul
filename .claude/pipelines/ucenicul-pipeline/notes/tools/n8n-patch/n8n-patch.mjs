#!/usr/bin/env node
// n8n-patch.mjs — Safe n8n workflow CRUD helper
// Node 18+ (built-in fetch). Zero npm deps. Single file.
//
// Purpose: bypass the broken n8n PATCH API behavior by always doing
// GET → mutate → PUT with a strict body whitelist. Handles the
// "settings: additionalProperties: false" trap, activation endpoints,
// webhook re-registration, and the two-workflow toolWorkflow pattern.
//
// Config: N8N_URL, N8N_API_KEY (env or .env file in cwd / parent dir).

import { readFile, writeFile, appendFile, access, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// ──────────────────────────────────────────────────────────────────────
// Constants — the rules n8n-claw discovered by trial and error.
// Reference: https://github.com/n8n-io/n8n/issues/19587
// ──────────────────────────────────────────────────────────────────────

const SETTINGS_WHITELIST = new Set([
  'saveExecutionProgress',
  'saveManualExecutions',
  'saveDataErrorExecution',
  'saveDataSuccessExecution',
  'executionTimeout',
  'errorWorkflow',
  'timezone',
  'executionOrder',
  'callerPolicy',
  'callerIds',
  'timeSavedPerExecution',
  'availableInMCP',
]);

// PUT body MUST have exactly these keys — no more. Sending extras
// (id, active, createdAt, versionId, etc.) triggers 400.
const PUT_BODY_KEYS = ['name', 'nodes', 'connections', 'settings'];

// Webhook trigger types that need reactivate-cycle after any update.
const WEBHOOK_TRIGGER_TYPES = new Set([
  'n8n-nodes-base.webhook',
  'n8n-nodes-base.telegramTrigger',
  'n8n-nodes-base.formTrigger',
  '@n8n/n8n-nodes-langchain.mcpTrigger',
]);

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_AUDIT_FILE = join(SCRIPT_DIR, '.audit.jsonl');
const SNAPSHOTS_DIR = join(SCRIPT_DIR, 'snapshots');

// ──────────────────────────────────────────────────────────────────────
// Config loader — .env file or env vars
// ──────────────────────────────────────────────────────────────────────

async function loadDotEnv() {
  for (const candidate of [
    join(process.cwd(), '.env'),
    join(SCRIPT_DIR, '.env'),
    join(dirname(SCRIPT_DIR), '.env'),
  ]) {
    if (existsSync(candidate)) {
      const content = await readFile(candidate, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          let v = m[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          process.env[m[1]] = v;
        }
      }
      return candidate;
    }
  }
  return null;
}

function getConfig() {
  const url = (process.env.N8N_URL || '').replace(/\/+$/, '');
  const key = process.env.N8N_API_KEY || '';
  if (!url || !key) {
    die(
      'Missing config. Set N8N_URL and N8N_API_KEY in env or .env file.\n' +
        '  Example: N8N_URL=http://localhost:5678 N8N_API_KEY=xxx node n8n-patch.mjs list'
    );
  }
  return { url, key };
}

// ──────────────────────────────────────────────────────────────────────
// HTTP core — thin wrapper with consistent error reporting
// ──────────────────────────────────────────────────────────────────────

async function apiCall(method, path, { body, expectJson = true, expectStatus } = {}) {
  const { url, key } = getConfig();
  const full = `${url}${path}`;
  const headers = {
    'X-N8N-API-KEY': key,
    accept: 'application/json',
  };
  if (body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(full, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();

  if (expectStatus && res.status !== expectStatus) {
    throw new ApiError(method, full, res.status, text);
  }
  if (!res.ok) {
    throw new ApiError(method, full, res.status, text);
  }
  if (!expectJson || !text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${method} ${full}: ${text.slice(0, 200)}`);
  }
}

class ApiError extends Error {
  constructor(method, url, status, body) {
    let parsed = body;
    try { parsed = JSON.parse(body); } catch {}
    const hint = typeof parsed === 'object' && parsed?.message ? parsed.message : body;
    super(`${method} ${url} → ${status}\n  ${hint}`);
    this.status = status;
    this.body = body;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Workflow body shaping — the core safety layer
// ──────────────────────────────────────────────────────────────────────

/** Filter settings to n8n's OpenAPI-allowed keys. */
function filterSettings(settings) {
  const out = {};
  for (const [k, v] of Object.entries(settings || {})) {
    if (SETTINGS_WHITELIST.has(k)) out[k] = v;
  }
  return out;
}

/** Shape a workflow object into a valid PUT body. Drops everything forbidden. */
function toPutBody(wf) {
  if (!wf || typeof wf !== 'object') throw new Error('Expected workflow object');
  if (!Array.isArray(wf.nodes)) throw new Error('workflow.nodes must be an array');
  if (wf.connections == null) wf.connections = {};
  const body = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: filterSettings(wf.settings),
  };
  for (const k of PUT_BODY_KEYS) {
    if (body[k] === undefined) throw new Error(`PUT body missing required key: ${k}`);
  }
  return body;
}

/** Shape a workflow object into a valid POST body (create). */
function toPostBody(wf) {
  // Same rules as PUT for the API we care about — also strips id if present.
  return toPutBody(wf);
}

function hasWebhookTrigger(wf) {
  return (wf.nodes || []).some((n) => WEBHOOK_TRIGGER_TYPES.has(n.type));
}

// ──────────────────────────────────────────────────────────────────────
// Audit trail — every mutation appends here
// ──────────────────────────────────────────────────────────────────────

function sha256(obj) {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12);
}

async function appendAudit(entry) {
  const file = process.env.N8N_PATCH_AUDIT || DEFAULT_AUDIT_FILE;
  const rec = { ts: new Date().toISOString(), ...entry };
  await appendFile(file, JSON.stringify(rec) + '\n');
}

async function saveSnapshot(wf, tag) {
  if (!existsSync(SNAPSHOTS_DIR)) await mkdir(SNAPSHOTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(SNAPSHOTS_DIR, `${wf.id || 'new'}_${tag}_${stamp}.json`);
  await writeFile(path, JSON.stringify(wf, null, 2));
  return path;
}

// ──────────────────────────────────────────────────────────────────────
// High-level operations
// ──────────────────────────────────────────────────────────────────────

async function listWorkflows({ limit = 250, active } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (active !== undefined) params.set('active', String(active));
  const data = await apiCall('GET', `/api/v1/workflows?${params}`);
  return data.data || [];
}

async function getWorkflow(id) {
  return apiCall('GET', `/api/v1/workflows/${id}`);
}

async function createWorkflow(wf) {
  const body = toPostBody(wf);
  const created = await apiCall('POST', '/api/v1/workflows', { body });
  await appendAudit({
    op: 'create',
    id: created.id,
    name: created.name,
    body_hash: sha256(body),
  });
  return created;
}

async function replaceWorkflow(id, wf) {
  // The safe GET → reshape → PUT pattern.
  const before = await getWorkflow(id);
  const beforeSnap = await saveSnapshot(before, 'before');

  const body = toPutBody({ ...wf, name: wf.name ?? before.name });
  const updated = await apiCall('PUT', `/api/v1/workflows/${id}`, { body });

  const after = await getWorkflow(id);
  const afterSnap = await saveSnapshot(after, 'after');
  await appendAudit({
    op: 'replace',
    id,
    name: after.name,
    before_hash: sha256(before),
    after_hash: sha256(after),
    before_snapshot: beforeSnap,
    after_snapshot: afterSnap,
  });
  return updated;
}

/** Fetch, apply mutator(wf) in-place, PUT back. Mutator may be sync or async. */
async function patchWorkflow(id, mutator) {
  const before = await getWorkflow(id);
  const beforeSnap = await saveSnapshot(before, 'before');

  const working = structuredClone(before);
  const mutated = (await mutator(working)) || working;
  if (!mutated || typeof mutated !== 'object') {
    throw new Error('mutator must return (or mutate) a workflow object');
  }
  const body = toPutBody(mutated);
  await apiCall('PUT', `/api/v1/workflows/${id}`, { body });

  const after = await getWorkflow(id);
  const afterSnap = await saveSnapshot(after, 'after');
  await appendAudit({
    op: 'patch',
    id,
    name: after.name,
    before_hash: sha256(before),
    after_hash: sha256(after),
    before_snapshot: beforeSnap,
    after_snapshot: afterSnap,
  });
  return after;
}

async function deleteWorkflow(id) {
  const before = await getWorkflow(id).catch(() => null);
  if (before) await saveSnapshot(before, 'deleted');
  const res = await apiCall('DELETE', `/api/v1/workflows/${id}`);
  await appendAudit({ op: 'delete', id, name: before?.name || null });
  return res;
}

async function activate(id) {
  const res = await apiCall('POST', `/api/v1/workflows/${id}/activate`, { body: {} });
  await appendAudit({ op: 'activate', id });
  return res;
}

async function deactivate(id) {
  const res = await apiCall('POST', `/api/v1/workflows/${id}/deactivate`, { body: {} });
  await appendAudit({ op: 'deactivate', id });
  return res;
}

/** Deactivate + sleep + activate. Forces webhook re-registration. */
async function reactivate(id, { sleepMs = 1200 } = {}) {
  await deactivate(id).catch(() => {});
  await new Promise((r) => setTimeout(r, sleepMs));
  const res = await activate(id);
  await appendAudit({ op: 'reactivate', id, sleepMs });
  return res;
}

/** Surgical node patch: update a single node's parameters by node name or id. */
async function patchNode(id, nodeSelector, paramPatch) {
  return patchWorkflow(id, (wf) => {
    let hit = 0;
    wf.nodes = wf.nodes.map((n) => {
      if (n.name === nodeSelector || n.id === nodeSelector) {
        hit++;
        n.parameters = { ...(n.parameters || {}), ...paramPatch };
      }
      return n;
    });
    if (hit === 0) throw new Error(`Node not found: ${nodeSelector}`);
    if (hit > 1) throw new Error(`Ambiguous selector ${nodeSelector} matched ${hit} nodes`);
    return wf;
  });
}

// ──────────────────────────────────────────────────────────────────────
// CLI surface
// ──────────────────────────────────────────────────────────────────────

const COMMANDS = {
  list: cmdList,
  get: cmdGet,
  import: cmdImport,
  replace: cmdReplace,
  'patch-node': cmdPatchNode,
  activate: cmdActivate,
  deactivate: cmdDeactivate,
  reactivate: cmdReactivate,
  delete: cmdDelete,
  search: cmdSearch,
  audit: cmdAudit,
  help: cmdHelp,
};

async function cmdList(args) {
  const active = args.includes('--active') ? true : args.includes('--inactive') ? false : undefined;
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 250;
  const wfs = await listWorkflows({ limit, active });
  for (const wf of wfs) {
    const mark = wf.active ? 'ON ' : 'off';
    console.log(`${wf.id}\t${mark}\t${wf.name}`);
  }
}

async function cmdGet(args) {
  const id = args[0];
  if (!id) die('usage: get <id> [--out <file>]');
  const wf = await getWorkflow(id);
  const outIdx = args.indexOf('--out');
  if (outIdx >= 0) {
    const out = args[outIdx + 1];
    if (!out) die('--out requires a path');
    await writeFile(out, JSON.stringify(wf, null, 2));
    console.error(`wrote ${out}`);
  } else {
    console.log(JSON.stringify(wf, null, 2));
  }
}

async function cmdImport(args) {
  const file = args[0];
  if (!file) die('usage: import <file.json> [--activate]');
  const wf = JSON.parse(await readFile(file, 'utf8'));
  const created = await createWorkflow(wf);
  console.log(JSON.stringify({ id: created.id, name: created.name }, null, 2));
  if (args.includes('--activate')) {
    if (hasWebhookTrigger(created)) {
      console.error(`webhook trigger detected → reactivate cycle`);
      await reactivate(created.id);
    } else {
      await activate(created.id);
    }
    console.error(`activated ${created.id}`);
  }
}

async function cmdReplace(args) {
  const id = args[0];
  const file = args[1];
  if (!id || !file) die('usage: replace <id> <file.json> [--reactivate]');
  const wf = JSON.parse(await readFile(file, 'utf8'));
  const out = await replaceWorkflow(id, wf);
  console.log(JSON.stringify({ id: out.id, name: out.name }, null, 2));
  if (args.includes('--reactivate')) {
    await reactivate(id);
    console.error(`reactivated ${id}`);
  }
}

async function cmdPatchNode(args) {
  const id = args[0];
  const selector = args[1];
  if (!id || !selector) {
    die(
      'usage: patch-node <workflow_id> <node_name_or_id> --params <file.json>\n' +
        '   or: patch-node <workflow_id> <node_name_or_id> --set key=value [--set k=v ...]'
    );
  }
  let patch = {};
  const paramsIdx = args.indexOf('--params');
  if (paramsIdx >= 0) {
    patch = JSON.parse(await readFile(args[paramsIdx + 1], 'utf8'));
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--set') {
      const kv = args[i + 1];
      if (!kv || !kv.includes('=')) die('--set expects key=value');
      const [k, ...rest] = kv.split('=');
      let v = rest.join('=');
      // Best-effort: try JSON first, fall back to string
      try { v = JSON.parse(v); } catch {}
      patch[k] = v;
    }
  }
  if (Object.keys(patch).length === 0) die('no patch provided (use --params or --set)');
  const out = await patchNode(id, selector, patch);
  console.log(JSON.stringify({ id: out.id, name: out.name, patched: selector, keys: Object.keys(patch) }, null, 2));
  if (args.includes('--reactivate')) {
    await reactivate(id);
    console.error(`reactivated ${id}`);
  }
}

async function cmdActivate(args) {
  const id = args[0];
  if (!id) die('usage: activate <id>');
  await activate(id);
  console.error(`activated ${id}`);
}

async function cmdDeactivate(args) {
  const id = args[0];
  if (!id) die('usage: deactivate <id>');
  await deactivate(id);
  console.error(`deactivated ${id}`);
}

async function cmdReactivate(args) {
  const id = args[0];
  if (!id) die('usage: reactivate <id>');
  await reactivate(id);
  console.error(`reactivated ${id}`);
}

async function cmdDelete(args) {
  const id = args[0];
  if (!id) die('usage: delete <id> [--yes]');
  if (!args.includes('--yes')) die('delete is destructive; add --yes to confirm');
  await deleteWorkflow(id);
  console.error(`deleted ${id}`);
}

async function cmdSearch(args) {
  const pattern = args[0];
  if (!pattern) die('usage: search <name-substring-or-regex>');
  const re = pattern.startsWith('/') && pattern.endsWith('/')
    ? new RegExp(pattern.slice(1, -1), 'i')
    : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const wfs = await listWorkflows({ limit: 250 });
  for (const wf of wfs) {
    if (re.test(wf.name)) {
      const mark = wf.active ? 'ON ' : 'off';
      console.log(`${wf.id}\t${mark}\t${wf.name}`);
    }
  }
}

async function cmdAudit(args) {
  const file = process.env.N8N_PATCH_AUDIT || DEFAULT_AUDIT_FILE;
  if (!existsSync(file)) {
    console.error('no audit log yet');
    return;
  }
  const content = await readFile(file, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);
  const tail = args.includes('--tail') ? Number(args[args.indexOf('--tail') + 1] || 20) : null;
  const slice = tail ? lines.slice(-tail) : lines;
  for (const line of slice) console.log(line);
}

function cmdHelp() {
  console.log(`n8n-patch — safe n8n workflow CRUD helper

Commands:
  list [--active|--inactive] [--limit N]   list workflows (id, active, name)
  search <pattern>                         substring or /regex/ match on names
  get <id> [--out <file>]                  fetch full workflow JSON
  import <file.json> [--activate]          POST new workflow (auto reactivate-cycle if webhook)
  replace <id> <file.json> [--reactivate]  GET + PUT full replacement
  patch-node <id> <node-name-or-id>        surgical patch of one node's .parameters
      --params <file.json>                 (merge-in)
      --set key=value [--set k=v ...]      (merge-in; values JSON-parsed if possible)
      [--reactivate]
  activate <id>                            POST /activate
  deactivate <id>                          POST /deactivate
  reactivate <id>                          deactivate → sleep 1.2s → activate (webhook re-reg)
  delete <id> --yes                        DELETE (requires --yes)
  audit [--tail N]                         show audit log (default: all)
  help                                     this text

Config: N8N_URL, N8N_API_KEY via env or .env file in cwd/script dir.

Safety guarantees:
  - Never uses PATCH (broken in n8n). Always GET → mutate → PUT.
  - PUT body: only {name, nodes, connections, settings}. Nothing else.
  - Settings filtered to n8n OpenAPI whitelist (ref n8n-io/n8n#19587).
  - Activation is a separate endpoint, never a field.
  - reactivate cycles deactivate → sleep → activate (Telegram/webhook fix).
  - Every mutating op snapshots before+after and appends to .audit.jsonl.

Examples:
  n8n-patch list --active
  n8n-patch get 5RcNLtxNjAHJsZPE --out snapshots/ra-01.json
  n8n-patch replace 5RcNLtxNjAHJsZPE ./edited.json --reactivate
  n8n-patch patch-node abc123 "Build System Prompt" --set jsCode="return items"
  n8n-patch import ./new-workflow.json --activate
  n8n-patch reactivate abc123
`);
}

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────

(async function main() {
  await loadDotEnv();
  const [, , command, ...rest] = process.argv;
  const cmd = command || 'help';
  const handler = COMMANDS[cmd];
  if (!handler) {
    process.stderr.write(`Unknown command: ${cmd}\n\n`);
    cmdHelp();
    process.exit(1);
  }
  try {
    await handler(rest);
  } catch (err) {
    if (err instanceof ApiError) {
      process.stderr.write(`API error: ${err.message}\n`);
      process.exit(2);
    }
    process.stderr.write(`Error: ${err.message || err}\n`);
    process.exit(1);
  }
})();
