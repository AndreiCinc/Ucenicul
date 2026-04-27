#!/usr/bin/env node
// Deterministic builder for F6A-FOLLOWUP-SUPERSEDE-EMBED.
// Input:  WF-ME-01_pre_f6a_followup.json (fresh baseline dump)
// Output: WF-ME-01_post_f6a_followup.json + diff_summary.md
//
// BUILD-INV-1..10 enforced (see DESIGN_FREEZE §8).
// No I/O except reading input, writing output, printing sha256.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const prePath  = path.join(here, 'WF-ME-01_pre_f6a_followup.json');
const postPath = path.join(here, 'WF-ME-01_post_f6a_followup.json');
const diffPath = path.join(here, 'diff_summary.md');

const pre = JSON.parse(fs.readFileSync(prePath, 'utf8'));

// --- Build the two new nodes ---

const embedNode = {
  name: 'ME_Memory_Supersede_Embed',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [2888, 1200],
  id: 'me-f6af-supersede-embed',
  credentials: {
    openAiApi: { id: 'svM62oyFwPbaIeX4', name: 'OpenAi account' }
  },
  parameters: {
    url: 'https://api.openai.com/v1/embeddings',
    method: 'POST',
    options: { timeout: 30000 },
    jsonBody: "={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}",
    sendBody: true,
    specifyBody: 'json',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'openAiApi'
  }
};

const mergeJsCode = `
const prep = $('ME_Memory_Supersede_Prep').first().json;
if (prep && prep._error === true) {
  return [{ json: prep }];
}

const httpResp = $json;

let embeddingText      = prep.__db.embedding_text || null;
let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;
let embeddingAttempted = false;
let embeddingError     = null;

if (!embeddingText) {
  embeddingAttempted = true;
  const vec = httpResp
    && httpResp.data
    && Array.isArray(httpResp.data)
    && httpResp.data[0]
    && Array.isArray(httpResp.data[0].embedding)
    ? httpResp.data[0].embedding
    : null;

  if (vec && vec.length === 1536) {
    embeddingText = JSON.stringify(vec);
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
  __db: { ...prep.__db, embedding_text: embeddingText },
  passthrough: {
    ...prep.passthrough,
    used_embedding:      usedEmbedding,
    embedding_attempted: embeddingAttempted,
    embedding_error:     embeddingError
  }
}}];`;

const mergeNode = {
  name: 'ME_Memory_Supersede_Embed_Merge',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [3008, 1200],
  id: 'me-f6af-supersede-embed-merge',
  parameters: { jsCode: mergeJsCode }
};

// --- Build the new Supersede_DB SQL + queryReplacement ---

const newSQL = `WITH old_row AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
guard AS (
  SELECT 1 FROM old_row WHERE status = 'active'
),
marked AS (
  UPDATE public.memory_items
  SET status = 'superseded'
  WHERE id = $1::uuid AND EXISTS (SELECT 1 FROM guard)
  RETURNING id AS old_id
),
inserted AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key,
    supersedes_memory_id, tier, status, embedding
  )
  SELECT
    $2::uuid, $3::memory_type_enum, $4::text, $5::text,
    $6::numeric, $7::numeric, $8::rag_durability_enum,
    $9::uuid, $10::uuid, $11::uuid,
    $12::jsonb, $13::jsonb, $14::text,
    $1::uuid, $15::memory_tier_enum, 'active',
    CASE WHEN $16::text IS NULL THEN NULL ELSE $16::vector(1536) END
  FROM marked
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, TRUE AS new_insert
)
SELECT * FROM inserted
UNION ALL
SELECT mi.*, FALSE AS new_insert
  FROM public.memory_items mi
 WHERE mi.idempotency_key = $14::text AND NOT EXISTS (SELECT 1 FROM inserted)
LIMIT 1;`;

const newQueryReplacement = "={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.old_id, $json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key, $json.__db.tier, $json.__db.embedding_text] }}";

// --- Compose post snapshot ---

const post = JSON.parse(JSON.stringify(pre));   // deep clone

// Sanity-check existing nodes
const superseDB = post.nodes.find(n => n.name === 'ME_Memory_Supersede_DB');
if (!superseDB) throw new Error('BUILD-INV-3 violated: ME_Memory_Supersede_DB not found in pre snapshot');
const supersePrep = post.nodes.find(n => n.name === 'ME_Memory_Supersede_Prep');
if (!supersePrep) throw new Error('BUILD-INV-3 violated: ME_Memory_Supersede_Prep not found in pre snapshot');

