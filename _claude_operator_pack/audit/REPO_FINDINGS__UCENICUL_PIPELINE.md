# REPO_FINDINGS__UCENICUL_PIPELINE

Constatări deja cunoscute din batch-ul examinat:
- există zone speciale: `prompts/`, `manifests/`, `notes/`, `archive/`
- `notes/tools/n8n-patch/.env` trebuie tratat ca sensibil
- macro-manifestele pot rămâne în urmă față de `STATE.json` și notele per-workflow
- snapshot-urile și arhivele pot produce false canonicality dacă nu sunt clasificate strict
- subfolderele fără README produc ambiguitate operațională
