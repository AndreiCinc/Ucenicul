#!/usr/bin/env node
// Build a params JSON file for patch-node that injects a fixture into RC_Validate_State_Update_Input
import { readFileSync, writeFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync(process.argv[2],'utf8'));
const orig = readFileSync('rc-test-harness/original-validate-jsCode.js','utf8');
const tail = orig.split('\n').slice(1).join('\n'); // drop original "const input = $json || {};"
const jsCode = `const input = ${JSON.stringify(fixture)};\n` + tail;
writeFileSync(process.argv[3], JSON.stringify({ jsCode }));
console.log('wrote', process.argv[3], '(', jsCode.length, 'chars )');
