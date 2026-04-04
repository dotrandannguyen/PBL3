-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tasks_user_id_scheduledAt_idx" ON "tasks"("user_id", "scheduledAt");
