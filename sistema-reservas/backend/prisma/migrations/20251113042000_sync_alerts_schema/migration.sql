-- AlterTable: Add missing columns to alerts table
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "last_viewed_at" TIMESTAMP(6);
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "detail" VARCHAR(250);
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "full_summary" JSONB;

-- AlterTable: Make title and message nullable in alerts
ALTER TABLE "alerts" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "alerts" ALTER COLUMN "message" DROP NOT NULL;

-- AlterTable: Add deleted_at to alert_read_status
ALTER TABLE "alert_read_status" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(6);

-- CreateIndex: Add unique constraint on alert_id and user_id (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'alert_read_status_alert_id_user_id_key'
    ) THEN
        ALTER TABLE "alert_read_status" ADD CONSTRAINT "alert_read_status_alert_id_user_id_key" UNIQUE ("alert_id", "user_id");
    END IF;
END $$;
