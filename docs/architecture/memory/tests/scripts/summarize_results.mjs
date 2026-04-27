#!/usr/bin/env node
import fs from 'node:fs';

const inPath = process.argv[2] || 'tests/memory/v2/results/runtime_smoke_latest.json';
const outPath = process.argv[3] || 'tests/memory/v2/results/runtime_smoke_summary.md';

const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const total = data.results.length;
const passed = data.results.filter(r => r.pass).length;
const failed = total - passed;

let md = `# Runtime Smoke Summary\n\n`;
md += `- Suite: ${data.suite}\n`;
md += `- Generated at: ${data.generated_at}\n`;
md += `- Total: ${total}\n`;
md += `- Passed: ${passed}\n`;
md += `- Failed: ${failed}\n\n`;
md += `| Case | Action | Status | Pass |\n|---|---|---|---|\n`;
for (const r of data.results) {
  md += `| ${r.case_id} | ${r.action} | ${r.execution_status} | ${r.pass ? 'yes' : 'no'} |\n`;
}
fs.writeFileSync(outPath, md);
console.log(`wrote ${outPath}`);
