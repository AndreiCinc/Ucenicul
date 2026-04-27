#!/usr/bin/env node
import fs from "node:fs";
const cases = JSON.parse(fs.readFileSync(process.argv[2] || "./tests/step1/unit_store_prep_evidence_validated_50.json","utf8")).cases;
console.log(JSON.stringify({ note:"Harness template. Adapt to live-extracted Store_Prep candidate; preserve all case IDs.", total:cases.length, case_ids:cases.map(c=>c.id) }, null, 2));
