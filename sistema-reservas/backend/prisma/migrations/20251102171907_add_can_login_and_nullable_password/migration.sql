-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_login" BOOLEAN DEFAULT true,
ALTER COLUMN "password_hash" DROP NOT NULL;
