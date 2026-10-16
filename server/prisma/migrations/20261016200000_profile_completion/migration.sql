-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cvUrl" TEXT,
ADD COLUMN     "faceScanUrl" TEXT,
ADD COLUMN     "educationTrack" TEXT;
