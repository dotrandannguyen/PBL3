-- Migration: v2_schema_task_type_event_timestamps_notif_source
-- Giai đoạn A: Chuẩn hóa schema - backward compatible
-- Tất cả cột mới đều NULLABLE hoặc có DEFAULT để không gãy data cũ

-- ============================================================
-- 1. Tạo enum mới: task_type
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "task_type" AS ENUM ('TODO', 'SCHEDULED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. Tạo enum mới: notif_source  
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "notif_source" AS ENUM ('TASK', 'EVENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 3. Mở rộng enum notif_type với EVENT_* types
-- ============================================================
DO $$ BEGIN
  ALTER TYPE "notif_type" ADD VALUE IF NOT EXISTS 'EVENT_START';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "notif_type" ADD VALUE IF NOT EXISTS 'EVENT_END';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "notif_type" ADD VALUE IF NOT EXISTS 'EVENT_REMINDER';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 4. Task: thêm cột type (default TODO)
-- ============================================================
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "type" "task_type" NOT NULL DEFAULT 'TODO';

-- ============================================================
-- 5. Event: thêm các trường timestamp + linkedTaskId
-- ============================================================
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "start_at"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "end_at"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminder_at"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "linked_task_id" TEXT;

-- FK constraint cho linkedTaskId -> tasks.id (SET NULL khi task bị xóa)
ALTER TABLE "events"
  ADD CONSTRAINT "events_linked_task_id_fkey"
  FOREIGN KEY ("linked_task_id") REFERENCES "tasks"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- ============================================================
-- 6. Notification: thêm source + sourceId
-- ============================================================
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "source"    "notif_source",
  ADD COLUMN IF NOT EXISTS "source_id" TEXT;

-- ============================================================
-- 7. Indexes mới
-- ============================================================
CREATE INDEX IF NOT EXISTS "tasks_type_idx"
  ON "tasks"("type");

CREATE INDEX IF NOT EXISTS "events_user_id_start_at_idx"
  ON "events"("user_id", "start_at");

CREATE INDEX IF NOT EXISTS "events_linked_task_id_idx"
  ON "events"("linked_task_id");

CREATE INDEX IF NOT EXISTS "notifications_source_source_id_type_created_at_idx"
  ON "notifications"("source", "source_id", "type", "created_at");

-- ============================================================
-- 8. Backfill Task.type từ scheduledAt (Giai đoạn E Preview)
-- Tasks đã có scheduledAt -> SCHEDULED, còn lại -> TODO (default)
-- ============================================================
UPDATE "tasks"
  SET "type" = 'SCHEDULED'
  WHERE "scheduledAt" IS NOT NULL
    AND "deleted_at" IS NULL;
