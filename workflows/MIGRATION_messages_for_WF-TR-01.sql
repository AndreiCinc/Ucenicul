-- ============================================
-- MIGRATION: messages table columns for WF-TR-01
-- ============================================
-- This script MUST be run by the postgres superuser.
-- The claude_mvp user does NOT have ALTER privileges on the messages table.
--
-- Run BEFORE: importing WF-TR-01 or executing any test fixtures
-- Run AFTER: threads and entities tables are created
--
-- Version: 1.0 | Date: 2026-04-16
-- ============================================

-- 1. Add thread_id column (required by TR_Load_Reply_Context)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- 2. Add channel column (required by input contract, currently missing)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(50);

-- 3. Add author_type column (required by input contract)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_type VARCHAR(20);

-- 4. Add normalized_content column (required by scoring engine)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS normalized_content TEXT;

-- 5. Add source_message_ref column (required by input contract)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source_message_ref VARCHAR(200);

-- 6. Add author_entity_id column (required by entity matching)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_entity_id UUID;

-- 7. Add timestamp column (required by input contract — distinct from created_at)
-- Note: "timestamp" is a reserved word, must be quoted
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ;

-- 8. Create index on thread_id for reply linkage lookups
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id) WHERE thread_id IS NOT NULL;

-- 9. Create index on author_entity_id for entity resolution
CREATE INDEX IF NOT EXISTS idx_messages_author_entity ON messages (author_entity_id) WHERE author_entity_id IS NOT NULL;

-- ============================================
-- VERIFICATION (run after migration)
-- ============================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'messages'
-- AND column_name IN ('thread_id', 'channel', 'author_type', 'normalized_content',
--                      'source_message_ref', 'author_entity_id', 'timestamp')
-- ORDER BY column_name;
--
-- Expected: 7 rows, all present
-- ============================================

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- ALTER TABLE messages DROP COLUMN IF EXISTS thread_id;
-- ALTER TABLE messages DROP COLUMN IF EXISTS channel;
-- ALTER TABLE messages DROP COLUMN IF EXISTS author_type;
-- ALTER TABLE messages DROP COLUMN IF EXISTS normalized_content;
-- ALTER TABLE messages DROP COLUMN IF EXISTS source_message_ref;
-- ALTER TABLE messages DROP COLUMN IF EXISTS author_entity_id;
-- ALTER TABLE messages DROP COLUMN IF EXISTS "timestamp";
-- DROP INDEX IF EXISTS idx_messages_thread_id;
-- DROP INDEX IF EXISTS idx_messages_author_entity;
-- ============================================