// Patch Supersede_DB — only .parameters.query and .parameters.options.queryReplacement
superseDB.parameters.query = newSQL;
superseDB.parameters.options = { ...(superseDB.parameters.options || {}), queryReplacement: newQueryReplacement };

// Append two new nodes to the end of the nodes array
post.nodes.push(embedNode, mergeNode);

// Rewire supersede lane connections
// Remove Supersede_Prep -> Supersede_DB; add 3 new edges.
post.connections = JSON.parse(JSON.stringify(pre.connections));
const prepConn = post.connections['ME_Memory_Supersede_Prep'];
if (!prepConn || !prepConn.main || !prepConn.main[0]) {
  throw new Error('BUILD-INV-5 violated: unexpected shape of Supersede_Prep connections');
}
const oldEdges = prepConn.main[0];
const remaining = oldEdges.filter(e => !(e.node === 'ME_Memory_Supersede_DB' && e.type === 'main'));
if (remaining.length !== oldEdges.length - 1) {
  throw new Error('BUILD-INV-5 violated: expected to remove exactly one edge Prep -> DB');
}
prepConn.main[0] = [ ...remaining, { node: 'ME_Memory_Supersede_Embed', type: 'main', index: 0 } ];

post.connections['ME_Memory_Supersede_Embed'] = {
  main: [[{ node: 'ME_Memory_Supersede_Embed_Merge', type: 'main', index: 0 }]]
};
post.connections['ME_Memory_Supersede_Embed_Merge'] = {
  main: [[{ node: 'ME_Memory_Supersede_DB', type: 'main', index: 0 }]]
};

// --- BUILD-INV checks ---

function edges(connections) {
  const out = [];
  for (const [from, groups] of Object.entries(connections || {})) {
    const main = groups.main || [];
    for (let outIdx = 0; outIdx < main.length; outIdx++) {
      for (const e of main[outIdx] || []) {
        out.push({ from, to: e.node, outIdx, index: e.index, type: e.type });
      }
    }
  }
  return out;
}

const preEdges = edges(pre.connections);
const postEdges = edges(post.connections);
const addedNodes = post.nodes.filter(n => !pre.nodes.some(p => p.name === n.name)).map(n => n.name).sort();
const expectedAdded = ['ME_Memory_Supersede_Embed', 'ME_Memory_Supersede_Embed_Merge'];
if (JSON.stringify(addedNodes) !== JSON.stringify(expectedAdded)) {
  throw new Error('BUILD-INV-2 violated: added node set mismatch: ' + JSON.stringify(addedNodes));
}
if (post.nodes.length !== pre.nodes.length + 2) {
  throw new Error('BUILD-INV-2 violated: node count not pre+2');
}
if (postEdges.length !== preEdges.length + 2) {
  throw new Error('BUILD-INV-5 violated: edge count not pre+2 (got ' + postEdges.length + ' vs pre ' + preEdges.length + ')');
}

// Non-target node byte-identity (BUILD-INV-4)
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])]));
  return v;
}
function hash(v) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
}
for (const pN of pre.nodes) {
  const postN = post.nodes.find(n => n.name === pN.name);
  if (!postN) throw new Error('BUILD-INV-4 violated: node removed: ' + pN.name);
  if (pN.name === 'ME_Memory_Supersede_DB') continue;  // allowed to differ
  if (hash(pN) !== hash(postN)) throw new Error('BUILD-INV-4 violated: node drift on: ' + pN.name);
}

// BUILD-INV-6: Embed input
if (!/input:\s*\$json\.__db\./.test(embedNode.parameters.jsonBody)) {
  throw new Error('BUILD-INV-6 violated: Embed jsonBody input expression missing');
}

// BUILD-INV-7: Merge references Supersede_Prep
if (!/ME_Memory_Supersede_Prep/.test(mergeNode.parameters.jsCode)) {
  throw new Error('BUILD-INV-7 violated: Merge jsCode does not reference Supersede_Prep');
}
if (/ME_Memory_Store_Prep/.test(mergeNode.parameters.jsCode)) {
  throw new Error('BUILD-INV-7 violated: Merge jsCode erroneously references Store_Prep');
}

