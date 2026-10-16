-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "experienceYears" INTEGER,
    "teachingPhilosophy" TEXT,
    "languages" TEXT[],
    "lessonFormats" TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" TEXT NOT NULL DEFAULT 'public',
    "cvUrl" TEXT,
    "cvAnalyzedAt" TIMESTAMP(3),
    "cvAnalysisVersion" TEXT,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTimeMins" INTEGER,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "profileApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSubject" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "educationLevelId" TEXT,
    "proficiencyLevel" TEXT NOT NULL DEFAULT 'proficient',
    "aiScore" DOUBLE PRECISION,
    "aiConfidence" DOUBLE PRECISION,
    "aiEvidence" JSONB,
    "aiAssessedAt" TIMESTAMP(3),
    "manuallyVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "hourlyRateOverride" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorServiceArea" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "provinceId" TEXT,
    "districtId" TEXT,
    "sectorId" TEXT,
    "cellId" TEXT,
    "villageId" TEXT,
    "servesOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorAvailability" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "specificDate" TIMESTAMP(3),
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSkillAssessment" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "skillCategory" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB,
    "rubricVersion" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "overriddenBy" TEXT,
    "overrideReason" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorSkillAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorVerification" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "documentUrls" TEXT[],
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "parentUserId" TEXT,
    "studentProfileId" TEXT,
    "subjectId" TEXT NOT NULL,
    "educationLevelId" TEXT,
    "topicIds" TEXT[],
    "lessonFormat" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "location" TEXT,
    "onlineMeetingUrl" TEXT,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "learningObjectives" TEXT,
    "specialRequirements" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "rescheduledFromId" TEXT,
    "completedAt" TIMESTAMP(3),
    "tutorConfirmedAt" TIMESTAMP(3),
    "studentNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNotification" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "punctuality" INTEGER,
    "professionalism" INTEGER,
    "knowledge" INTEGER,
    "communication" INTEGER,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "responseFromTutor" TEXT,
    "tutorRespondedAt" TIMESTAMP(3),
    "isAdminFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "flaggedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSave" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSearchLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "locationProvince" TEXT,
    "locationDistrict" TEXT,
    "lessonFormat" TEXT,
    "filtersUsed" JSONB,
    "resultsCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingSearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- CreateIndex
CREATE INDEX "TutorProfile_userId_idx" ON "TutorProfile"("userId");

-- CreateIndex
CREATE INDEX "TutorProfile_verificationStatus_idx" ON "TutorProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "TutorProfile_isAvailable_idx" ON "TutorProfile"("isAvailable");

-- CreateIndex
CREATE INDEX "TutorProfile_rating_idx" ON "TutorProfile"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "TutorSubject_tutorProfileId_subjectId_educationLevelId_key" ON "TutorSubject"("tutorProfileId", "subjectId", "educationLevelId");

-- CreateIndex
CREATE INDEX "TutorSubject_tutorProfileId_idx" ON "TutorSubject"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorSubject_subjectId_idx" ON "TutorSubject"("subjectId");

-- CreateIndex
CREATE INDEX "TutorSubject_educationLevelId_idx" ON "TutorSubject"("educationLevelId");

-- CreateIndex
CREATE INDEX "TutorServiceArea_tutorProfileId_idx" ON "TutorServiceArea"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorServiceArea_provinceId_idx" ON "TutorServiceArea"("provinceId");

-- CreateIndex
CREATE INDEX "TutorServiceArea_districtId_idx" ON "TutorServiceArea"("districtId");

-- CreateIndex
CREATE INDEX "TutorAvailability_tutorProfileId_idx" ON "TutorAvailability"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorAvailability_dayOfWeek_idx" ON "TutorAvailability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "TutorSkillAssessment_tutorProfileId_idx" ON "TutorSkillAssessment"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorSkillAssessment_skillCategory_idx" ON "TutorSkillAssessment"("skillCategory");

-- CreateIndex
CREATE INDEX "TutorSkillAssessment_score_idx" ON "TutorSkillAssessment"("score");

-- CreateIndex
CREATE INDEX "TutorVerification_tutorProfileId_idx" ON "TutorVerification"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorVerification_status_idx" ON "TutorVerification"("status");

-- CreateIndex
CREATE INDEX "TutorVerification_verificationType_idx" ON "TutorVerification"("verificationType");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_tutorProfileId_idx" ON "Booking"("tutorProfileId");

-- CreateIndex
CREATE INDEX "Booking_studentUserId_idx" ON "Booking"("studentUserId");

-- CreateIndex
CREATE INDEX "Booking_parentUserId_idx" ON "Booking"("parentUserId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_scheduledDate_idx" ON "Booking"("scheduledDate");

-- CreateIndex
CREATE INDEX "Booking_bookingNumber_idx" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "BookingNotification_bookingId_idx" ON "BookingNotification"("bookingId");

-- CreateIndex
CREATE INDEX "BookingNotification_userId_idx" ON "BookingNotification"("userId");

-- CreateIndex
CREATE INDEX "BookingNotification_isRead_idx" ON "BookingNotification"("isRead");

-- CreateIndex
CREATE INDEX "BookingNotification_createdAt_idx" ON "BookingNotification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TutorReview_bookingId_key" ON "TutorReview"("bookingId");

-- CreateIndex
CREATE INDEX "TutorReview_tutorProfileId_idx" ON "TutorReview"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorReview_reviewerUserId_idx" ON "TutorReview"("reviewerUserId");

-- CreateIndex
CREATE INDEX "TutorReview_rating_idx" ON "TutorReview"("rating");

-- CreateIndex
CREATE INDEX "TutorReview_bookingId_idx" ON "TutorReview"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorSave_tutorProfileId_userId_key" ON "TutorSave"("tutorProfileId", "userId");

-- CreateIndex
CREATE INDEX "TutorSave_tutorProfileId_idx" ON "TutorSave"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorSave_userId_idx" ON "TutorSave"("userId");

-- CreateIndex
CREATE INDEX "BookingSearchLog_userId_idx" ON "BookingSearchLog"("userId");

-- CreateIndex
CREATE INDEX "BookingSearchLog_createdAt_idx" ON "BookingSearchLog"("createdAt");

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorServiceArea" ADD CONSTRAINT "TutorServiceArea_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorServiceArea" ADD CONSTRAINT "TutorServiceArea_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorServiceArea" ADD CONSTRAINT "TutorServiceArea_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorServiceArea" ADD CONSTRAINT "TutorServiceArea_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorServiceArea" ADD CONSTRAINT "TutorServiceArea_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorServiceArea" ADD CONSTRAINT "TutorServiceArea_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorAvailability" ADD CONSTRAINT "TutorAvailability_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSkillAssessment" ADD CONSTRAINT "TutorSkillAssessment_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorVerification" ADD CONSTRAINT "TutorVerification_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorReview" ADD CONSTRAINT "TutorReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorReview" ADD CONSTRAINT "TutorReview_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorReview" ADD CONSTRAINT "TutorReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSave" ADD CONSTRAINT "TutorSave_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSave" ADD CONSTRAINT "TutorSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
