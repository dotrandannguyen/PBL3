/*
  Warnings:

  - The values [SLACK] on the enum `task_source` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "task_source_new" AS ENUM ('MANUAL', 'GMAIL', 'GITHUB');
ALTER TABLE "public"."tasks" ALTER COLUMN "source_type" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "source_type" TYPE "task_source_new" USING ("source_type"::text::"task_source_new");
ALTER TYPE "task_source" RENAME TO "task_source_old";
ALTER TYPE "task_source_new" RENAME TO "task_source";
DROP TYPE "public"."task_source_old";
ALTER TABLE "tasks" ALTER COLUMN "source_type" SET DEFAULT 'MANUAL';
COMMIT;
