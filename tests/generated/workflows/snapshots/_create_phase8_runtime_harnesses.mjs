#!/usr/bin/env node
// Phase-8 runtime harness builder.
// Creates 4 one-off chat-triggered harness workflows, each hardcoded to call
// one of the edge-1..4 targets (EC, OR, PL, DI). The chat payload must be a
// JSON string which the harness parses and forwards as $json of the child
// executeWorkflow call.
//
// Output: writes the 4 harness IDs to phase8_runtime_harnesses.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = '/sessions/amazing-festive-maxwell/mnt/Ucenicul/.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env';
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const N8N_URL = env.N8N_URL.replace(/\/$/,'');
const N8N_API_KEY = env.N8N_API_KEY;

const TARGETS = {
  edge1: { name: 'phase8_runtime_harness_edge1_TR_to_EC', targetId: 'v9jih4jqeXpOJOiH', targetName: 'WF-EC-01 Execution Context', webhook: 'a1b2c3d4-phz8-edg1-harn-runtimeh00001' },
  edge2: { name: 'phase8_runtime_harness_edge2_EC_to_OR', targetId: 'KhGmNpi0ZDmrnz8W', targetName: 'WF-OR-01 Orchestrator',      webhook: 'a1b2c3d4-phz8-edg2-harn-runtimeh00002' },
  edge3: { name: 'phase8_runtime_harness_edge3_OR_to_PL', targetId: 'RwToPLa1ErHl2tUi', targetName: 'WF-PL-01 Planner',           webhook: 'a1b2c3d4-phz8-edg3-harn-runtimeh00003' },
  edge4: { name: 'phase8_runtime_harness_edge4_PL_to_DI', targetId: 'abqYINcXr3JAhGGk', targetName: 'WF-DI-01 Dispatcher',        webhook: 'a1b2c3d4-phz8-edg4-harn-runtimeh00004' },
};

function buildHarness(cfg) {
  return {
    name: cfg.name,
    nodes: [
      {
        id: 'chat-trigger',
        name: 'Chat_Trigger',
        type: '@n8n/n8n-nodes-langchain.chatTrigger',
        typeVersion: 1.1,
        position: [-60, 200],
        webhookId: cfg.webhook,
        parameters: { options: {} }
      },
      {
        id: 'parse-envelope',
        name: 'Parse_Envelope',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [200, 200],
        parameters: {
          language: 'javaScript',
          jsCode: "const raw = ($json.chatInput || '').trim();\nlet env;\ntry { env = JSON.parse(raw); } catch (e) { return [{ json: { __parse_error: true, message: 'invalid JSON: ' + e.message, raw } }]; }\nreturn [{ json: env }];"
        }
      },
      {
        id: 'invoke-target',
        name: 'Invoke_Target',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.2,
        position: [460, 200],
        parameters: {
          workflowId: { __rl: true, value: cfg.targetId, mode: 'list', cachedResultName: cfg.targetName },
          mode: 'once',
          options: { waitForSubWorkflow: true }
        }
      }
    ],
    connections: {
      Chat_Trigger:    { main: [[{ node: 'Parse_Envelope', type: 'main', index: 0 }]] },
      Parse_Envelope:  { main: [[{ node: 'Invoke_Target',  type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' }
  };
}

async function apiPost(path, body) {
  const url = `${N8N_URL}${path}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`POST ${path} ${resp.status}: ${text}`);
  return JSON.parse(text);
}

async function apiPatchActivate(id) {
  const url = `${N8N_URL}/api/v1/workflows/${id}/activate`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`activate ${id} ${resp.status}: ${text}`);
  return JSON.parse(text);
}

const out = {};
for (const [key, cfg] of Object.entries(TARGETS)) {
  const body = buildHarness(cfg);
  const created = await apiPost('/api/v1/workflows', body);
  out[key] = { id: created.id, name: created.name, targetId: cfg.targetId, webhook: cfg.webhook };
  console.log(`created ${key} → ${created.id} (${created.name})`);
  try {
    await apiPatchActivate(created.id);
    out[key].active = true;
    console.log(`  activated ${created.id}`);
  } catch (e) {
    out[key].active = false;
    out[key].activate_error = String(e).slice(0, 200);
    console.log(`  activate FAIL ${created.id}: ${e}`);
  }
}

const outPath = join(__dirname, '..', '..', 'edges', 'phase8_runtime_harnesses.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('wrote', outPath);
