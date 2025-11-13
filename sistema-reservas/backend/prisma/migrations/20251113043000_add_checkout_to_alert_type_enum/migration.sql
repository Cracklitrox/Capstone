-- AlterEnum: Add 'checkout' value to alert_type_enum
ALTER TYPE "alert_type_enum" ADD VALUE IF NOT EXISTS 'checkout';
