-- Migrate all existing INBOX tasks to PENDING
-- These are tasks created from webhooks before the Inbox feature was implemented
UPDATE "tasks"
SET "status" = 'PENDING'
WHERE "status" = 'INBOX' AND "source_type" IS NOT NULL;
