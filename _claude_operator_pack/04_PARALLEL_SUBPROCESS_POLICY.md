# 04_PARALLEL_SUBPROCESS_POLICY

## Purpose
Permite folosirea subproceselor fără corupție de stare sau conflicte de scriere.

## Parallel-safe activities
- read-only inventory pe workflow-uri distincte
- semantic profiling pe workflow-uri distincte
- drafting de README/contracts/test matrix în fișiere separate
- independent validation reports

## Not parallel-safe
- live patching
- folder moves affecting shared roots
- edits on `manifests/`
- edits on global summary files
- packaging final
- writes on the same workflow from multiple subprocesses

## Coordination rules
1. Un coordonator principal deține `RUN_QUEUE.md`.
2. Fiecare subprocess primește exact un workflow sau un task independent.
3. Fiecare subprocess scrie doar în workspace-ul atribuit lui.
4. Merge-ul în shared files este serializat de coordonator.
5. Live patch este întotdeauna serial.
6. Dacă apar rezultate contradictorii între subprocesses, coordonatorul preferă sursele mai puternice și documentează conflictul.

## Fallback
Dacă mediul nu suportă subprocese reale, simulează aceeași disciplină secvențial.
Nu inventa parallelism doar declarativ.
