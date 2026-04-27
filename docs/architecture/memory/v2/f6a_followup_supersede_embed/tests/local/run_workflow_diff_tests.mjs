#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

function arg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}
const prePath = arg('--pre');
const postPath = arg('--post');
if (!prePath || !postPath) {
  console.error('Usage: node tests/local/run_workflow_diff_tests.mjs --pre WF-ME-01_pre.json --post WF-ME-01_post.json');
  process.exit(2);
}

const pre = JSON.parse(fs.readFileSync(prePath, 'utf8'));
const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
const preNodes = pre.nodes || [];
const postNodes = post.nodes || [];

function byName(nodes) {
  return new Map(nodes.map(n => [n.name, n]));
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function getNode(wf, name) {
  const node = (wf.nodes || []).find(n => n.name === name);
  assert.ok(node, `Missing node: ${name}`);
  return node;
}
function edges(connections) {
  const out = [];
  for (const [from, groups] of Object.entries(connections || {})) {
    const main = groups.main || [];
    for (let outputIndex = 0; outputIndex < main.length; outputIndex++) {
      for (const edge of main[outputIndex] || []) {
        out.push({ from, to: edge.node, type: edge.type, index: edge.index, outputIndex });
      }
    }
  }
  return out;
}
function hasEdge(wf, from, to) {
  return edges(wf.connections).some(e => e.from === from && e.to === to);
}
function countDbSlots(qr) {
  return (qr.match(/\$json\.__db\./g) || []).length;
}
function countNullSlots(qr) {
  const m = qr.match(/\?\s*\[([^\]]*)\]/);
  if (!m) return 0;
  return (m[1].match(/\bnull\b/g) || []).length;
}

const preMap = byName(preNodes);
const postMap = byName(postNodes);
const expectedNew = ['ME_Memory_Supersede_Embed', 'ME_Memory_Supersede_Embed_Merge'];
const allowedChangedExisting = new Set(['ME_Memory_Supersede_DB']);

const checks = [];
function check(id, fn) {
  try { fn(); console.log(`PASS ${id}`); checks.push(id); }
  catch (e) { console.error(`FAIL ${id}: ${e.message}`); process.exit(1); }
}

check('WD-1 node count +2', () => assert.equal(postNodes.length, preNodes.length + 2));
check('WD-2 connection count +2 net', () => assert.equal(edges(post.connections).length, edges(pre.connections).length + 2));
check('WD-3 new nodes exist', () => expectedNew.forEach(n => assert.ok(postMap.has(n), n)));
check('WD-4 embed node credential shape', () => {
  const n = getNode(post, 'ME_Memory_Supersede_Embed');
  assert.equal(n.type, 'n8n-nodes-base.httpRequest');
  assert.equal(n.parameters?.nodeCredentialType, 'openAiApi');
  assert.equal(n.parameters?.authentication, 'predefinedCredentialType');
  assert.ok(n.credentials?.openAiApi?.id, 'OpenAI credential id missing');
});
check('WD-5 embed node model and input expression', () => {
  const body = String(getNode(post, 'ME_Memory_Supersede_Embed').parameters?.jsonBody || '');
  assert.match(body, /text-embedding-3-small/);
  assert.match(body, /input/);
  assert.match(body, /\$json\.__db\./);
});
check('WD-6 merge code references supersede prep + 1536 + embedding_text', () => {
  const code = String(getNode(post, 'ME_Memory_Supersede_Embed_Merge').parameters?.jsCode || '');
  assert.match(code, /ME_Memory_Supersede_Prep/);
  assert.match(code, /embedding_text/);
  assert.match(code, /1536/);
});
check('WD-7 Supersede_DB SQL includes embedding projection', () => {
  const q = String(getNode(post, 'ME_Memory_Supersede_DB').parameters?.query || '');
  assert.match(q, /embedding/);
  assert.match(q, /vector\(1536\)/);
});
check('WD-8 Supersede_DB SQL has CASE null guard', () => {
  const q = String(getNode(post, 'ME_Memory_Supersede_DB').parameters?.query || '');
  assert.match(q, /CASE\s+WHEN\s+\$\d+::text\s+IS\s+NULL\s+THEN\s+NULL\s+ELSE\s+\$\d+::vector\(1536\)\s+END/i);
});
check('WD-9 queryReplacement adds exactly one db slot', () => {
  const preQr = String(getNode(pre, 'ME_Memory_Supersede_DB').parameters?.options?.queryReplacement || '');
  const postQr = String(getNode(post, 'ME_Memory_Supersede_DB').parameters?.options?.queryReplacement || '');
  assert.equal(countDbSlots(postQr), countDbSlots(preQr) + 1);
  assert.match(postQr, /embedding_text/);
});
check('WD-10 error/null branch increments if present', () => {
  const preQr = String(getNode(pre, 'ME_Memory_Supersede_DB').parameters?.options?.queryReplacement || '');
  const postQr = String(getNode(post, 'ME_Memory_Supersede_DB').parameters?.options?.queryReplacement || '');
  const preNulls = countNullSlots(preQr);
  const postNulls = countNullSlots(postQr);
  if (preNulls > 0) assert.equal(postNulls, preNulls + 1);
});
check('WD-11 non-target existing nodes byte-identical', () => {
  for (const [name, preNode] of preMap.entries()) {
    if (allowedChangedExisting.has(name)) continue;
    assert.ok(postMap.has(name), `Existing node removed: ${name}`);
    assert.equal(hash(postMap.get(name)), hash(preNode), `Existing node drift: ${name}`);
  }
});
check('WD-12 only two new nodes added', () => {
  const added = [...postMap.keys()].filter(n => !preMap.has(n)).sort();
  assert.deepEqual(added, expectedNew.sort());
});
check('WD-13 supersede lane rewired', () => {
  assert.equal(hasEdge(pre, 'ME_Memory_Supersede_Prep', 'ME_Memory_Supersede_DB'), true, 'pre direct edge missing; inspect live topology');
  assert.equal(hasEdge(post, 'ME_Memory_Supersede_Prep', 'ME_Memory_Supersede_DB'), false, 'direct edge must be removed');
  assert.equal(hasEdge(post, 'ME_Memory_Supersede_Prep', 'ME_Memory_Supersede_Embed'), true);
  assert.equal(hasEdge(post, 'ME_Memory_Supersede_Embed', 'ME_Memory_Supersede_Embed_Merge'), true);
  assert.equal(hasEdge(post, 'ME_Memory_Supersede_Embed_Merge', 'ME_Memory_Supersede_DB'), true);
});
check('WD-14 settings object unchanged in candidate JSON', () => {
  assert.deepEqual(post.settings || {}, pre.settings || {});
});

console.log(`ALL PASS ${checks.length}/14`);
