/*
  Warnings:

  - Made the column `message` on table `notifications` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."notifications" ALTER COLUMN "message" SET NOT NULL;
