# 00_OPERATING_MODEL

## Purpose
Definește modelul de operare al operatorului autonom pentru repo-ul Ucenicul.

## Core principles
1. Evidence first.
2. Minimal justified write.
3. Workflow-by-workflow execution.
4. Re-audit after every remediation.
5. No silent promotion.
6. No hard delete by default.
7. Canonical sources beat prose.
8. Subfoldere cu fișiere trebuie să aibă README.
9. SMALL workflows rămân slim.
10. Un caz local blocat nu are voie să blocheze întreg lotul dacă poate fi quarantined.
11. Shared files are merge-controlled; per-workflow files are independently fixable.
12. Final truth must be explicit, not implied.

## Source priority
1. live-verified closure docs + final state + canonical workflow JSON
2. verifier delivery / live execution proof
3. hotfix JSON and patch notes
4. current README / contracts / test matrix
5. pre-live docs
6. old negative audits
7. assumptions — forbidden

## File classifications
- canonical
- supporting
- patch
- historical
- stale
- foreign
- sensitive
- missing_dependency
- generated_run_artifact
- quarantined_evidence

## Global run invariant
După fiecare workflow procesat trebuie să poți răspunde clar la:
- care este implementarea canonică
- care este contractul curent
- care este statusul curent
- ce s-a schimbat în acest run
- ce a rămas explicit deschis

## Batch invariant
La finalul lotului:
- niciun workflow nu rămâne fără verdict
- niciun fișier sensibil nu intră în package
- nicio contradicție majoră nu rămâne fără note
