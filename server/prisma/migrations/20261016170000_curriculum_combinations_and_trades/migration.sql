-- Create SubjectCombination table for S4-S6 subject combinations
CREATE TABLE "SubjectCombination" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "educationLevelId" TEXT NOT NULL,
    "combinationType" TEXT NOT NULL DEFAULT 'general',
    "sourceName" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastReviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectCombination_pkey" PRIMARY KEY ("id")
);

-- Create CombinationSubject link table
CREATE TABLE "CombinationSubject" (
    "id" TEXT NOT NULL,
    "combinationId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombinationSubject_pkey" PRIMARY KEY ("id")
);

-- Add TVET-specific fields to CurriculumProgramme
ALTER TABLE "CurriculumProgramme" ADD COLUMN IF NOT EXISTS "qualificationLevel" TEXT;
ALTER TABLE "CurriculumProgramme" ADD COLUMN IF NOT EXISTS "tradeCategory" TEXT;
ALTER TABLE "CurriculumProgramme" ADD COLUMN IF NOT EXISTS "durationYears" INTEGER;
ALTER TABLE "CurriculumProgramme" ADD COLUMN IF NOT EXISTS "awardingAuthority" TEXT;

-- Create unique constraint and indexes for SubjectCombination
CREATE UNIQUE INDEX "SubjectCombination_code_key" ON "SubjectCombination"("code");
CREATE INDEX "SubjectCombination_educationLevelId_idx" ON "SubjectCombination"("educationLevelId");
CREATE INDEX "SubjectCombination_code_idx" ON "SubjectCombination"("code");

-- Create unique constraint and indexes for CombinationSubject
CREATE UNIQUE INDEX "CombinationSubject_combinationId_subjectId_key" ON "CombinationSubject"("combinationId", "subjectId");
CREATE INDEX "CombinationSubject_combinationId_idx" ON "CombinationSubject"("combinationId");
CREATE INDEX "CombinationSubject_subjectId_idx" ON "CombinationSubject"("subjectId");

-- Add foreign keys
ALTER TABLE "SubjectCombination" ADD CONSTRAINT "SubjectCombination_educationLevelId_fkey"
    FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CombinationSubject" ADD CONSTRAINT "CombinationSubject_combinationId_fkey"
    FOREIGN KEY ("combinationId") REFERENCES "SubjectCombination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CombinationSubject" ADD CONSTRAINT "CombinationSubject_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
