/*
  Warnings:

  - The values [SLACK] on the enum `integration_provider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "integration_provider_new" AS ENUM ('GOOGLE', 'GITHUB');
ALTER TABLE "integrations" ALTER COLUMN "provider" TYPE "integration_provider_new" USING ("provider"::text::"integration_provider_new");
ALTER TYPE "integration_provider" RENAME TO "integration_provider_old";
ALTER TYPE "integration_provider_new" RENAME TO "integration_provider";
DROP TYPE "public"."integration_provider_old";
COMMIT;
