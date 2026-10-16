-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "Subject" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Subject" ADD COLUMN "lastReviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CurriculumProgramme" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "CurriculumProgramme" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'pending';
