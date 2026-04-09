-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
