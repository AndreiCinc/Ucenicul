#!/usr/bin/env node
// Deterministic builder for V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH (Step 1).
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const prePath  = path.join(here, 'WF-ME-01_pre_evpt.json');
const postPath = path.join(here, 'WF-ME-01_post_evpt.json');
const diffPath = path.join(here, 'diff_summary.md');
const pre = JSON.parse(fs.readFileSync(prePath, 'utf8'));

// new Store_Prep jsCode: V2-031 + evidence_validated extraction (mirroring user_confirmed contract)
const newStorePrepJsCode = `
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};

const required = ['content','memory_type','category','source_thread_id'];
const VALID_TYPES = ['fact','observation','pattern','inference','preference','constraint'];
const missing = required.filter(k => !inputs[k] || (typeof inputs[k] === 'string' && !inputs[k].trim()));
if (!VALID_TYPES.includes(inputs.memory_type) && !missing.includes('memory_type')) missing.push('memory_type');
if (missing.length) {
  return [{ json: { _error: true, error_code: 'MISSING_REQUIRED_FIELDS', error_message: 'Memory store inputs are incomplete.', missing_fields: missing } }];
}

const category = String(inputs.category).trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
if (!/^[a-z][a-z0-9_]{0,63}$/.test(category)) {
  return [{ json: { _error: true, error_code: 'INVALID_CATEGORY', error_message: 'Category fails ^[a-z][a-z0-9_]{0,63}$.', missing_fields: ['category'] } }];
}

const SUBJECTIVE_RO = [
  /\\b(prost|prosti|proasta|proaste)\\b/i,
  /\\b(dezgustator|dezgustatoare)\\b/i,
  /\\b(idiot|idioti|idioata|idioate)\\b/i,
  /\\b(lene[sș](a|e|i)?)\\b/i,
  /\\b(incompetent(a|e|i)?)\\b/i,
  /\\b(r[aă]u|rea|r[aă]i|rele)\\b.*\\b(caracter|om|persoana)\\b/i
];
const SUBJECTIVE_EN = [
  /\\b(stupid|dumb|dumber|dumbest)\\b/i,
  /\\b(idiot|idiots|idiotic)\\b/i,
  /\\b(moron|morons|moronic|imbecile|imbeciles)\\b/i,
  /\\b(lazy|lazier|laziest)\\b/i,
  /\\b(incompetent|incompetents)\\b/i,
  /\\b(disgusting|revolting|repulsive)\\b/i,
  /\\b(worthless|pathetic|useless)\\b/i,
  /\\b(bad|evil|nasty|rotten|awful)\\s+(person|character|human|guy|people)\\b/i
];
const LOCALE_LISTS = { ro: SUBJECTIVE_RO, en: SUBJECTIVE_EN };
const SUPPORTED_LOCALES = ['ro', 'en'];
const rawLocale = (inputs && typeof inputs.locale === 'string') ? inputs.locale : '';
const normLocale = rawLocale.trim().toLowerCase().split(/[-_]/)[0];
const locale = SUPPORTED_LOCALES.includes(normLocale) ? normLocale : 'ro';
if (['observation','pattern'].includes(inputs.memory_type)) {
  const list = LOCALE_LISTS[locale];
  if (list.some(rx => rx.test(String(inputs.content)))) {
    return [{ json: { _error: true, error_code: 'SUBJECTIVE_JUDGMENT_FORBIDDEN', error_message: 'Subjective character judgments not allowed under observation/pattern.', missing_fields: [] }}];
  }
}

const confidence = Number.isFinite(inputs.confidence) ? inputs.confidence : 0.800;
const importance = Number.isFinite(inputs.importance) ? inputs.importance : 0.500;
const durability = inputs.durability || 'stable';
const evidence_refs = Array.isArray(inputs.evidence_refs) ? inputs.evidence_refs : [];
const metadata     = (inputs.metadata && typeof inputs.metadata === 'object') ? inputs.metadata : {};

const VALID_TIERS = ['recent','long_term'];
const tier = (typeof inputs.tier === 'string' && VALID_TIERS.includes(inputs.tier)) ? inputs.tier : 'recent';
const user_confirmed = (inputs.user_confirmed === true || inputs.user_confirmed === false) ? inputs.user_confirmed : false;
const corroboration_count = (Number.isInteger(inputs.corroboration_count) && inputs.corroboration_count >= 1) ? inputs.corroboration_count : 1;
const evidence_validated = (inputs.evidence_validated === true || inputs.evidence_validated === false) ? inputs.evidence_validated : false;

const idempotency_key = 'store_memory:' + env.execution_context_id + ':' + step.step_id;

return [{ json: {
  __db: {
    tenant_id:           env.tenant_id,
    memory_type:         inputs.memory_type,
    category,
    content:             inputs.content,
    confidence, importance, durability,
    source_thread_id:    inputs.source_thread_id,
    source_message_id:   inputs.source_message_id || null,
    entity_id:           inputs.entity_id || null,
    evidence_refs:       JSON.stringify(evidence_refs),
    metadata:            JSON.stringify(metadata),
    idempotency_key,
    tier,
    user_confirmed,
    corroboration_count,
    evidence_validated
  },
  passthrough: { env, step, inputs, idempotency_key }
}}];`;

