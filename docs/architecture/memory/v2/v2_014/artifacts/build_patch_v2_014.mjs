#!/usr/bin/env node
// V2-014 deterministic builder
// Input:  (none; constants below)
// Output: patchV2_014_params.json — single-key { "query": "<SQL>" } payload
//         consumed by n8n-patch.mjs patch-node.
// Purpose: freeze the exact post-patch SQL for ME_Memory_Promote_DB.parameters.query.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, "patchV2_014_params.json");

// -----------------------------------------------------------------------------
// Frozen NEW SQL — exactly matches V2_014_DESIGN_FREEZE.md §New SQL.
// -----------------------------------------------------------------------------
const NEW_QUERY = `WITH target AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
accept AS (
  SELECT id,
         (corroboration_count >= $3::int
            OR ($4::boolean IS TRUE)
            OR ($5::boolean IS TRUE)
            OR (user_confirmed IS TRUE)
            OR (evidence_validated IS TRUE)) AS ok,
         tier
  FROM target
),
promoted AS (
  UPDATE public.memory_items m
  SET tier = 'long_term',
      last_reconfirmed_at = now(),
      user_confirmed     = (m.user_confirmed     OR $4::boolean),
      evidence_validated = (m.evidence_validated OR $5::boolean)
  FROM accept
  WHERE m.id = accept.id AND accept.ok AND accept.tier = 'recent'
  RETURNING m.*, TRUE AS promoted, 'accepted'::text AS denial_reason
)
SELECT * FROM promoted
UNION ALL
SELECT t.*, FALSE AS promoted,
       CASE
         WHEN t.tier <> 'recent' THEN 'not_in_recent_tier'
         ELSE 'acceptance_criteria_not_met'
       END AS denial_reason
  FROM target t
 WHERE NOT EXISTS (SELECT 1 FROM promoted)
LIMIT 1;`;

// -----------------------------------------------------------------------------
// Build-time guards — reject if any required token is missing, or a forbidden
// marker appears. Any failure aborts the build (non-zero exit).
// -----------------------------------------------------------------------------
const REQUIRED = [
  "FOR UPDATE",
  "tier = 'long_term'",
  "accept.tier = 'recent'",
  "corroboration_count >= $3::int",
  "($4::boolean IS TRUE)",
  "($5::boolean IS TRUE)",
  "(user_confirmed IS TRUE)",
  "(evidence_validated IS TRUE)",
  "user_confirmed     = (m.user_confirmed     OR $4::boolean)",
  "evidence_validated = (m.evidence_validated OR $5::boolean)",
  "RETURNING m.*, TRUE AS promoted, 'accepted'::text AS denial_reason",
  "'not_in_recent_tier'",
  "'acceptance_criteria_not_met'",
  "LIMIT 1;",
];

const FORBIDDEN = [
  // Path 5 / workflow_entity bypass markers
  "workflow_entity",
  "UPDATE public.workflow_entity",
  // Accidental drop of locking
  // (absence of FOR UPDATE is covered by REQUIRED)
  // Accidental extra column writes
  "content =",
  "thread_id =",
  "source_thread_id =",
  "execution_context_id =",
];

function assertGuards(sql) {
  const missing = REQUIRED.filter((t) => !sql.includes(t));
  if (missing.length) {
    console.error("[build_patch_v2_014] MISSING required tokens:");
    for (const m of missing) console.error("  - " + m);
    process.exit(2);
  }
  const forbidden = FORBIDDEN.filter((t) => sql.includes(t));
  if (forbidden.length) {
    console.error("[build_patch_v2_014] FORBIDDEN tokens present:");
    for (const f of forbidden) console.error("  - " + f);
    process.exit(3);
  }
}

assertGuards(NEW_QUERY);

// -----------------------------------------------------------------------------
// Emit single-key params payload. n8n-patch.mjs patch-node consumes this as
// { "query": "<SQL>" } and overwrites exactly parameters.query on the target.
// -----------------------------------------------------------------------------
const payload = { query: NEW_QUERY };
const json = JSON.stringify(payload, null, 2) + "\n";
writeFileSync(OUT, json);

const sha = createHash("sha256").update(json).digest("hex");
console.log("[build_patch_v2_014] wrote " + OUT);
console.log("[build_patch_v2_014] sha256(params.json) = " + sha);
console.log("[build_patch_v2_014] query bytes = " + NEW_QUERY.length);

// -----------------------------------------------------------------------------
// Unified-diff hint (old → new) for human review. Not emitted to disk; the
// authoritative diff lives in V2_014_DESIGN_FREEZE.md.
// -----------------------------------------------------------------------------
console.log(
  "\n--- unified-diff hint (accept CTE only) ---\n" +
    "-         (corroboration_count >= $3::int OR $4::boolean OR $5::boolean) AS ok,\n" +
    "+         (corroboration_count >= $3::int\n" +
    "+            OR ($4::boolean IS TRUE)\n" +
    "+            OR ($5::boolean IS TRUE)\n" +
    "+            OR (user_confirmed IS TRUE)\n" +
    "+            OR (evidence_validated IS TRUE)) AS ok,"
);
