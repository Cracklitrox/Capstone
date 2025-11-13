-- AlterTable: Remove unused columns from alerts table
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "priority";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "title";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "message";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "target_role";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "action_type";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "resolved_at";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "resolved_by";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "resolution_notes";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "origin_user_id";
ALTER TABLE "alerts" DROP COLUMN IF EXISTS "payment_id";

-- Drop foreign key constraints for removed columns
ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "alerts_resolved_by_fkey";
ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "alerts_origin_user_id_fkey";
ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "alerts_payment_id_fkey";
