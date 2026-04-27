# EXPECTED_WORKFLOW_MANIFEST

## Purpose
This file does **not** define a complete authoritative workflow list.

Its purpose is to define:
- how workflow discovery must be performed
- which naming patterns are expected
- which known workflow identifiers may exist
- which sources are stronger when repository reality and older notes differ

The operator must discover the real workflow set from evidence.
This manifest is only a discovery aid.

## Discovery Policy
The operator must determine workflow scope in this order:

1. physically present workflow folders under `workflows/`
2. workflow JSON files and local workflow READMEs
3. local state files, reports, contracts, and canonical docs
4. repo manifests, notes, archive references, rename bundles, and mapping docs
5. historical references only as weak evidence

Do not treat this manifest as proof that a workflow exists.

## Known Seeds
These are known workflow identifiers or partial identifiers that may appear in the repo, notes, archive, manifests, or rename material.

- WF-TR-01
- WF-EC-01
- WF-OR-01
- WF-PL-01
- WF-DI-01
- WF-ME-01
- WF-RA-01
- WF-SU-01

These are only seed identifiers, not a guaranteed complete list.

## Naming Expectations
A workflow may appear as:
- a normal workflow folder
- a renamed folder
- a partially migrated folder
- an archived-only folder
- a stub
- a folder whose readable name differs from its WF code
- a folder represented indirectly through state, reports, or staged rename material

## Required Discovery Classifications
Each discovered or referenced workflow candidate must be classified as one of:

- PRESENT_IN_REPO
- PRESENT_BUT_NONSTANDARD_NAME
- PRESENT_BUT_PARTIAL
- ARCHIVED_ONLY
- REFERENCED_ONLY
- UNCLEAR_MATCH
- DUPLICATE_CANDIDATE
- OUT_OF_SCOPE

## Matching Rules
The operator must match workflow candidates using:
- WF code
- folder name
- JSON file names
- state/report identifiers
- canonical docs
- rename bundle evidence
- direct cross-references from other workflows

Do not force a match when evidence is weak.

## Canonical Discovery Rule
Repository reality is stronger than this file.
If the manifest suggests a workflow may exist, but the repository does not support it with evidence, record that as:
`REFERENCED_ONLY`
not as failure.

## Important
The operator must:
- discover first
- classify second
- remediate only after evidence is strong enough

Do not fabricate a “complete workflow set” from this file.