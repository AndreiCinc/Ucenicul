#!/usr/bin/env node
// build_patch_f2.mjs — deterministic F2 patch builder.
// Reads WF-ME-01_pre_f2.json, inserts two new nodes (ME_Memory_Search_Embed, ME_Memory_Search_Embed_Merge),
// rewires Prep → DB into Prep → Embed → Merge → DB, and writes WF-ME-01_post_f2.json.
//
// Usage: node build_patch_f2.mjs <in.json> <out.json>
//        (defaults to WF-ME-01_pre_f2.json / WF-ME-01_post_f2.json in the same dir)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IN  = process.argv[2] || path.join(__dirname, 'WF-ME-01_pre_f2.json');
const OUT = process.argv[3] || path.join(__dirname, 'WF-ME-01_post_f2.json');

const wf = JSON.parse(fs.readFileSync(IN, 'utf8'));

// --- Invariants: abort if pre-state doesn't look like post-Patch-A WF-ME-01 ---
if (wf.name !== 'WF-ME-01 Module Execution') throw new Error('unexpected workflow name: ' + wf.name);
if (!Array.isArray(wf.nodes) || wf.nodes.length !== 43) throw new Error('expected 43 nodes pre-F2, got ' + (wf.nodes && wf.nodes.length));

const prep   = wf.nodes.find(n => n.name === 'ME_Memory_Search_Prep');
const db     = wf.nodes.find(n => n.name === 'ME_Memory_Search_DB');
const result = wf.nodes.find(n => n.name === 'ME_Memory_Search_Result');
if (!prep || !db || !result) throw new Error('search leg nodes missing');

// Patch A invariant: Search_Result jsCode must include the filter
if (!/typeof r\.id === 'string'/.test(result.parameters.jsCode)) {
  throw new Error('Patch A not present — aborting F2 build');
}

// Abort if F2 nodes already exist (idempotency guard)
if (wf.nodes.some(n => n.name === 'ME_Memory_Search_Embed' || n.name === 'ME_Memory_Search_Embed_Merge')) {
  throw new Error('F2 nodes already present — aborting');
}

// --- Two new node definitions ---

const embedNode = {
  parameters: {
    method: 'POST',
    url: 'https://api.openai.com/v1/embeddings',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'openAiApi',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: "={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.query_text }) }}",
    options: { timeout: 30000 }
  },
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [2888, 1260],
  id: 'me-f2-search-embed',
  name: 'ME_Memory_Search_Embed',
  credentials: {
    openAiApi: { id: 'svM62oyFwPbaIeX4', name: 'OpenAi account' }
  },
  onError: 'continueRegularOutput'
};

const mergeJsCode = `
const prep = $('ME_Memory_Search_Prep').first().json;
if (prep && prep._error === true) {
  return [{ json: prep }];
}

const httpResp = $json;

let embeddingJson      = prep.__db.embedding_json;
let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;
let embeddingAttempted = false;
let embeddingError     = null;

if (!embeddingJson) {
  embeddingAttempted = true;
  const vec = httpResp
    && httpResp.data
    && Array.isArray(httpResp.data)
    && httpResp.data[0]
    && Array.isArray(httpResp.data[0].embedding)
    ? httpResp.data[0].embedding
    : null;

  if (vec && vec.length === 1536) {
    embeddingJson = JSON.stringify(vec);
    usedEmbedding = true;
  } else if (httpResp && httpResp.error) {
    embeddingError = 'embedding_http_error: '
      + (httpResp.error.message || httpResp.error.code || JSON.stringify(httpResp.error));
  } else if (httpResp && typeof httpResp.statusCode === 'number' && httpResp.statusCode >= 400) {
    embeddingError = 'embedding_http_' + httpResp.statusCode;
  } else {
    embeddingError = 'embedding_response_unusable';
  }
}

return [{ json: {
  __db: { ...prep.__db, embedding_json: embeddingJson },
  passthrough: {
    ...prep.passthrough,
    used_embedding:      usedEmbedding,
    embedding_attempted: embeddingAttempted,
    embedding_error:     embeddingError
  }
}}];
`;

const mergeNode = {
  parameters: { jsCode: mergeJsCode },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [3008, 1260],
  id: 'me-f2-search-embed-merge',
  name: 'ME_Memory_Search_Embed_Merge'
};

// --- Mutate nodes array ---
wf.nodes.push(embedNode, mergeNode);

// --- Connections: rewire Prep → DB into Prep → Embed → Merge → DB ---
const conns = wf.connections;

// Drop the old Prep → DB edge
const prepOut = conns['ME_Memory_Search_Prep'];
if (!prepOut || !Array.isArray(prepOut.main) || !Array.isArray(prepOut.main[0])) {
  throw new Error('ME_Memory_Search_Prep connections missing');
}
const oldEdges = prepOut.main[0];
const dbEdgeIdx = oldEdges.findIndex(e => e.node === 'ME_Memory_Search_DB');
if (dbEdgeIdx < 0) throw new Error('Prep → DB edge not found');
oldEdges.splice(dbEdgeIdx, 1);

// Add Prep → Embed
oldEdges.push({ node: 'ME_Memory_Search_Embed', type: 'main', index: 0 });

// Add Embed → Merge
conns['ME_Memory_Search_Embed'] = {
  main: [[{ node: 'ME_Memory_Search_Embed_Merge', type: 'main', index: 0 }]]
};

// Add Merge → DB
conns['ME_Memory_Search_Embed_Merge'] = {
  main: [[{ node: 'ME_Memory_Search_DB', type: 'main', index: 0 }]]
};

// --- Post-build sanity checks ---
if (wf.nodes.length !== 45) throw new Error('post-build expected 45 nodes, got ' + wf.nodes.length);
const edges = wf.connections['ME_Memory_Search_Prep'].main[0].map(e => e.node);
if (edges.includes('ME_Memory_Search_DB')) throw new Error('Prep still connects to DB');
if (!edges.includes('ME_Memory_Search_Embed')) throw new Error('Prep → Embed edge missing');
if (!wf.connections['ME_Memory_Search_Embed_Merge'].main[0].some(e => e.node === 'ME_Memory_Search_DB'))
  throw new Error('Merge → DB edge missing');

fs.writeFileSync(OUT, JSON.stringify(wf, null, 2));
console.log(JSON.stringify({
  ok: true,
  nodeCount: wf.nodes.length,
  versionId_in: wf.versionId,
  added_nodes: ['ME_Memory_Search_Embed', 'ME_Memory_Search_Embed_Merge'],
  rewired_edges: ['Prep→Embed', 'Embed→Merge', 'Merge→DB', 'removed Prep→DB'],
  out: OUT
}, null, 2));
