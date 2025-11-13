-- AlterTable: Make password_hash nullable to allow guest users without login
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
