#!/usr/bin/env node
// usage: node inject-fixture.mjs <fixture.json> <out.params.json>
// Prepends a shim that shadows $input so the original validate JS body
// runs on the fixture instead of the manual-trigger empty item.
import { readFileSync, writeFileSync } from 'node:fs';

const [fxPath, outPath] = process.argv.slice(2);
const fixture = JSON.parse(readFileSync(fxPath, 'utf8'));
const orig = readFileSync('mo-test-harness/original-validate-jsCode.js', 'utf8');

const header = [
  '// TEST MODE — fixture injected for MO-01 V-sweep',
  `const __FIXTURE__ = ${JSON.stringify(fixture)};`,
  'const $input = { first: () => ({ json: __FIXTURE__ }), all: () => [{ json: __FIXTURE__ }] };',
  '// end test-mode prelude',
  ''
].join('\n');

const body = header + orig;
writeFileSync(outPath, JSON.stringify({
  language: 'javaScript',
  jsCode: body,
}));
console.log(`wrote ${outPath} (${body.length} chars, fixture keys: ${Object.keys(fixture).join(',')})`);
