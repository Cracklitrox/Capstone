-- CreateEnum
CREATE TYPE "public"."notification_category_enum" AS ENUM ('general', 'operational', 'administrative', 'alert', 'maintenance', 'reservation', 'payment');

-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "category" "public"."notification_category_enum" DEFAULT 'general';