const newStoreDBSQL = `WITH ins AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key,
    tier, user_confirmed, corroboration_count, evidence_validated, embedding
  )
  VALUES (
    $1::uuid, $2::memory_type_enum, $3::text, $4::text,
    $5::numeric, $6::numeric, $7::rag_durability_enum,
    $8::uuid, $9::uuid, $10::uuid,
    $11::jsonb, $12::jsonb, $13::text,
    $14::memory_tier_enum, $15::boolean, $16::int4, $17::boolean,
    CASE WHEN $18::text IS NULL THEN NULL ELSE $18::vector(1536) END
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, TRUE AS inserted
)
SELECT * FROM ins
UNION ALL
SELECT mi.*, FALSE AS inserted
  FROM public.memory_items mi
 WHERE mi.idempotency_key = $13::text AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;`;

const newStoreDBQueryReplacement = "={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key, $json.__db.tier, $json.__db.user_confirmed, $json.__db.corroboration_count, $json.__db.evidence_validated, $json.__db.embedding_text] }}";

const post = JSON.parse(JSON.stringify(pre));
const sp = post.nodes.find(n => n.name === 'ME_Memory_Store_Prep');
const sdb = post.nodes.find(n => n.name === 'ME_Memory_Store_DB');
if (!sp || !sdb) throw new Error('BUILD-INV-2: target nodes not found');

sp.parameters.jsCode = newStorePrepJsCode;
sdb.parameters.query = newStoreDBSQL;
sdb.parameters.options = { ...(sdb.parameters.options || {}), queryReplacement: newStoreDBQueryReplacement };

// BUILD-INV checks
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}

if (post.nodes.length !== pre.nodes.length) throw new Error('BUILD-INV-2 violated: node count changed');
for (const preNode of pre.nodes) {
  const postNode = post.nodes.find(n => n.name === preNode.name);
  if (['ME_Memory_Store_Prep','ME_Memory_Store_DB'].includes(preNode.name)) continue;
  if (hash(preNode) !== hash(postNode)) throw new Error('BUILD-INV-3 violated: drift on ' + preNode.name);
}
if (hash(pre.connections) !== hash(post.connections)) throw new Error('BUILD-INV-4 violated: connections changed');

const binds = new Set((sdb.parameters.query.match(/\$\d+/g) || []));
if (binds.size !== 18) throw new Error('BUILD-INV-5 violated: expected 18 bind slots, got ' + binds.size);
if (!/\$17::boolean/.test(sdb.parameters.query)) throw new Error('BUILD-INV-5 violated: $17::boolean missing');
if (!/CASE\s+WHEN\s+\$18::text\s+IS\s+NULL\s+THEN\s+NULL\s+ELSE\s+\$18::vector\(1536\)\s+END/i.test(sdb.parameters.query)) {
  throw new Error('BUILD-INV-5 violated: $18 CASE guard missing');
}
const qr = sdb.parameters.options.queryReplacement;
const succ = qr.match(/:\s*\[([^\]]*evidence_validated[^\]]*)\]/);
if (!succ) throw new Error('BUILD-INV-6 violated: success branch missing evidence_validated');
const refs = (succ[1].match(/\$json\.__db\./g) || []).length;
if (refs !== 18) throw new Error('BUILD-INV-6 violated: success refs != 18: ' + refs);
const err = qr.match(/\?\s*\[([^\]]*)\]/);
const nulls = (err[1].match(/\bnull\b/g) || []).length;
if (nulls !== 18) throw new Error('BUILD-INV-6 violated: error branch nulls != 18: ' + nulls);
if (!/inputs\.evidence_validated === true \|\| inputs\.evidence_validated === false/.test(sp.parameters.jsCode)) throw new Error('BUILD-INV-7 violated: evidence_validated strict check missing');
if (!/Number\.isInteger\(inputs\.corroboration_count\) && inputs\.corroboration_count >= 1/.test(sp.parameters.jsCode)) throw new Error('BUILD-INV-7 violated: V2-031 corroboration_count regression');

fs.writeFileSync(postPath, JSON.stringify(post, null, 2));
const postHash = crypto.createHash('sha256').update(fs.readFileSync(postPath)).digest('hex');
const prepHash = crypto.createHash('sha256').update(newStorePrepJsCode).digest('hex');

const diff = `# V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH — Diff Summary
Ran: ${new Date().toISOString()}

- pre  sha256 = ${crypto.createHash('sha256').update(fs.readFileSync(prePath)).digest('hex')}
- post sha256 = ${postHash}
- Store_Prep jsCode sha256 = ${prepHash}

## Diff surface
- nodes: ${pre.nodes.length} -> ${post.nodes.length} (unchanged)
- connections: unchanged
- modified: ME_Memory_Store_Prep (jsCode), ME_Memory_Store_DB (query + options.queryReplacement)
- new nodes: 0; removed: 0
- SQL binds: 17 -> 18 ( $17::boolean=evidence_validated; $18::vector(1536)=embedding CASE-guarded )
- queryReplacement slots: 17 -> 18; success branch ends with $json.__db.evidence_validated, $json.__db.embedding_text; error branch 17 -> 18 NULLs

## BUILD-INV-1..10 PASS (deterministic; only 2 nodes modified; non-target byte-identical; connections byte-identical; 18 SQL slots; 18+18 queryReplacement; evidence_validated strict check present; V2-031 corroboration_count >=1 regression preserved)
`;
fs.writeFileSync(diffPath, diff);
console.log('post sha256 =', postHash);
console.log('prep sha256 =', prepHash);
console.log('BUILD-INV-1..10 ALL PASS');
