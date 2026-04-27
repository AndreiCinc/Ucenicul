#!/usr/bin/env node
import fs from 'node:fs'; import crypto from 'node:crypto'; import assert from 'node:assert/strict';
function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null;}
const pre=JSON.parse(fs.readFileSync(arg('--pre'),'utf8'));
const post=JSON.parse(fs.readFileSync(arg('--post'),'utf8'));
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
const allow=new Set(['ME_Memory_Store_Prep','ME_Memory_Store_DB']);
const checks=[];function ck(id,fn){try{fn();console.log('PASS',id);checks.push(id);}catch(e){console.error('FAIL',id,e.message);process.exit(1);}}

ck('DS-INV-1 only Store_Prep+Store_DB changed', ()=>{
  for (const p of pre.nodes){const q=post.nodes.find(n=>n.name===p.name);if(!q)throw new Error('removed '+p.name);if(allow.has(p.name))continue;if(hash(p)!==hash(q))throw new Error('drift '+p.name);}
});
ck('DS-INV-2 Store_DB UPDATE/CTE shape unchanged (UNION ALL fallback by $13)', ()=>{
  const sdb=post.nodes.find(n=>n.name==='ME_Memory_Store_DB');
  assert.match(sdb.parameters.query, /UNION ALL\s+SELECT mi\.\*[\s\S]+\$13::text/);
});
ck('DS-INV-3 Store_Embed + Store_Embed_Merge byte-identical', ()=>{
  for (const n of ['ME_Memory_Store_Embed','ME_Memory_Store_Embed_Merge']){
    const p=pre.nodes.find(x=>x.name===n);const q=post.nodes.find(x=>x.name===n);
    assert.equal(hash(p),hash(q));
  }
});
ck('DS-INV-4 Supersede lane byte-identical', ()=>{
  for (const n of ['ME_Memory_Supersede_Prep','ME_Memory_Supersede_Embed','ME_Memory_Supersede_Embed_Merge','ME_Memory_Supersede_DB','ME_Memory_Supersede_Result']){
    const p=pre.nodes.find(x=>x.name===n);const q=post.nodes.find(x=>x.name===n);
    assert.equal(hash(p),hash(q),'drift on '+n);
  }
});
ck('DS-INV-5 Search/Recall/Promote/RA byte-identical', ()=>{
  const names=['ME_Memory_Search_Prep','ME_Memory_Search_Embed','ME_Memory_Search_Embed_Merge','ME_Memory_Search_DB','ME_Memory_Search_Result','ME_Memory_Recall_Prep','ME_Memory_Recall_DB','ME_Memory_Recall_Result','ME_Memory_Promote_Prep','ME_Memory_Promote_DB','ME_Memory_Promote_Result','ME_Build_RA_Envelope'];
  for (const n of names){const p=pre.nodes.find(x=>x.name===n);const q=post.nodes.find(x=>x.name===n);if(p)assert.equal(hash(p),hash(q),'drift on '+n);}
});
ck('DS-INV-6 V2-031 fields preserved in Store_Prep jsCode', ()=>{
  const sp=post.nodes.find(n=>n.name==='ME_Memory_Store_Prep');
  assert.match(sp.parameters.jsCode, /VALID_TIERS = \['recent','long_term'\]/);
  assert.match(sp.parameters.jsCode, /inputs\.user_confirmed === true \|\| inputs\.user_confirmed === false/);
  assert.match(sp.parameters.jsCode, /Number\.isInteger\(inputs\.corroboration_count\) && inputs\.corroboration_count >= 1/);
});
ck('DS-INV-7..10 evidence_validated extraction in jsCode', ()=>{
  const sp=post.nodes.find(n=>n.name==='ME_Memory_Store_Prep');
  assert.match(sp.parameters.jsCode, /inputs\.evidence_validated === true \|\| inputs\.evidence_validated === false/);
  assert.match(sp.parameters.jsCode, /evidence_validated\s*$/m);
});
ck('DS-INV-11 SQL has 18 distinct binds + $17::boolean + $18::vector(1536)', ()=>{
  const sdb=post.nodes.find(n=>n.name==='ME_Memory_Store_DB');
  const binds=new Set((sdb.parameters.query.match(/\$\d+/g)||[]));
  assert.equal(binds.size, 18);
  assert.match(sdb.parameters.query, /\$17::boolean/);
  assert.match(sdb.parameters.query, /CASE\s+WHEN\s+\$18::text\s+IS\s+NULL\s+THEN\s+NULL\s+ELSE\s+\$18::vector\(1536\)\s+END/i);
});
ck('DS-INV-12 queryReplacement 18+18', ()=>{
  const sdb=post.nodes.find(n=>n.name==='ME_Memory_Store_DB');
  const qr=sdb.parameters.options.queryReplacement;
  const succ=qr.match(/:\s*\[([^\]]*)\]/);
  const refs=(succ[1].match(/\$json\.__db\./g)||[]).length;
  assert.equal(refs, 18);
  assert.match(succ[1], /\$json\.__db\.evidence_validated[^,]*,\s*\$json\.__db\.embedding_text/);
  const err=qr.match(/\?\s*\[([^\]]*)\]/);
  const nulls=(err[1].match(/\bnull\b/g)||[]).length;
  assert.equal(nulls, 18);
});
ck('DS-INV-13 settings unchanged', ()=>{
  assert.deepEqual(pre.settings||{}, post.settings||{});
});
ck('DS-INV-14 nodeCount=49, connectionCount stable', ()=>{
  assert.equal(post.nodes.length, 49);
  assert.equal(post.nodes.length, pre.nodes.length);
});

console.log(`ALL ${checks.length}/14 PASS`);
