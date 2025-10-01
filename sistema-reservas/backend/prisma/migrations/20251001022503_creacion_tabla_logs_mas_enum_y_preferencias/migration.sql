/*
  Warnings:

  - The `action` column on the `activity_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."action_type_enum" AS ENUM ('CREATE_RESERVATION', 'UPDATE_RESERVATION', 'CANCEL_RESERVATION', 'CHECK_IN', 'CHECK_OUT', 'UPDATE_ROOM_STATUS', 'CREATE_MAINTENANCE', 'UPDATE_MAINTENANCE', 'COMPLETE_MAINTENANCE', 'CREATE_CLEANING', 'COMPLETE_CLEANING', 'CREATE_PAYMENT', 'UPDATE_PAYMENT', 'CREATE_USER', 'UPDATE_USER', 'UPDATE_PROFILE', 'CHANGE_PASSWORD');

-- AlterTable
ALTER TABLE "public"."activity_logs" DROP COLUMN "action",
ADD COLUMN     "action" "public"."action_type_enum";

-- CreateTable
CREATE TABLE "public"."user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "default_theme" VARCHAR(20) NOT NULL DEFAULT 'system',
    "default_dashboard" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "public"."user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "public"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
