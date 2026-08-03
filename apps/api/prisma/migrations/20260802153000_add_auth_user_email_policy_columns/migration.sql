-- CreateEnum
CREATE TYPE "AuthBackupEmailPolicy" AS ENUM ('ALL_VERIFIED', 'RECOVERY_EMAIL');

-- CreateEnum
CREATE TYPE "AuthPrimaryEmailAddressPolicy" AS ENUM ('ACCOUNT_EMAIL', 'RECOVERY_EMAIL');

-- AlterTable
ALTER TABLE "AuthUser"
ADD COLUMN "primaryEmailAddressPolicy" "AuthPrimaryEmailAddressPolicy" NOT NULL DEFAULT 'ACCOUNT_EMAIL',
ADD COLUMN "backupEmailPolicy" "AuthBackupEmailPolicy" NOT NULL DEFAULT 'RECOVERY_EMAIL';
