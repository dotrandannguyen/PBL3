-- AlterEnum: Add new notification types
ALTER TYPE "notif_type" ADD VALUE IF NOT EXISTS 'TASK_REMINDER';
ALTER TYPE "notif_type" ADD VALUE IF NOT EXISTS 'TASK_DUE';
ALTER TYPE "notif_type" ADD VALUE IF NOT EXISTS 'TASK_START';

-- AlterTable: Add notifKey unique field
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "notif_key" TEXT;

-- CreateIndex: Unique constraint on notif_key
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_notif_key_key" ON "notifications"("notif_key");
