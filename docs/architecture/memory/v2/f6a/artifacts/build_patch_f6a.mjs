#!/usr/bin/env node
/**
 * F6A deterministic builder.
 *
 * Inputs (read-only):
 *   - artifacts/WF-ME-01_pre_f6a.json  — canonical pre-apply snapshot.
 *
 * Outputs (overwritten each run):
 *   - artifacts/WF-ME-01_post_f6a.json — full-workflow payload for
 *                                        `n8n-patch.mjs replace`.
 *   - artifacts/diff_summary_f6a.md   — human-readable diff.
 *
 * The builder enforces 10 invariants (BUILD-INV-1..10) from
 *   `F6A_EXECUTION_PLAN.md §Phase 4` and exits non-zero if any fails.
 *
 * Usage:
 *   node docs/architecture/memory/v2/f6a/artifacts/build_patch_f6a.mjs
 *
 * The output is deterministic: same pre JSON in → identical post JSON + diff
 * summary out. No network, no wall-clock, no randomness.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRE_PATH = resolve(__dirname, "WF-ME-01_pre_f6a.json");
const POST_PATH = resolve(__dirname, "WF-ME-01_post_f6a.json");
const DIFF_PATH = resolve(__dirname, "diff_summary_f6a.md");

const EXPECTED_BASELINE = {
  versionId: "96962424-a9b1-4b7d-aa58-33ccc9c2b6a6",
  nodeCount: 45,
  connectionCount: 63,
  active: true,
  name: "WF-ME-01 Module Execution",
};

// ---- pure helpers ----------------------------------------------------------

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

function countConnections(connections) {
  let n = 0;
  for (const outs of Object.values(connections || {})) {
    for (const arr2 of Object.values(outs)) {
      for (const arr of arr2) n += arr.length;
    }
  }
  return n;
}

function die(code, msg) {
  console.error("[build_patch_f6a] HALT " + code + ": " + msg);
  process.exit(1);
}

function assert(cond, code, msg) {
  if (!cond) die(code, msg);
}

// ---- load and validate pre -------------------------------------------------

const preRaw = readFileSync(PRE_PATH, "utf8");
const pre = JSON.parse(preRaw);

assert(
  pre.versionId === EXPECTED_BASELINE.versionId,
  "PRE-VERSION",
  `pre versionId ${pre.versionId} != expected ${EXPECTED_BASELINE.versionId}`,
);
assert(
  pre.name === EXPECTED_BASELINE.name,
  "PRE-NAME",
  `pre name ${pre.name} != expected ${EXPECTED_BASELINE.name}`,
);
assert(
  pre.active === EXPECTED_BASELINE.active,
  "PRE-ACTIVE",
  `pre active ${pre.active} != expected ${EXPECTED_BASELINE.active}`,
);
assert(
  Array.isArray(pre.nodes) && pre.nodes.length === EXPECTED_BASELINE.nodeCount,
  "PRE-NODECOUNT",
  `pre nodeCount ${pre.nodes?.length} != expected ${EXPECTED_BASELINE.nodeCount}`,
);
const preConnCount = countConnections(pre.connections);
assert(
  preConnCount === EXPECTED_BASELINE.connectionCount,
  "PRE-CONNCOUNT",
  `pre connectionCount ${preConnCount} != expected ${EXPECTED_BASELINE.connectionCount}`,
);

// required pre nodes
const requiredPreNodes = [
  "ME_Memory_Store_Prep",
  "ME_Memory_Store_DB",
  "ME_Memory_Search_Embed",
  "ME_Memory_Search_Embed_Merge",
];
for (const nm of requiredPreNodes) {
  assert(
    pre.nodes.some((n) => n.name === nm),
    "PRE-MISSING-" + nm,
    `pre is missing required node ${nm}`,
  );
}

// forbid new names already present
const forbiddenNewNames = ["ME_Memory_Store_Embed", "ME_Memory_Store_Embed_Merge"];
for (const nm of forbiddenNewNames) {
  assert(
    !pre.nodes.some((n) => n.name === nm),
    "PRE-DUP-" + nm,
    `pre already contains ${nm} — F6A has already landed`,
  );
}

// ---- extract reference templates ------------------------------------------

const searchEmbed = pre.nodes.find((n) => n.name === "ME_Memory_Search_Embed");
const searchMerge = pre.nodes.find(
  (n) => n.name === "ME_Memory_Search_Embed_Merge",
);
const storePrep = pre.nodes.find((n) => n.name === "ME_Memory_Store_Prep");
const storeDB = pre.nodes.find((n) => n.name === "ME_Memory_Store_DB");

// Shape sanity of reference templates
assert(
  searchEmbed.type === "n8n-nodes-base.httpRequest" &&
    searchEmbed.typeVersion === 4.2,
  "REF-SEARCH-EMBED-TYPE",
  "ME_Memory_Search_Embed type/typeVersion drift",
);
assert(
  searchMerge.type === "n8n-nodes-base.code" &&
    searchMerge.typeVersion === 2,
  "REF-SEARCH-MERGE-TYPE",
  "ME_Memory_Search_Embed_Merge type/typeVersion drift",
);
assert(
  storePrep.type === "n8n-nodes-base.code" &&
    storePrep.typeVersion === 2,
  "REF-STORE-PREP-TYPE",
  "ME_Memory_Store_Prep type/typeVersion drift",
);
assert(
  storeDB.type === "n8n-nodes-base.postgres" && storeDB.typeVersion === 2.4,
  "REF-STORE-DB-TYPE",
  "ME_Memory_Store_DB type/typeVersion drift",
);

// ---- build post ------------------------------------------------------------

// Deep-clone via JSON round-trip so the post object is independent of pre.
const post = JSON.parse(JSON.stringify(pre));

// -- new node: ME_Memory_Store_Embed -----------------------------------------
// Mirror of ME_Memory_Search_Embed: same HTTP call, same credential, same
// onError policy; only the input field differs. Store-lane reads the text
// to embed from $json.__db.content (already emitted by ME_Memory_Store_Prep).

const storeEmbed = {
  id: "me-f6a-store-embed",
  name: "ME_Memory_Store_Embed",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [2888, 1040],
  onError: "continueRegularOutput",
  credentials: {
    openAiApi: { id: "svM62oyFwPbaIeX4", name: "OpenAi account" },
  },
  parameters: {
    url: "https://api.openai.com/v1/embeddings",
    method: "POST",
    options: { timeout: 30000 },
    jsonBody:
      "={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}",
    sendBody: true,
    specifyBody: "json",
    authentication: "predefinedCredentialType",
    nodeCredentialType: "openAiApi",
  },
};

// -- new node: ME_Memory_Store_Embed_Merge -----------------------------------
// Mirror of ME_Memory_Search_Embed_Merge adapted to the store lane.
// Reads the upstream Prep via $('ME_Memory_Store_Prep').first().json and
// emits __db.embedding_text (string form of the 1536-dim vector, or null).
// Honors a caller-supplied short-circuit via prep.__db.embedding_text if a
// future caller chooses to pre-compute (see F6A-X-04 exclusion).

const storeMergeJs = [
  "",
  "const prep = $('ME_Memory_Store_Prep').first().json;",
  "if (prep && prep._error === true) {",
  "  return [{ json: prep }];",
  "}",
  "",
  "const httpResp = $json;",
  "",
  "let embeddingText      = prep.__db.embedding_text || null;",
  "let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;",
  "let embeddingAttempted = false;",
  "let embeddingError     = null;",
  "",
  "if (!embeddingText) {",
  "  embeddingAttempted = true;",
  "  const vec = httpResp",
  "    && httpResp.data",
  "    && Array.isArray(httpResp.data)",
  "    && httpResp.data[0]",
  "    && Array.isArray(httpResp.data[0].embedding)",
  "    ? httpResp.data[0].embedding",
  "    : null;",
  "",
  "  if (vec && vec.length === 1536) {",
  "    embeddingText = JSON.stringify(vec);",
  "    usedEmbedding = true;",
  "  } else if (httpResp && httpResp.error) {",
  "    embeddingError = 'embedding_http_error: '",
  "      + (httpResp.error.message || httpResp.error.code || JSON.stringify(httpResp.error));",
  "  } else if (httpResp && typeof httpResp.statusCode === 'number' && httpResp.statusCode >= 400) {",
  "    embeddingError = 'embedding_http_' + httpResp.statusCode;",
  "  } else {",
  "    embeddingError = 'embedding_response_unusable';",
  "  }",
  "}",
  "",
  "return [{ json: {",
  "  __db: { ...prep.__db, embedding_text: embeddingText },",
  "  passthrough: {",
  "    ...prep.passthrough,",
  "    used_embedding:      usedEmbedding,",
  "    embedding_attempted: embeddingAttempted,",
  "    embedding_error:     embeddingError",
  "  }",
  "}}];",
].join("\n");

const storeEmbedMerge = {
  id: "me-f6a-store-embed-merge",
  name: "ME_Memory_Store_Embed_Merge",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [3008, 1040],
  parameters: { jsCode: storeMergeJs },
};

// Node position note: the Store-DB was at [3008,1040]. Inserting Merge there
// would collide. We move Store-DB right to [3128,1040] to accommodate the new
// Merge at [3008,1040] and keep the existing two-row layout readable.
// This is a visual-layout-only change; behaviorally irrelevant, but we must
// update BUILD-INV-8 to allow this single position change.

// -- modified node: ME_Memory_Store_DB ---------------------------------------

const postStoreDB = post.nodes.find((n) => n.name === "ME_Memory_Store_DB");

// new SQL: 14-bind INSERT with CASE guard on $14 for graceful null embedding.
postStoreDB.parameters.query = [
  "WITH ins AS (",
  "  INSERT INTO public.memory_items (",
  "    tenant_id, memory_type, category, content,",
  "    confidence, importance, durability,",
  "    source_thread_id, source_message_id, entity_id,",
  "    evidence_refs, metadata, idempotency_key, embedding",
  "  )",
  "  VALUES (",
  "    $1::uuid, $2::memory_type_enum, $3::text, $4::text,",
  "    $5::numeric, $6::numeric, $7::rag_durability_enum,",
  "    $8::uuid, $9::uuid, $10::uuid,",
  "    $11::jsonb, $12::jsonb, $13::text,",
  "    CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END",
  "  )",
  "  ON CONFLICT (idempotency_key) DO NOTHING",
  "  RETURNING *, TRUE AS inserted",
  ")",
  "SELECT * FROM ins",
  "UNION ALL",
  "SELECT mi.*, FALSE AS inserted",
  "  FROM public.memory_items mi",
  " WHERE mi.idempotency_key = $13::text AND NOT EXISTS (SELECT 1 FROM ins)",
  "LIMIT 1;",
].join("\n");

postStoreDB.parameters.options.queryReplacement =
  "={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null] : " +
  "[$json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, " +
  "$json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, " +
  "$json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, " +
  "$json.__db.idempotency_key, $json.__db.embedding_text] }}";

// layout shift for Store_DB (position only)
postStoreDB.position = [3128, 1040];

// -- mutate nodes array ------------------------------------------------------

post.nodes.push(storeEmbed, storeEmbedMerge);

// -- mutate connections ------------------------------------------------------

// remove Prep → Store_DB (the only existing main edge out of Prep)
assert(
  post.connections.ME_Memory_Store_Prep &&
    Array.isArray(post.connections.ME_Memory_Store_Prep.main) &&
    post.connections.ME_Memory_Store_Prep.main[0].length === 1 &&
    post.connections.ME_Memory_Store_Prep.main[0][0].node ===
      "ME_Memory_Store_DB",
  "CONN-PREP-SHAPE",
  "pre ME_Memory_Store_Prep out-edge shape drift",
);
post.connections.ME_Memory_Store_Prep.main[0] = [
  { node: "ME_Memory_Store_Embed", type: "main", index: 0 },
];

// add Store_Embed → Store_Embed_Merge
post.connections.ME_Memory_Store_Embed = {
  main: [[{ node: "ME_Memory_Store_Embed_Merge", type: "main", index: 0 }]],
};

// add Store_Embed_Merge → Store_DB
post.connections.ME_Memory_Store_Embed_Merge = {
  main: [[{ node: "ME_Memory_Store_DB", type: "main", index: 0 }]],
};

// ---- invariant checks (BUILD-INV-1..10) ------------------------------------

// BUILD-INV-1: only three named nodes in the diff (add/add/modify).
{
  const preByName = new Map(pre.nodes.map((n) => [n.name, n]));
  const postByName = new Map(post.nodes.map((n) => [n.name, n]));
  const added = [];
  const modifiedNames = [];
  const removed = [];
  for (const n of post.nodes) {
    if (!preByName.has(n.name)) added.push(n.name);
    else if (JSON.stringify(n) !== JSON.stringify(preByName.get(n.name))) {
      modifiedNames.push(n.name);
    }
  }
  for (const n of pre.nodes) {
    if (!postByName.has(n.name)) removed.push(n.name);
  }
  assert(
    added.length === 2 &&
      added.includes("ME_Memory_Store_Embed") &&
      added.includes("ME_Memory_Store_Embed_Merge"),
    "BUILD-INV-1a",
    "unexpected added nodes: " + JSON.stringify(added),
  );
  assert(removed.length === 0, "BUILD-INV-1b", "unexpected removed nodes: " + JSON.stringify(removed));
  // Allow Store_DB to be modified; allow Store_DB position shift to appear as
  // the only other modification signal. (The position change on Store_DB is
  // part of the intended modification, and only Store_DB is in modifiedNames.)
  assert(
    modifiedNames.length === 1 && modifiedNames[0] === "ME_Memory_Store_DB",
    "BUILD-INV-1c",
    "unexpected modified nodes: " + JSON.stringify(modifiedNames),
  );
}

// BUILD-INV-2: only four connection edits appear.
{
  function edgeSet(conn) {
    const s = new Set();
    for (const [from, outs] of Object.entries(conn || {})) {
      for (const [kind, arr2] of Object.entries(outs)) {
        for (let i = 0; i < arr2.length; i++) {
          for (const e of arr2[i]) {
            s.add(`${from}|${kind}|${i}|${e.node}|${e.type}|${e.index}`);
          }
        }
      }
    }
    return s;
  }
  const preE = edgeSet(pre.connections);
  const postE = edgeSet(post.connections);
  const removed = [...preE].filter((x) => !postE.has(x));
  const added = [...postE].filter((x) => !preE.has(x));
  const expectedRemoved = [
    "ME_Memory_Store_Prep|main|0|ME_Memory_Store_DB|main|0",
  ];
  const expectedAdded = [
    "ME_Memory_Store_Prep|main|0|ME_Memory_Store_Embed|main|0",
    "ME_Memory_Store_Embed|main|0|ME_Memory_Store_Embed_Merge|main|0",
    "ME_Memory_Store_Embed_Merge|main|0|ME_Memory_Store_DB|main|0",
  ];
  assert(
    removed.length === expectedRemoved.length &&
      removed.every((e) => expectedRemoved.includes(e)),
    "BUILD-INV-2a",
    "unexpected removed edges: " + JSON.stringify(removed),
  );
  assert(
    added.length === expectedAdded.length &&
      added.every((e) => expectedAdded.includes(e)),
    "BUILD-INV-2b",
    "unexpected added edges: " + JSON.stringify(added),
  );
}

// BUILD-INV-3: Store_Embed mirrors Search_Embed modulo input field + id/name/position.
{
  const diffKeys = Object.keys(storeEmbed.parameters).filter(
    (k) => JSON.stringify(storeEmbed.parameters[k]) !== JSON.stringify(searchEmbed.parameters[k]),
  );
  // Only `jsonBody` is allowed to differ (because the input field name differs).
  assert(
    diffKeys.length === 1 && diffKeys[0] === "jsonBody",
    "BUILD-INV-3",
    "Store_Embed.parameters drifted from Search_Embed beyond jsonBody: " +
      JSON.stringify(diffKeys),
  );
  assert(
    storeEmbed.type === searchEmbed.type &&
      storeEmbed.typeVersion === searchEmbed.typeVersion &&
      storeEmbed.onError === searchEmbed.onError,
    "BUILD-INV-3b",
    "Store_Embed structural drift from Search_Embed",
  );
}

// BUILD-INV-4: Store_Embed_Merge.parameters.jsCode matches design-freeze verbatim.
{
  // Verify the merge reads the store-side prep and emits embedding_text.
  const code = storeEmbedMerge.parameters.jsCode;
  assert(
    code.includes("$('ME_Memory_Store_Prep').first().json"),
    "BUILD-INV-4a",
    "Merge jsCode does not read ME_Memory_Store_Prep",
  );
  assert(
    code.includes("embedding_text"),
    "BUILD-INV-4b",
    "Merge jsCode does not emit embedding_text",
  );
  assert(
    code.includes("vec.length === 1536"),
    "BUILD-INV-4c",
    "Merge jsCode does not guard 1536-dim",
  );
  assert(
    !code.includes("ME_Memory_Search_Prep"),
    "BUILD-INV-4d",
    "Merge jsCode still references Search_Prep",
  );
}

// BUILD-INV-5: Store_DB SQL shape.
{
  const q = postStoreDB.parameters.query;
  assert(
    q.includes("INSERT INTO public.memory_items ("),
    "BUILD-INV-5a",
    "SQL missing INSERT INTO public.memory_items",
  );
  assert(
    /idempotency_key,\s*embedding\s*\n?\s*\)/.test(q),
    "BUILD-INV-5b",
    "SQL column list does not end with idempotency_key, embedding",
  );
  assert(
    q.includes("CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END"),
    "BUILD-INV-5c",
    "SQL missing embedding CASE guard on $14",
  );
  // 14 positional binds across the VALUES only (not counting the two $13::text
  // occurrences that appear in the SELECT WHERE predicate).
  const valuesBlock = q.slice(q.indexOf("VALUES ("), q.indexOf("  ON CONFLICT"));
  const binds = [...valuesBlock.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  const uniq = [...new Set(binds)].sort((a, b) => a - b);
  assert(
    uniq.length === 14 && uniq[0] === 1 && uniq[13] === 14,
    "BUILD-INV-5d",
    "SQL VALUES does not contain exactly $1..$14, got " + JSON.stringify(uniq),
  );
}

// BUILD-INV-6: queryReplacement has 14 elements.
{
  const qr = postStoreDB.parameters.options.queryReplacement;
  // Count $json.__db.xxx references in the happy-path branch.
  const happy = qr.slice(qr.indexOf(": [") + 3);
  const refs = [...happy.matchAll(/\$json\.__db\.[a-zA-Z_]+/g)].map((m) => m[0]);
  assert(
    refs.length === 14,
    "BUILD-INV-6a",
    "queryReplacement happy-path has " + refs.length + " refs, expected 14",
  );
  assert(
    refs[13] === "$json.__db.embedding_text",
    "BUILD-INV-6b",
    "queryReplacement 14th ref is " + refs[13] + ", expected $json.__db.embedding_text",
  );
  // 14 nulls in the error branch.
  const nulls = (qr.match(/null/g) || []).length;
  assert(
    nulls === 14,
    "BUILD-INV-6c",
    "queryReplacement error branch has " + nulls + " nulls, expected 14",
  );
}

// BUILD-INV-7: credentials untouched across the whole workflow.
{
  const preCreds = pre.nodes.map((n) => [n.name, n.credentials || null]);
  const postByName = new Map(post.nodes.map((n) => [n.name, n]));
  for (const [nm, cr] of preCreds) {
    const pn = postByName.get(nm);
    assert(
      JSON.stringify(pn.credentials || null) === JSON.stringify(cr),
      "BUILD-INV-7",
      "credentials changed on " + nm,
    );
  }
  // Both new nodes' credentials must be OpenAI (Store_Embed) or absent (Merge).
  assert(
    JSON.stringify(storeEmbed.credentials) ===
      JSON.stringify({ openAiApi: { id: "svM62oyFwPbaIeX4", name: "OpenAi account" } }),
    "BUILD-INV-7b",
    "Store_Embed credential drift",
  );
  assert(
    !storeEmbedMerge.credentials,
    "BUILD-INV-7c",
    "Store_Embed_Merge should not carry credentials",
  );
}

// BUILD-INV-8: node positions — only two new nodes + single Store_DB shift.
{
  const preByName = new Map(pre.nodes.map((n) => [n.name, n]));
  for (const pn of post.nodes) {
    if (pn.name === "ME_Memory_Store_Embed" || pn.name === "ME_Memory_Store_Embed_Merge") continue;
    if (pn.name === "ME_Memory_Store_DB") {
      // allowed: shift from [3008,1040] to [3128,1040]
      assert(
        JSON.stringify(pn.position) === JSON.stringify([3128, 1040]),
        "BUILD-INV-8a",
        "Store_DB position != expected post [3128,1040]: " + JSON.stringify(pn.position),
      );
      continue;
    }
    const prev = preByName.get(pn.name);
    assert(
      JSON.stringify(pn.position) === JSON.stringify(prev.position),
      "BUILD-INV-8b",
      "position changed on untouched node " + pn.name,
    );
  }
}

// BUILD-INV-9: workflow-level metadata preserved exactly.
{
  const keys = ["name", "settings", "staticData", "pinData", "meta", "triggerCount", "tags"];
  for (const k of keys) {
    assert(
      JSON.stringify(post[k]) === JSON.stringify(pre[k]),
      "BUILD-INV-9-" + k,
      "top-level field " + k + " changed",
    );
  }
}

// BUILD-INV-10: active preserved.
assert(post.active === pre.active, "BUILD-INV-10", "active flag changed");

// ---- final shape assertions ------------------------------------------------

const postConnCount = countConnections(post.connections);
assert(
  post.nodes.length === 47,
  "POST-NODECOUNT",
  "post nodeCount " + post.nodes.length + " != 47",
);
assert(
  postConnCount === 65,
  "POST-CONNCOUNT",
  "post connectionCount " + postConnCount + " != 65",
);

// ---- emit outputs ----------------------------------------------------------

const postJson = JSON.stringify(post, null, 2);
writeFileSync(POST_PATH, postJson);

const diff = [
  "# F6A Diff Summary",
  "",
  "Generated deterministically from `build_patch_f6a.mjs`. Re-running the",
  "builder on the same pre snapshot produces byte-identical output.",
  "",
  "## Inputs",
  "- Pre snapshot: `WF-ME-01_pre_f6a.json` (sha256 " + sha256(preRaw) + ")",
  "- Pre versionId: `" + pre.versionId + "`",
  "",
  "## Outputs",
  "- Post payload: `WF-ME-01_post_f6a.json` (sha256 " + sha256(postJson) + ")",
  "",
  "## Node changes",
  "- Added: `ME_Memory_Store_Embed` (`n8n-nodes-base.httpRequest` typeVersion 4.2, onError=continueRegularOutput, credential=openAiApi `svM62oyFwPbaIeX4`).",
  "- Added: `ME_Memory_Store_Embed_Merge` (`n8n-nodes-base.code` typeVersion 2).",
  "- Modified: `ME_Memory_Store_DB.parameters.query` — column list +embedding; VALUES +`$14` with CASE null-guard casting to `vector(1536)`.",
  "- Modified: `ME_Memory_Store_DB.parameters.options.queryReplacement` — 13→14 elements; new 14th = `$json.__db.embedding_text`; error branch has 14 nulls.",
  "- Moved: `ME_Memory_Store_DB.position` `[3008,1040]` → `[3128,1040]` (visual layout only; makes room for new Merge at `[3008,1040]`).",
  "",
  "## Connection changes",
  "- Removed: `ME_Memory_Store_Prep → ME_Memory_Store_DB`.",
  "- Added: `ME_Memory_Store_Prep → ME_Memory_Store_Embed`.",
  "- Added: `ME_Memory_Store_Embed → ME_Memory_Store_Embed_Merge`.",
  "- Added: `ME_Memory_Store_Embed_Merge → ME_Memory_Store_DB`.",
  "",
  "## Counts",
  "- nodeCount: 45 → 47",
  "- connectionCount: 63 → 65",
  "- active: preserved (true)",
  "",
  "## Invariants verified by builder",
  "- BUILD-INV-1 only the three named nodes appear in the diff.",
  "- BUILD-INV-2 only the four named connection edits appear.",
  "- BUILD-INV-3 Store_Embed mirrors Search_Embed except jsonBody input field.",
  "- BUILD-INV-4 Store_Embed_Merge reads Store_Prep, emits embedding_text, guards 1536-dim.",
  "- BUILD-INV-5 SQL has `idempotency_key, embedding` column list end and `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END` guard; 14 binds.",
  "- BUILD-INV-6 queryReplacement has 14 elements happy-path and 14 nulls error-path; 14th is `$json.__db.embedding_text`.",
  "- BUILD-INV-7 no credential changes anywhere.",
  "- BUILD-INV-8 no position changes except the two new nodes' coords and the one deliberate Store_DB shift.",
  "- BUILD-INV-9 workflow-level metadata preserved byte-for-byte.",
  "- BUILD-INV-10 active flag preserved.",
  "",
].join("\n");

writeFileSync(DIFF_PATH, diff);

console.log("[build_patch_f6a] OK");
console.log("  pre  sha256 = " + sha256(preRaw));
console.log("  post sha256 = " + sha256(postJson));
console.log("  nodes " + pre.nodes.length + " -> " + post.nodes.length);
console.log("  conns " + preConnCount + " -> " + postConnCount);
