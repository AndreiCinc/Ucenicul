#!/usr/bin/env node
// f31_unflatten.mjs — reads a flatted-encoded text file (n8n execution_data.data)
// and writes an unflattened JSON blob shaped like get_execution's .data field,
// wrapped inside { execution: { id, status }, data: ... } so that
// f31_extract_from_exec.mjs can consume it.
//
// Usage: node harness/f31_unflatten.mjs <execId> <status> <dataTextFile> <outBlobPath>
import fs from 'node:fs';
import { parse as flattedParse } from 'flatted';

const [execId, status, dataFile, outPath] = process.argv.slice(2);
if (!execId || !status || !dataFile || !outPath) {
  console.error('usage: f31_unflatten.mjs <execId> <status> <dataTextFile> <outBlobPath>');
  process.exit(1);
}
const flattedText = fs.readFileSync(dataFile, 'utf8');
const parsedData = flattedParse(flattedText);
const execBlob = { execution: { id: execId, status }, data: parsedData };
fs.writeFileSync(outPath, JSON.stringify(execBlob));
console.log(outPath);
