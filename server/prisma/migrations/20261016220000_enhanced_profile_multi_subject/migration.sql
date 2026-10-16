-- Enhanced Profile with Multi-Subject Support
-- Adds student subject selection, school affiliations for tutors, and profile enhancements

-- StudentSubject: Many-to-many relationship for student subjects
CREATE TABLE "StudentSubject" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "educationLevelId" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubject_pkey" PRIMARY KEY ("id")
);

-- TutorSchoolAffiliation: Schools where a tutor teaches or is authorized
CREATE TABLE "TutorSchoolAffiliation" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "affiliationType" TEXT NOT NULL DEFAULT 'teaches',
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorSchoolAffiliation_pkey" PRIMARY KEY ("id")
);

-- Add convenience fields to StudentProfile for quick access
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "currentSchoolId" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "currentEducationLevelId" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "currentGrade" TEXT;

-- Add school affiliation fields to TutorProfile
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "currentSchoolId" TEXT;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "offersPrivateTutoring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "offersOnlineLessons" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "offersHomeLessons" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS "StudentSubject_studentProfileId_idx" ON "StudentSubject"("studentProfileId");
CREATE INDEX IF NOT EXISTS "StudentSubject_subjectId_idx" ON "StudentSubject"("subjectId");
CREATE INDEX IF NOT EXISTS "StudentSubject_educationLevelId_idx" ON "StudentSubject"("educationLevelId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentSubject_studentProfileId_subjectId_key" ON "StudentSubject"("studentProfileId", "subjectId");

CREATE INDEX IF NOT EXISTS "TutorSchoolAffiliation_tutorProfileId_idx" ON "TutorSchoolAffiliation"("tutorProfileId");
CREATE INDEX IF NOT EXISTS "TutorSchoolAffiliation_schoolId_idx" ON "TutorSchoolAffiliation"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "TutorSchoolAffiliation_tutorProfileId_schoolId_key" ON "TutorSchoolAffiliation"("tutorProfileId", "schoolId");

CREATE INDEX IF NOT EXISTS "StudentProfile_currentSchoolId_idx" ON "StudentProfile"("currentSchoolId");
CREATE INDEX IF NOT EXISTS "StudentProfile_currentEducationLevelId_idx" ON "StudentProfile"("currentEducationLevelId");
CREATE INDEX IF NOT EXISTS "TutorProfile_currentSchoolId_idx" ON "TutorProfile"("currentSchoolId");

-- Add foreign key constraints
ALTER TABLE "StudentSubject" ADD CONSTRAINT "StudentSubject_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSubject" ADD CONSTRAINT "StudentSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSubject" ADD CONSTRAINT "StudentSubject_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TutorSchoolAffiliation" ADD CONSTRAINT "TutorSchoolAffiliation_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TutorSchoolAffiliation" ADD CONSTRAINT "TutorSchoolAffiliation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_currentSchoolId_fkey" FOREIGN KEY ("currentSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_currentEducationLevelId_fkey" FOREIGN KEY ("currentEducationLevelId") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_currentSchoolId_fkey" FOREIGN KEY ("currentSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
