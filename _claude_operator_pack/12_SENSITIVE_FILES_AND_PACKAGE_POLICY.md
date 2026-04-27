# 12_SENSITIVE_FILES_AND_PACKAGE_POLICY

## Sensitive classes
- `.env`
- credentials
- tokens
- secrets
- machine-local config paths
- copied payloads containing secrets

## Handling
- classify as `sensitive`
- exclude from final package
- never paste raw secret contents into reports
- mention existence only at classification level if necessary

## Package cleanliness
Final package must include:
- canonical docs
- supporting proofs
- generated run artifacts
It must exclude:
- sensitive
- stale unless explicitly requested
- foreign
- redundant snapshots
