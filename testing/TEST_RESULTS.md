# TEST RESULTS — Parser Phase 1

## Run 1 — 2026-04-02
**Harness:** test_parser.js v2 (self-contained IIFE)
**Parser:** parse_contract_final.js (377 lines)
**Result:** 68/68 PASS

| Suite | Tests | Pass | Fail | Notes |
|-------|-------|------|------|-------|
| A - List Tasks | 14 | 14 | 0 | Filter inference from Romanian text works |
| B - Semantic Listing | 3 | 3 | 0 | Domain-specific listing |
| C - Bulk Actions | 2 | 2 | 0 | Complete/cancel by name |
| D - List Reminders | 3 | 3 | 0 | Filter inference for reminders |
| E - Create Tasks | 7 | 7 | 0 | Priority default, due_type inference, mutual exclusion |
| F - Create Reminders | 4 | 4 | 0 | Collision detection (task+reminder) |
| G - Task vs Reminder | 10 | 10 | 0 | Disambiguation, writing variations |
| H - Duplicates/Collision | 4 | 4 | 0 | Old contract, wrong version, invalid intent, garbled JSON |
| I - Semantic Actions | 4 | 4 | 0 | Update/complete/cancel validation |
| J - Memory | 4 | 4 | 0 | Search, writes, invalid type filtering |
| K - Improvement | 3 | 3 | 0 | Feature requests |
| L - Conversational | 4 | 4 | 0 | Ping, ok, mulțumesc, glumă |
| EC - Edge Cases | 6 | 6 | 0 | Fallback rules, parse errors, trim |

## Known Parser Gaps (not yet tested as failures)
These are documented in test notes but tests pass because LLM mock provides correct data:
- `messageImpliesReminderPreference()` missing: amintestemi, adumi aminte, reaminteste-mi, reamintește-mi, sa nu uit, sanuuit
- `messageImpliesTaskPreference()` missing: trb sa, trb să, trebuie sa-l (with sa-l), am de facut
- `inferFilterScopeFromMessage()` missing: miine (typo), astazi, intarziate (without restant), saptamina (typo)
- No weekday name parsing (luni, marți, etc.)

---

## Run 2 — 2026-04-03
**Harness:** test_parser.js v2 (updated with writing variation fixes)
**Parser:** parse_contract_final.js (updated — 3 functions extended)
**Result:** 85/85 PASS (0 regressions)

### Changes Made to Parser
1. `inferFilterScopeFromMessage()` — added: miine, astazi, astăzi, intarziat, saptamina asta, săptămîna asta
2. `messageImpliesTaskPreference()` — added: trb sa/să, creeaza-mi/creează-mi task, fa-mi/fă-mi task, adauga/adaugă task
3. `messageImpliesReminderPreference()` — added: adumi aminte, amintestemi, reamintește-mi, reaminteste-mi, reamintestemi, sa nu uit, să nu uit, sanuuit

### Pre-fix failures (Run 1.5 — WV suite only)
| Test | Status | Root Cause |
|------|--------|------------|
| WV10 | PARTIAL | "miine" not in inferFilterScopeFromMessage |
| WV13 | PARTIAL | "saptamina asta" not in inferFilterScopeFromMessage |
| WV17 | FAIL | "trb sa" + "amintestemi" not detected for disambiguation |

### Post-fix — all 17 WV tests PASS

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| A - List Tasks | 14 | 14 | 0 |
| B - Semantic Listing | 3 | 3 | 0 |
| C - Bulk Actions | 2 | 2 | 0 |
| D - List Reminders | 3 | 3 | 0 |
| E - Create Tasks | 7 | 7 | 0 |
| F - Create Reminders | 4 | 4 | 0 |
| G - Task vs Reminder | 10 | 10 | 0 |
| H - Duplicates/Collision | 4 | 4 | 0 |
| I - Semantic Actions | 4 | 4 | 0 |
| J - Memory | 4 | 4 | 0 |
| K - Improvement | 3 | 3 | 0 |
| L - Conversational | 4 | 4 | 0 |
| EC - Edge Cases | 6 | 6 | 0 |
| WV - Writing Variations | 17 | 17 | 0 |

## Next Steps
1. Copy fixed parser to n8n (manual — user imports)
2. Test cu mesaje reale din Telegram
3. Add weekday name parsing (luni, marți, etc.) if needed
