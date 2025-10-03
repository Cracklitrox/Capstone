/*
  Warnings:

  - Made the column `created_at` on table `breakfast_menu_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `current_step` on table `reservation_drafts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `reservation_drafts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `room_service_daily` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "public"."service_unit_enum" ADD VALUE 'custom';

-- DropForeignKey
ALTER TABLE "public"."reservation_drafts" DROP CONSTRAINT "reservation_drafts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."room_service_daily" DROP CONSTRAINT "room_service_daily_reservation_room_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."room_service_daily" DROP CONSTRAINT "room_service_daily_service_id_fkey";

-- DropIndex
DROP INDEX "public"."reservation_drafts_expires_at_idx";

-- DropIndex
DROP INDEX "public"."reservation_drafts_user_id_idx";

-- DropIndex
DROP INDEX "public"."room_service_daily_reservation_room_id_idx";

-- DropIndex
DROP INDEX "public"."room_service_daily_service_date_idx";

-- DropIndex
DROP INDEX "public"."users_identification_number_idx";

-- AlterTable
ALTER TABLE "public"."breakfast_menu_items" ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."reservation_drafts" ALTER COLUMN "current_step" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."room_service_daily" ALTER COLUMN "created_at" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."room_service_daily" ADD CONSTRAINT "room_service_daily_reservation_room_id_fkey" FOREIGN KEY ("reservation_room_id") REFERENCES "public"."reservation_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_service_daily" ADD CONSTRAINT "room_service_daily_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservation_drafts" ADD CONSTRAINT "reservation_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."users_rut_key" RENAME TO "users_identification_number_key";
