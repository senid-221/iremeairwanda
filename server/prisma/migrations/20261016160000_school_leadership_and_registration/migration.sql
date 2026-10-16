-- AlterTable: Add registration and leadership fields to School
ALTER TABLE "School" ALTER COLUMN "code" DROP NOT NULL;
ALTER TABLE "School" ADD COLUMN "ownership" TEXT;
ALTER TABLE "School" ADD COLUMN "registrationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "School" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "School" ADD COLUMN "documents" JSONB;
ALTER TABLE "School" ADD COLUMN "registeredBy" TEXT;
ALTER TABLE "School" ADD COLUMN "registeredAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN "reviewNotes" TEXT;
ALTER TABLE "School" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "School" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- AlterTable: Add appointment tracking fields to SchoolMembership
ALTER TABLE "SchoolMembership" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "SchoolMembership" ADD COLUMN "approvalDate" TIMESTAMP(3);
ALTER TABLE "SchoolMembership" ADD COLUMN "endReason" TEXT;
ALTER TABLE "SchoolMembership" ADD COLUMN "transferNotes" TEXT;

-- CreateTable: SchoolLeadershipAppointment
CREATE TABLE "SchoolLeadershipAppointment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'headteacher',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "reason" TEXT,
    "endReason" TEXT,
    "transferNotes" TEXT,
    "previousAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolLeadershipAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolLeadershipAppointment_schoolId_idx" ON "SchoolLeadershipAppointment"("schoolId");
CREATE INDEX "SchoolLeadershipAppointment_userId_idx" ON "SchoolLeadershipAppointment"("userId");
CREATE INDEX "SchoolLeadershipAppointment_status_idx" ON "SchoolLeadershipAppointment"("status");
CREATE INDEX "SchoolLeadershipAppointment_startDate_idx" ON "SchoolLeadershipAppointment"("startDate");
CREATE UNIQUE INDEX "SchoolLeadershipAppointment_schoolId_userId_startDate_key" ON "SchoolLeadershipAppointment"("schoolId", "userId", "startDate");

-- CreateIndex for School registrationStatus
CREATE INDEX "School_registrationStatus_idx" ON "School"("registrationStatus");

-- AddForeignKey
ALTER TABLE "SchoolLeadershipAppointment" ADD CONSTRAINT "SchoolLeadershipAppointment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolLeadershipAppointment" ADD CONSTRAINT "SchoolLeadershipAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolLeadershipAppointment" ADD CONSTRAINT "SchoolLeadershipAppointment_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolLeadershipAppointment" ADD CONSTRAINT "SchoolLeadershipAppointment_previousAppointmentId_fkey" FOREIGN KEY ("previousAppointmentId") REFERENCES "SchoolLeadershipAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for SchoolMembership approver
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
