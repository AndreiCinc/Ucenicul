// n8n_client.mjs — minimal n8n REST + chat-webhook client for the E2E rich harness.
// Zero deps; native fetch on Node 18+.
//
// Loads N8N_URL + N8N_API_KEY from
// .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env
// (resolved relative to the repo root passed in or process.cwd()).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnv(repoRoot) {
  const root = repoRoot || process.cwd();
  const envPath = resolve(root, '.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.env');
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

export function makeClient({ env, repoRoot }) {
  const E = env || loadEnv(repoRoot);
  const N8N_URL = E.N8N_URL.replace(/\/$/, '');
  const API = { 'X-N8N-API-KEY': E.N8N_API_KEY, 'accept': 'application/json' };

  async function postChat(webhookId, chatInputJsonString, sessionId) {
    const url = `${N8N_URL}/webhook/${webhookId}/chat`;
    const body = { action: 'sendMessage', chatInput: chatInputJsonString, sessionId };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: r.ok, status: r.status, body: json };
  }

  async function listExecs(workflowId, limit = 10) {
    const url = `${N8N_URL}/api/v1/executions?workflowId=${encodeURIComponent(workflowId)}&limit=${limit}`;
    const r = await fetch(url, { headers: API });
    if (!r.ok) throw new Error(`list execs ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return j.data || [];
  }

  async function findExecAfter(workflowId, afterMs, attempts = 6, delayMs = 800) {
    for (let i = 0; i < attempts; i++) {
      const list = await listExecs(workflowId, 5);
      for (const row of list) {
        const t = new Date(row.startedAt || 0).getTime();
        if (t >= afterMs - 2000) return row;
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    const list = await listExecs(workflowId, 5);
    return list[0] || null;
  }

  async function getExec(executionId) {
    const url = `${N8N_URL}/api/v1/executions/${executionId}?includeData=true`;
    const r = await fetch(url, { headers: API });
    if (!r.ok) throw new Error(`get exec ${executionId} ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async function waitExecFinal(executionId, maxMs = 30000, pollMs = 1500) {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      const e = await getExec(executionId);
      if (e.finished || e.stoppedAt || (e.status && e.status !== 'running' && e.status !== 'new' && e.status !== 'waiting')) return e;
      await new Promise(r => setTimeout(r, pollMs));
    }
    return await getExec(executionId);
  }

  return { N8N_URL, postChat, listExecs, findExecAfter, getExec, waitExecFinal };
}

// Canonical workflow IDs (per Phase 12.3 walker).
export const WFS = {
  TR: 'wI8hpSROxQI0zC9f',
  EC: 'v9jih4jqeXpOJOiH',
  OR: 'KhGmNpi0ZDmrnz8W',
  PL: 'RwToPLa1ErHl2tUi',
  DI: 'abqYINcXr3JAhGGk',
  ME: 'uq26nh1grIpnHju0',
  RA: '5RcNLtxNjAHJsZPE',
  SU: 'ENiYNfL3ul8AmmCB',
  RC: 'TClXgmO8H8zsSwMb',
  MO: 'OooZdC0DgsDR6gm0',
};

export const TR_CHAT_WEBHOOK_ID = 'a1b2c3d4-trtr-phz9-4chat-smoketh00001';
