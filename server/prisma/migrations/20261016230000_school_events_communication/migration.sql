-- CreateTable: SchoolEvent
CREATE TABLE "SchoolEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'GENERAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ParentMeeting
CREATE TABLE "ParentMeeting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingType" TEXT NOT NULL DEFAULT 'GENERAL',
    "classId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "location" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TeacherReportRequest
CREATE TABLE "TeacherReportRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherReportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ParentMessage
CREATE TABLE "ParentMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SchoolFee
CREATE TABLE "SchoolFee" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "feeType" TEXT NOT NULL DEFAULT 'tuition',
    "term" TEXT,
    "academicYearId" TEXT,
    "dueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolFee_pkey" PRIMARY KEY ("id")
);

-- Indexes: SchoolEvent
CREATE INDEX "SchoolEvent_schoolId_idx" ON "SchoolEvent"("schoolId");
CREATE INDEX "SchoolEvent_eventType_idx" ON "SchoolEvent"("eventType");
CREATE INDEX "SchoolEvent_startDate_idx" ON "SchoolEvent"("startDate");

-- Indexes: ParentMeeting
CREATE INDEX "ParentMeeting_schoolId_idx" ON "ParentMeeting"("schoolId");
CREATE INDEX "ParentMeeting_meetingType_idx" ON "ParentMeeting"("meetingType");
CREATE INDEX "ParentMeeting_scheduledAt_idx" ON "ParentMeeting"("scheduledAt");

-- Indexes: TeacherReportRequest
CREATE INDEX "TeacherReportRequest_schoolId_idx" ON "TeacherReportRequest"("schoolId");
CREATE INDEX "TeacherReportRequest_requestedBy_idx" ON "TeacherReportRequest"("requestedBy");
CREATE INDEX "TeacherReportRequest_teacherId_idx" ON "TeacherReportRequest"("teacherId");
CREATE INDEX "TeacherReportRequest_status_idx" ON "TeacherReportRequest"("status");

-- Indexes: ParentMessage
CREATE INDEX "ParentMessage_senderId_idx" ON "ParentMessage"("senderId");
CREATE INDEX "ParentMessage_recipientId_idx" ON "ParentMessage"("recipientId");
CREATE INDEX "ParentMessage_isRead_idx" ON "ParentMessage"("isRead");
CREATE INDEX "ParentMessage_createdAt_idx" ON "ParentMessage"("createdAt");

-- Indexes: SchoolFee
CREATE INDEX "SchoolFee_schoolId_idx" ON "SchoolFee"("schoolId");
CREATE INDEX "SchoolFee_feeType_idx" ON "SchoolFee"("feeType");
CREATE INDEX "SchoolFee_isActive_idx" ON "SchoolFee"("isActive");

-- AddForeignKey: SchoolEvent
ALTER TABLE "SchoolEvent" ADD CONSTRAINT "SchoolEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolEvent" ADD CONSTRAINT "SchoolEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ParentMeeting
ALTER TABLE "ParentMeeting" ADD CONSTRAINT "ParentMeeting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentMeeting" ADD CONSTRAINT "ParentMeeting_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentMeeting" ADD CONSTRAINT "ParentMeeting_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: TeacherReportRequest
ALTER TABLE "TeacherReportRequest" ADD CONSTRAINT "TeacherReportRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherReportRequest" ADD CONSTRAINT "TeacherReportRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherReportRequest" ADD CONSTRAINT "TeacherReportRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ParentMessage
ALTER TABLE "ParentMessage" ADD CONSTRAINT "ParentMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentMessage" ADD CONSTRAINT "ParentMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: SchoolFee
ALTER TABLE "SchoolFee" ADD CONSTRAINT "SchoolFee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolFee" ADD CONSTRAINT "SchoolFee_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
