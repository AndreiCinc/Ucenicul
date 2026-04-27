// rc-test-harness/run-live-test.mjs
// Per test case: patch RC_Validate_State_Update_Input to inject a fixture payload,
// execute the workflow via MCP, return the result. Caller must restore jsCode.
import { readFileSync } from 'node:fs';
const ORIG = readFileSync('rc-test-harness/original-validate-jsCode.js','utf8');
export function wrappedJsCode(fixture) {
  // Replace `const input = $json || {};` with hard-coded fixture
  const head = `const input = ${JSON.stringify(fixture)};\n`;
  // Drop the first line of ORIG (which sets input from $json) and prepend our fixture
  const tail = ORIG.split('\n').slice(1).join('\n');
  return head + tail;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixtureJson = process.argv[2];
  const fixture = JSON.parse(fixtureJson);
  process.stdout.write(wrappedJsCode(fixture));
}
