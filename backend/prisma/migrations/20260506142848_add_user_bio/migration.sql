-- AlterEnum
ALTER TYPE "integration_provider" ADD VALUE 'SLACK';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT;