// BUILD-INV-8: Supersede_DB SQL has 16 distinct $N binds
const binds = new Set((superseDB.parameters.query.match(/\$\d+/g) || []).map(s => s));
if (binds.size !== 16) {
  throw new Error('BUILD-INV-8 violated: expected 16 distinct bind slots, got ' + binds.size + ' : ' + [...binds].sort().join(','));
}
if (!/CASE\s+WHEN\s+\$16::text\s+IS\s+NULL\s+THEN\s+NULL\s+ELSE\s+\$16::vector\(1536\)\s+END/i.test(superseDB.parameters.query)) {
  throw new Error('BUILD-INV-8 violated: $16 CASE guard missing/malformed');
}

// BUILD-INV-9: queryReplacement branches
const qr = superseDB.parameters.options.queryReplacement;
const successArray = qr.match(/:\s*\[([^\]]*embedding_text[^\]]*)\]/);
if (!successArray) throw new Error('BUILD-INV-9 violated: success branch missing embedding_text');
const successRefs = (successArray[1].match(/\$json\.__db\./g) || []).length;
if (successRefs !== 16) throw new Error('BUILD-INV-9 violated: success refs != 16: ' + successRefs);
const errorArray = qr.match(/\?\s*\[([^\]]*)\]/);
if (!errorArray) throw new Error('BUILD-INV-9 violated: error branch missing');
const nullCount = (errorArray[1].match(/\bnull\b/g) || []).length;
if (nullCount !== 16) throw new Error('BUILD-INV-9 violated: error branch nulls != 16: ' + nullCount);

// --- Write post snapshot + diff summary ---

fs.writeFileSync(postPath, JSON.stringify(post, null, 2));
const postHash = crypto.createHash('sha256').update(fs.readFileSync(postPath)).digest('hex');
const preHash = crypto.createHash('sha256').update(fs.readFileSync(prePath)).digest('hex');
const mergeHash = crypto.createHash('sha256').update(mergeJsCode).digest('hex');

const diff = `# F6A-FOLLOWUP-SUPERSEDE-EMBED — Diff Summary

Builder: \`build_patch_f6a_followup_supersede_embed.mjs\`
Ran: ${new Date().toISOString()}

## Snapshots

- pre  \`${path.basename(prePath)}\` sha256 = \`${preHash}\`
- post \`${path.basename(postPath)}\` sha256 = \`${postHash}\`

## Merge jsCode sha256

\`${mergeHash}\`

## Diff surface

- nodes.length: ${pre.nodes.length} -> ${post.nodes.length} (+${post.nodes.length - pre.nodes.length})
- edges count:  ${preEdges.length} -> ${postEdges.length} (+${postEdges.length - preEdges.length})
- added nodes:  ${JSON.stringify(addedNodes)}
- modified nodes: ["ME_Memory_Supersede_DB"] (parameters.query + parameters.options.queryReplacement only)
- removed nodes: []
- bind slots in Supersede_DB SQL: 15 -> 16
- queryReplacement success branch: 15 -> 16 __db references (added \`embedding_text\`)
- queryReplacement error branch: 15 -> 16 nulls

## Connection edits

- removed: ME_Memory_Supersede_Prep -> ME_Memory_Supersede_DB
- added:   ME_Memory_Supersede_Prep -> ME_Memory_Supersede_Embed
- added:   ME_Memory_Supersede_Embed -> ME_Memory_Supersede_Embed_Merge
- added:   ME_Memory_Supersede_Embed_Merge -> ME_Memory_Supersede_DB

## BUILD-INV

- BUILD-INV-1 deterministic: yes (builder reads pre, applies pure transform)
- BUILD-INV-2 exactly 2 new nodes: PASS
- BUILD-INV-3 single modified node (Supersede_DB, only parameters.query+options.queryReplacement): PASS
- BUILD-INV-4 non-target nodes byte-identical: PASS
- BUILD-INV-5 edge count +2: PASS
- BUILD-INV-6 Embed input expression present: PASS
- BUILD-INV-7 Merge references Supersede_Prep, not Store_Prep: PASS
- BUILD-INV-8 SQL has 16 distinct binds + \`$16\` CASE guard: PASS
- BUILD-INV-9 queryReplacement: success=16 __db refs incl embedding_text, error=16 nulls: PASS
- BUILD-INV-10 output sha256 printed above: PASS
`;

fs.writeFileSync(diffPath, diff);

console.log('post sha256  =', postHash);
console.log('merge sha256 =', mergeHash);
console.log('wrote', postPath);
console.log('wrote', diffPath);
console.log('BUILD-INV-1..10: ALL PASS');
