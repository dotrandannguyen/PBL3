-- AlterTable: add end_date + end_time columns to events
ALTER TABLE "events" ADD COLUMN "end_date" DATE;
ALTER TABLE "events" ADD COLUMN "end_time" TEXT;
