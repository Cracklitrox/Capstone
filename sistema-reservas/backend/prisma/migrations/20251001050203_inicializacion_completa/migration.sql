-- DropIndex
DROP INDEX "public"."booking_groups_tax_id_idx";

-- DropIndex
DROP INDEX "public"."reservations_booking_type_idx";

-- AlterTable
ALTER TABLE "public"."booking_groups" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."seasons" ALTER COLUMN "price_modifier" SET DATA TYPE DECIMAL(10,2);
