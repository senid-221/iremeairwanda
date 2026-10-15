-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'PARENT', 'HEADTEACHER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- SECTION 1: AUTHENTICATION AND USER MANAGEMENT

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Kigali',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "profilePicture" TEXT,
    "coverImage" TEXT,
    "website" TEXT,
    "location" TEXT,
    "country" TEXT DEFAULT 'Rwanda',
    "province" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "postalCode" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "nationality" TEXT,
    "nationalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "email" TEXT,
    "displayName" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "userId" TEXT,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id")
);

-- SECTION 2: EDUCATION LEVELS AND CURRICULUM

-- CreateTable
CREATE TABLE "EducationLevel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "levelType" TEXT NOT NULL,
    "gradeRange" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "educationLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumVersion" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumSource" (
    "id" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "documentUrl" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumProgramme" (
    "id" TEXT NOT NULL,
    "educationLevelId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "programmeType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumOption" (
    "id" TEXT NOT NULL,
    "curriculumProgrammeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "subjectType" TEXT NOT NULL,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelSubject" (
    "id" TEXT NOT NULL,
    "educationLevelId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumTopic" (
    "id" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectTopic" (
    "id" TEXT NOT NULL,
    "levelSubjectId" TEXT NOT NULL,
    "curriculumTopicId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumModule" (
    "id" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "moduleType" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleCompetency" (
    "id" TEXT NOT NULL,
    "curriculumModuleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumImportJob" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "importStatus" TEXT NOT NULL DEFAULT 'pending',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "importedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumChangeLog" (
    "id" TEXT NOT NULL,
    "curriculumSourceId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "changedBy" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumChangeLog_pkey" PRIMARY KEY ("id")
);

-- SECTION 3: SCHOOLS AND EDUCATION STAFF

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "schoolType" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolLocation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolContact" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "contactValue" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolLevel" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "educationLevelId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSubject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolMembership" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClaimRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "claimReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolVerificationRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "documents" JSONB,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolVerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolStaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "staffId" TEXT,
    "position" TEXT,
    "department" TEXT,
    "employmentType" TEXT,
    "hireDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolStaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherQualification" (
    "id" TEXT NOT NULL,
    "schoolStaffProfileId" TEXT NOT NULL,
    "qualificationType" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "fieldOfStudy" TEXT,
    "graduationYear" INTEGER,
    "certificateUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "schoolStaffProfileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT,
    "classId" TEXT,
    "academicYearId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "section" TEXT,
    "academicYearId" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMembership" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolAnnouncement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAnnouncement_pkey" PRIMARY KEY ("id")
);

-- SECTION 4: STUDENTS, PARENTS, AND GUARDIANS

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "nationalId" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "previousSchool" TEXT,
    "admissionDate" TIMESTAMP(3),
    "graduationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "educationLevelId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "curriculumProgrammeId" TEXT,
    "curriculumOptionId" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occupation" TEXT,
    "employer" TEXT,
    "relationship" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentProfileId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianVerificationRequest" (
    "id" TEXT NOT NULL,
    "parentProfileId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "responseNotes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLearningPreference" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 30,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "fontSize" TEXT NOT NULL DEFAULT 'medium',
    "difficultyPreference" TEXT NOT NULL DEFAULT 'adaptive',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLearningPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAcademicRecord" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "academicYearId" TEXT,
    "term" TEXT,
    "subjectId" TEXT,
    "grade" TEXT,
    "score" DECIMAL(10,2),
    "maxScore" DECIMAL(10,2),
    "percentage" DECIMAL(5,2),
    "remarks" TEXT,
    "recordedDate" TIMESTAMP(3) NOT NULL,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAcademicRecord_pkey" PRIMARY KEY ("id")
);

-- SECTION 5: LEARNING RESOURCES AND DOCUMENTS

-- CreateTable
CREATE TABLE "ResourceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "iconUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL,
    "resourceCategoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleRw" TEXT,
    "description" TEXT,
    "resourceType" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "source" TEXT,
    "publicationYear" INTEGER,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "accessLevel" TEXT NOT NULL DEFAULT 'free',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceCurriculumLink" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "curriculumVersionId" TEXT,
    "educationLevelId" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceCurriculumLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceFile" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "checksum" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAuthor" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorType" TEXT NOT NULL DEFAULT 'individual',
    "institution" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceReview" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePublicationVersion" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changeNotes" TEXT,
    "fileUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourcePublicationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAccessLog" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "userId" TEXT,
    "accessType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceBookmark" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNote" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "learningResourceId" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'general',
    "subjectId" TEXT,
    "topicId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentNote_pkey" PRIMARY KEY ("id")
);

-- SECTION 6: ASSESSMENTS, QUESTIONS, AND EXAMINATIONS

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT NOT NULL,
    "level" TEXT,
    "difficulty" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionBankId" TEXT NOT NULL,
    "subjectTopicId" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'multiple_choice',
    "questionText" TEXT NOT NULL,
    "questionTextEn" TEXT,
    "questionTextRw" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "points" INTEGER NOT NULL DEFAULT 1,
    "timeLimitSeconds" INTEGER,
    "explanation" TEXT,
    "explanationEn" TEXT,
    "explanationRw" TEXT,
    "hint" TEXT,
    "mediaUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "optionTextEn" TEXT,
    "optionTextRw" TEXT,
    "optionOrder" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCurriculumLink" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "curriculumVersionId" TEXT,
    "educationLevelId" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionCurriculumLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionExplanation" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "explanationText" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "explanationType" TEXT NOT NULL DEFAULT 'detailed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleRw" TEXT,
    "description" TEXT,
    "assessmentType" TEXT NOT NULL,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "timeLimitMinutes" INTEGER,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "passingScore" INTEGER,
    "maxAttempts" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionOrder" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeSpentSeconds" INTEGER,
    "totalScore" INTEGER,
    "maxScore" INTEGER,
    "percentage" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" TEXT NOT NULL,
    "assessmentAttemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "answerText" TEXT,
    "isCorrect" BOOLEAN,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL,
    "assessmentAttemptId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "grade" TEXT,
    "passed" BOOLEAN,
    "remarks" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingRubric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "rubricType" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkingGuide" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "guideContent" TEXT NOT NULL,
    "guideContentEn" TEXT,
    "guideContentRw" TEXT,
    "documentUrl" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkingGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExaminationPaper" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examinationType" TEXT NOT NULL,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "academicYearId" TEXT,
    "term" TEXT,
    "year" INTEGER,
    "documentUrl" TEXT,
    "markingGuideUrl" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExaminationPaper_pkey" PRIMARY KEY ("id")
);

-- SECTION 7: FIGHTING BY QUESTIONS GAME

-- CreateTable
CREATE TABLE "GameMode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "gameType" TEXT NOT NULL,
    "minPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER NOT NULL DEFAULT 2,
    "totalRounds" INTEGER NOT NULL DEFAULT 10,
    "roundTimeSeconds" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLobby" (
    "id" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "topicId" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'adaptive',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "maxPlayers" INTEGER NOT NULL DEFAULT 2,
    "currentPlayers" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameLobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatch" (
    "id" TEXT NOT NULL,
    "gameModeId" TEXT,
    "gameLobbyId" TEXT,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "subjectId" TEXT,
    "subjectName" TEXT,
    "educationLevelId" TEXT,
    "level" TEXT,
    "pathway" TEXT,
    "topicId" TEXT,
    "topic" TEXT NOT NULL DEFAULT 'all',
    "difficulty" TEXT NOT NULL DEFAULT 'adaptive',
    "mode" TEXT NOT NULL DEFAULT 'quick',
    "totalRounds" INTEGER NOT NULL DEFAULT 10,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "player1Score" INTEGER NOT NULL DEFAULT 0,
    "player2Score" INTEGER NOT NULL DEFAULT 0,
    "player1Accuracy" INTEGER,
    "player2Accuracy" INTEGER,
    "result" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT,
    "gameLobbyId" TEXT,
    "userId" TEXT NOT NULL,
    "playerNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "questionId" TEXT,
    "player1Answer" TEXT,
    "player2Answer" TEXT,
    "player1Correct" BOOLEAN,
    "player2Correct" BOOLEAN,
    "player1TimeUsed" INTEGER,
    "player2TimeUsed" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAnswer" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "selectedAnswer" INTEGER,
    "answerText" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "timeUsed" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameScoreEvent" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT NOT NULL,
    "winnerId" TEXT,
    "loserId" TEXT,
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "player1FinalScore" INTEGER NOT NULL,
    "player2FinalScore" INTEGER,
    "player1Accuracy" INTEGER,
    "player2Accuracy" INTEGER,
    "totalRounds" INTEGER NOT NULL,
    "completedRounds" INTEGER NOT NULL,
    "resultType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameInvitation" (
    "id" TEXT NOT NULL,
    "gameLobbyId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "gameModeId" TEXT,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "winRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAchievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "descriptionRw" TEXT,
    "iconUrl" TEXT,
    "category" TEXT,
    "requirementType" TEXT NOT NULL,
    "requirementValue" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- SECTION 8: AI TUTOR AND LEARNING PROGRESS

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "title" TEXT,
    "conversationType" TEXT NOT NULL DEFAULT 'tutoring',
    "subjectId" TEXT,
    "topicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "aiConversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentEn" TEXT,
    "contentRw" TEXT,
    "tokensUsed" INTEGER,
    "modelUsed" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLearningPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningStyle" TEXT,
    "preferredPace" TEXT,
    "weakSubjects" JSONB,
    "strongSubjects" JSONB,
    "preferredTopics" JSONB,
    "studyGoals" JSONB,
    "aiTonePreference" TEXT NOT NULL DEFAULT 'friendly',
    "explanationDepth" TEXT NOT NULL DEFAULT 'detailed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiLearningPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLearningMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "memoryKey" TEXT NOT NULL,
    "memoryValue" TEXT NOT NULL,
    "subjectId" TEXT,
    "topicId" TEXT,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiLearningMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "pathType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPathItem" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPathItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "levelSubjectId" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "educationLevelId" TEXT,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalQuestionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "averageTimePerQuestion" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSkillMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "skillName" TEXT NOT NULL,
    "skillCategory" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "masteryLevel" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSkillMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionPlan" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "educationLevelId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionPlanItem" (
    "id" TEXT NOT NULL,
    "revisionPlanId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "activityType" TEXT NOT NULL,
    "subjectId" TEXT,
    "topicId" TEXT,
    "educationLevelId" TEXT,
    "activityId" TEXT,
    "activityTitle" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(5,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningActivityLog_pkey" PRIMARY KEY ("id")
);

-- SECTION 9: SUBSCRIPTIONS AND PAYMENTS

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "description" TEXT,
    "planType" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "priceAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "features" JSONB,
    "maxUsers" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "lastPaymentAt" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userSubscriptionId" TEXT,
    "subscriptionPlanId" TEXT,
    "transactionRef" TEXT NOT NULL,
    "providerRef" TEXT,
    "provider" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "paymentMethod" TEXT,
    "paymentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "refundRef" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "performedBy" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAuditLog_pkey" PRIMARY KEY ("id")
);

-- SECTION 10: NOTIFICATIONS AND COMMUNICATION

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageEn" TEXT,
    "messageRw" TEXT,
    "link" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "supportTicketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isStaffResponse" BOOLEAN NOT NULL DEFAULT false,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "reportType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "evidenceUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- SECTION 11: ADMINISTRATION AND PLATFORM AUDIT

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "creatorId" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "actorId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestData" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "settingValue" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "flagName" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER,
    "targetUserRoles" JSONB,
    "targetUserIds" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfiguration" (
    "id" TEXT NOT NULL,
    "integrationKey" TEXT NOT NULL,
    "integrationName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "configData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataImportJob" (
    "id" TEXT NOT NULL,
    "importType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "importedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "skippedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "fileUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_emailNormalized_idx" ON "User"("emailNormalized");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");
CREATE INDEX "OAuthAccount_provider_providerAccountId_idx" ON "OAuthAccount"("provider", "providerAccountId");

CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

CREATE UNIQUE INDEX "RoleDefinition_name_key" ON "RoleDefinition"("name");
CREATE INDEX "RoleDefinition_name_idx" ON "RoleDefinition"("name");

CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");
CREATE INDEX "Permission_name_idx" ON "Permission"("name");
CREATE INDEX "Permission_resource_action_idx" ON "Permission"("resource", "action");

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");
CREATE INDEX "Session_sid_idx" ON "Session"("sid");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

CREATE INDEX "LoginAuditLog_userId_idx" ON "LoginAuditLog"("userId");
CREATE INDEX "LoginAuditLog_email_idx" ON "LoginAuditLog"("email");
CREATE INDEX "LoginAuditLog_action_idx" ON "LoginAuditLog"("action");
CREATE INDEX "LoginAuditLog_createdAt_idx" ON "LoginAuditLog"("createdAt");
CREATE INDEX "LoginAuditLog_ipAddress_idx" ON "LoginAuditLog"("ipAddress");

CREATE UNIQUE INDEX "AccountInvitation_token_key" ON "AccountInvitation"("token");
CREATE INDEX "AccountInvitation_token_idx" ON "AccountInvitation"("token");
CREATE INDEX "AccountInvitation_email_idx" ON "AccountInvitation"("email");
CREATE INDEX "AccountInvitation_invitedBy_idx" ON "AccountInvitation"("invitedBy");
CREATE INDEX "AccountInvitation_status_idx" ON "AccountInvitation"("status");

CREATE UNIQUE INDEX "EducationLevel_code_key" ON "EducationLevel"("code");
CREATE INDEX "EducationLevel_code_idx" ON "EducationLevel"("code");
CREATE INDEX "EducationLevel_levelType_idx" ON "EducationLevel"("levelType");
CREATE INDEX "EducationLevel_isActive_idx" ON "EducationLevel"("isActive");

CREATE UNIQUE INDEX "AcademicYear_educationLevelId_name_key" ON "AcademicYear"("educationLevelId", "name");
CREATE INDEX "AcademicYear_educationLevelId_idx" ON "AcademicYear"("educationLevelId");
CREATE INDEX "AcademicYear_isCurrent_idx" ON "AcademicYear"("isCurrent");

CREATE INDEX "CurriculumVersion_academicYearId_idx" ON "CurriculumVersion"("academicYearId");
CREATE INDEX "CurriculumVersion_isOfficial_idx" ON "CurriculumVersion"("isOfficial");

CREATE INDEX "CurriculumSource_curriculumVersionId_idx" ON "CurriculumSource"("curriculumVersionId");
CREATE INDEX "CurriculumSource_verificationStatus_idx" ON "CurriculumSource"("verificationStatus");

CREATE UNIQUE INDEX "CurriculumProgramme_code_key" ON "CurriculumProgramme"("code");
CREATE INDEX "CurriculumProgramme_code_idx" ON "CurriculumProgramme"("code");
CREATE INDEX "CurriculumProgramme_educationLevelId_idx" ON "CurriculumProgramme"("educationLevelId");
CREATE INDEX "CurriculumProgramme_programmeType_idx" ON "CurriculumProgramme"("programmeType");

CREATE UNIQUE INDEX "CurriculumOption_code_key" ON "CurriculumOption"("code");
CREATE INDEX "CurriculumOption_code_idx" ON "CurriculumOption"("code");
CREATE INDEX "CurriculumOption_curriculumProgrammeId_idx" ON "CurriculumOption"("curriculumProgrammeId");

CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");
CREATE INDEX "Subject_code_idx" ON "Subject"("code");
CREATE INDEX "Subject_subjectType_idx" ON "Subject"("subjectType");
CREATE INDEX "Subject_isActive_idx" ON "Subject"("isActive");

CREATE UNIQUE INDEX "LevelSubject_educationLevelId_subjectId_academicYearId_key" ON "LevelSubject"("educationLevelId", "subjectId", "academicYearId");
CREATE INDEX "LevelSubject_educationLevelId_idx" ON "LevelSubject"("educationLevelId");
CREATE INDEX "LevelSubject_subjectId_idx" ON "LevelSubject"("subjectId");

CREATE UNIQUE INDEX "CurriculumTopic_curriculumVersionId_code_key" ON "CurriculumTopic"("curriculumVersionId", "code");
CREATE INDEX "CurriculumTopic_curriculumVersionId_idx" ON "CurriculumTopic"("curriculumVersionId");

CREATE UNIQUE INDEX "SubjectTopic_levelSubjectId_curriculumTopicId_key" ON "SubjectTopic"("levelSubjectId", "curriculumTopicId");
CREATE INDEX "SubjectTopic_levelSubjectId_idx" ON "SubjectTopic"("levelSubjectId");
CREATE INDEX "SubjectTopic_curriculumTopicId_idx" ON "SubjectTopic"("curriculumTopicId");

CREATE UNIQUE INDEX "CurriculumModule_curriculumVersionId_code_key" ON "CurriculumModule"("curriculumVersionId", "code");
CREATE INDEX "CurriculumModule_curriculumVersionId_idx" ON "CurriculumModule"("curriculumVersionId");
CREATE INDEX "CurriculumModule_moduleType_idx" ON "CurriculumModule"("moduleType");

CREATE UNIQUE INDEX "ModuleCompetency_curriculumModuleId_code_key" ON "ModuleCompetency"("curriculumModuleId", "code");
CREATE INDEX "ModuleCompetency_curriculumModuleId_idx" ON "ModuleCompetency"("curriculumModuleId");

CREATE INDEX "CurriculumImportJob_importStatus_idx" ON "CurriculumImportJob"("importStatus");
CREATE INDEX "CurriculumImportJob_startedAt_idx" ON "CurriculumImportJob"("startedAt");

CREATE INDEX "CurriculumChangeLog_curriculumSourceId_idx" ON "CurriculumChangeLog"("curriculumSourceId");
CREATE INDEX "CurriculumChangeLog_entityType_entityId_idx" ON "CurriculumChangeLog"("entityType", "entityId");
CREATE INDEX "CurriculumChangeLog_createdAt_idx" ON "CurriculumChangeLog"("createdAt");

CREATE UNIQUE INDEX "School_code_key" ON "School"("code");
CREATE INDEX "School_code_idx" ON "School"("code");
CREATE INDEX "School_schoolType_idx" ON "School"("schoolType");
CREATE INDEX "School_status_idx" ON "School"("status");
CREATE INDEX "School_isVerified_idx" ON "School"("isVerified");

CREATE UNIQUE INDEX "SchoolLocation_schoolId_key" ON "SchoolLocation"("schoolId");
CREATE INDEX "SchoolLocation_schoolId_idx" ON "SchoolLocation"("schoolId");
CREATE INDEX "SchoolLocation_district_idx" ON "SchoolLocation"("district");

CREATE INDEX "SchoolContact_schoolId_idx" ON "SchoolContact"("schoolId");
CREATE INDEX "SchoolContact_contactType_idx" ON "SchoolContact"("contactType");

CREATE UNIQUE INDEX "SchoolLevel_schoolId_educationLevelId_key" ON "SchoolLevel"("schoolId", "educationLevelId");
CREATE INDEX "SchoolLevel_schoolId_idx" ON "SchoolLevel"("schoolId");
CREATE INDEX "SchoolLevel_educationLevelId_idx" ON "SchoolLevel"("educationLevelId");

CREATE UNIQUE INDEX "SchoolSubject_schoolId_subjectId_key" ON "SchoolSubject"("schoolId", "subjectId");
CREATE INDEX "SchoolSubject_schoolId_idx" ON "SchoolSubject"("schoolId");
CREATE INDEX "SchoolSubject_subjectId_idx" ON "SchoolSubject"("subjectId");

CREATE UNIQUE INDEX "SchoolMembership_schoolId_userId_key" ON "SchoolMembership"("schoolId", "userId");
CREATE INDEX "SchoolMembership_schoolId_idx" ON "SchoolMembership"("schoolId");
CREATE INDEX "SchoolMembership_userId_idx" ON "SchoolMembership"("userId");
CREATE INDEX "SchoolMembership_role_idx" ON "SchoolMembership"("role");

CREATE INDEX "SchoolClaimRequest_schoolId_idx" ON "SchoolClaimRequest"("schoolId");
CREATE INDEX "SchoolClaimRequest_requestedBy_idx" ON "SchoolClaimRequest"("requestedBy");
CREATE INDEX "SchoolClaimRequest_status_idx" ON "SchoolClaimRequest"("status");

CREATE INDEX "SchoolVerificationRecord_schoolId_idx" ON "SchoolVerificationRecord"("schoolId");
CREATE INDEX "SchoolVerificationRecord_verifiedBy_idx" ON "SchoolVerificationRecord"("verifiedBy");
CREATE INDEX "SchoolVerificationRecord_status_idx" ON "SchoolVerificationRecord"("status");
CREATE INDEX "SchoolVerificationRecord_verifiedAt_idx" ON "SchoolVerificationRecord"("verifiedAt");

CREATE UNIQUE INDEX "SchoolStaffProfile_userId_key" ON "SchoolStaffProfile"("userId");
CREATE INDEX "SchoolStaffProfile_userId_idx" ON "SchoolStaffProfile"("userId");
CREATE INDEX "SchoolStaffProfile_schoolId_idx" ON "SchoolStaffProfile"("schoolId");

CREATE INDEX "TeacherQualification_schoolStaffProfileId_idx" ON "TeacherQualification"("schoolStaffProfileId");

CREATE INDEX "TeacherAssignment_schoolStaffProfileId_idx" ON "TeacherAssignment"("schoolStaffProfileId");
CREATE INDEX "TeacherAssignment_schoolId_idx" ON "TeacherAssignment"("schoolId");
CREATE INDEX "TeacherAssignment_subjectId_idx" ON "TeacherAssignment"("subjectId");
CREATE INDEX "TeacherAssignment_classId_idx" ON "TeacherAssignment"("classId");

CREATE INDEX "Class_schoolId_idx" ON "Class"("schoolId");
CREATE INDEX "Class_academicYearId_idx" ON "Class"("academicYearId");

CREATE UNIQUE INDEX "ClassMembership_classId_userId_key" ON "ClassMembership"("classId", "userId");
CREATE INDEX "ClassMembership_classId_idx" ON "ClassMembership"("classId");
CREATE INDEX "ClassMembership_userId_idx" ON "ClassMembership"("userId");

CREATE INDEX "SchoolAnnouncement_schoolId_idx" ON "SchoolAnnouncement"("schoolId");
CREATE INDEX "SchoolAnnouncement_priority_idx" ON "SchoolAnnouncement"("priority");
CREATE INDEX "SchoolAnnouncement_publishedAt_idx" ON "SchoolAnnouncement"("publishedAt");

CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE UNIQUE INDEX "StudentProfile_studentId_key" ON "StudentProfile"("studentId");
CREATE INDEX "StudentProfile_userId_idx" ON "StudentProfile"("userId");
CREATE INDEX "StudentProfile_studentId_idx" ON "StudentProfile"("studentId");

CREATE INDEX "StudentEnrollment_studentProfileId_idx" ON "StudentEnrollment"("studentProfileId");
CREATE INDEX "StudentEnrollment_schoolId_idx" ON "StudentEnrollment"("schoolId");
CREATE INDEX "StudentEnrollment_classId_idx" ON "StudentEnrollment"("classId");
CREATE INDEX "StudentEnrollment_educationLevelId_idx" ON "StudentEnrollment"("educationLevelId");
CREATE INDEX "StudentEnrollment_academicYearId_idx" ON "StudentEnrollment"("academicYearId");
CREATE INDEX "StudentEnrollment_status_idx" ON "StudentEnrollment"("status");

CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");
CREATE INDEX "ParentProfile_userId_idx" ON "ParentProfile"("userId");

CREATE UNIQUE INDEX "StudentGuardian_studentProfileId_parentProfileId_key" ON "StudentGuardian"("studentProfileId", "parentProfileId");
CREATE INDEX "StudentGuardian_studentProfileId_idx" ON "StudentGuardian"("studentProfileId");
CREATE INDEX "StudentGuardian_parentProfileId_idx" ON "StudentGuardian"("parentProfileId");
CREATE INDEX "StudentGuardian_isVerified_idx" ON "StudentGuardian"("isVerified");

CREATE UNIQUE INDEX "GuardianVerificationRequest_token_key" ON "GuardianVerificationRequest"("token");
CREATE INDEX "GuardianVerificationRequest_parentProfileId_idx" ON "GuardianVerificationRequest"("parentProfileId");
CREATE INDEX "GuardianVerificationRequest_studentProfileId_idx" ON "GuardianVerificationRequest"("studentProfileId");
CREATE INDEX "GuardianVerificationRequest_token_idx" ON "GuardianVerificationRequest"("token");
CREATE INDEX "GuardianVerificationRequest_status_idx" ON "GuardianVerificationRequest"("status");

CREATE UNIQUE INDEX "StudentLearningPreference_studentProfileId_key" ON "StudentLearningPreference"("studentProfileId");
CREATE INDEX "StudentLearningPreference_studentProfileId_idx" ON "StudentLearningPreference"("studentProfileId");

CREATE INDEX "StudentAcademicRecord_studentProfileId_idx" ON "StudentAcademicRecord"("studentProfileId");
CREATE INDEX "StudentAcademicRecord_recordType_idx" ON "StudentAcademicRecord"("recordType");
CREATE INDEX "StudentAcademicRecord_academicYearId_idx" ON "StudentAcademicRecord"("academicYearId");
CREATE INDEX "StudentAcademicRecord_subjectId_idx" ON "StudentAcademicRecord"("subjectId");

CREATE INDEX "ResourceCategory_isActive_idx" ON "ResourceCategory"("isActive");

CREATE INDEX "LearningResource_resourceCategoryId_idx" ON "LearningResource"("resourceCategoryId");
CREATE INDEX "LearningResource_resourceType_idx" ON "LearningResource"("resourceType");
CREATE INDEX "LearningResource_verificationStatus_idx" ON "LearningResource"("verificationStatus");
CREATE INDEX "LearningResource_isPublished_idx" ON "LearningResource"("isPublished");
CREATE INDEX "LearningResource_language_idx" ON "LearningResource"("language");

CREATE INDEX "ResourceCurriculumLink_learningResourceId_idx" ON "ResourceCurriculumLink"("learningResourceId");
CREATE INDEX "ResourceCurriculumLink_curriculumVersionId_idx" ON "ResourceCurriculumLink"("curriculumVersionId");
CREATE INDEX "ResourceCurriculumLink_educationLevelId_idx" ON "ResourceCurriculumLink"("educationLevelId");
CREATE INDEX "ResourceCurriculumLink_subjectId_idx" ON "ResourceCurriculumLink"("subjectId");

CREATE INDEX "ResourceFile_learningResourceId_idx" ON "ResourceFile"("learningResourceId");

CREATE INDEX "ResourceAuthor_learningResourceId_idx" ON "ResourceAuthor"("learningResourceId");

CREATE INDEX "ResourceReview_learningResourceId_idx" ON "ResourceReview"("learningResourceId");
CREATE INDEX "ResourceReview_reviewerId_idx" ON "ResourceReview"("reviewerId");
CREATE INDEX "ResourceReview_rating_idx" ON "ResourceReview"("rating");

CREATE INDEX "ResourcePublicationVersion_learningResourceId_idx" ON "ResourcePublicationVersion"("learningResourceId");
CREATE INDEX "ResourcePublicationVersion_version_idx" ON "ResourcePublicationVersion"("version");

CREATE INDEX "ResourceAccessLog_learningResourceId_idx" ON "ResourceAccessLog"("learningResourceId");
CREATE INDEX "ResourceAccessLog_userId_idx" ON "ResourceAccessLog"("userId");
CREATE INDEX "ResourceAccessLog_accessType_idx" ON "ResourceAccessLog"("accessType");
CREATE INDEX "ResourceAccessLog_accessedAt_idx" ON "ResourceAccessLog"("accessedAt");

CREATE UNIQUE INDEX "ResourceBookmark_learningResourceId_userId_key" ON "ResourceBookmark"("learningResourceId", "userId");
CREATE INDEX "ResourceBookmark_learningResourceId_idx" ON "ResourceBookmark"("learningResourceId");
CREATE INDEX "ResourceBookmark_userId_idx" ON "ResourceBookmark"("userId");

CREATE INDEX "StudentNote_studentProfileId_idx" ON "StudentNote"("studentProfileId");
CREATE INDEX "StudentNote_learningResourceId_idx" ON "StudentNote"("learningResourceId");
CREATE INDEX "StudentNote_noteType_idx" ON "StudentNote"("noteType");
CREATE INDEX "StudentNote_createdAt_idx" ON "StudentNote"("createdAt");

CREATE INDEX "QuestionBank_subjectId_idx" ON "QuestionBank"("subjectId");
CREATE INDEX "QuestionBank_level_idx" ON "QuestionBank"("level");
CREATE INDEX "QuestionBank_difficulty_idx" ON "QuestionBank"("difficulty");

CREATE INDEX "Question_questionBankId_idx" ON "Question"("questionBankId");
CREATE INDEX "Question_subjectTopicId_idx" ON "Question"("subjectTopicId");
CREATE INDEX "Question_questionType_idx" ON "Question"("questionType");
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");
CREATE INDEX "QuestionOption_optionOrder_idx" ON "QuestionOption"("optionOrder");

CREATE INDEX "QuestionCurriculumLink_questionId_idx" ON "QuestionCurriculumLink"("questionId");
CREATE INDEX "QuestionCurriculumLink_curriculumVersionId_idx" ON "QuestionCurriculumLink"("curriculumVersionId");
CREATE INDEX "QuestionCurriculumLink_educationLevelId_idx" ON "QuestionCurriculumLink"("educationLevelId");
CREATE INDEX "QuestionCurriculumLink_subjectId_idx" ON "QuestionCurriculumLink"("subjectId");

CREATE INDEX "QuestionExplanation_questionId_idx" ON "QuestionExplanation"("questionId");
CREATE INDEX "QuestionExplanation_language_idx" ON "QuestionExplanation"("language");

CREATE INDEX "Assessment_assessmentType_idx" ON "Assessment"("assessmentType");
CREATE INDEX "Assessment_subjectId_idx" ON "Assessment"("subjectId");
CREATE INDEX "Assessment_isPublished_idx" ON "Assessment"("isPublished");
CREATE INDEX "Assessment_startDate_idx" ON "Assessment"("startDate");

CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_questionId_key" ON "AssessmentQuestion"("assessmentId", "questionId");
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");
CREATE INDEX "AssessmentQuestion_questionId_idx" ON "AssessmentQuestion"("questionId");

CREATE INDEX "AssessmentAttempt_assessmentId_idx" ON "AssessmentAttempt"("assessmentId");
CREATE INDEX "AssessmentAttempt_studentProfileId_idx" ON "AssessmentAttempt"("studentProfileId");
CREATE INDEX "AssessmentAttempt_status_idx" ON "AssessmentAttempt"("status");
CREATE INDEX "AssessmentAttempt_startedAt_idx" ON "AssessmentAttempt"("startedAt");

CREATE INDEX "StudentAnswer_assessmentAttemptId_idx" ON "StudentAnswer"("assessmentAttemptId");
CREATE INDEX "StudentAnswer_questionId_idx" ON "StudentAnswer"("questionId");

CREATE INDEX "AssessmentResult_assessmentAttemptId_idx" ON "AssessmentResult"("assessmentAttemptId");
CREATE INDEX "AssessmentResult_grade_idx" ON "AssessmentResult"("grade");

CREATE INDEX "GradingRubric_subjectId_idx" ON "GradingRubric"("subjectId");
CREATE INDEX "GradingRubric_rubricType_idx" ON "GradingRubric"("rubricType");

CREATE INDEX "MarkingGuide_subjectId_idx" ON "MarkingGuide"("subjectId");
CREATE INDEX "MarkingGuide_verificationStatus_idx" ON "MarkingGuide"("verificationStatus");

CREATE INDEX "ExaminationPaper_examinationType_idx" ON "ExaminationPaper"("examinationType");
CREATE INDEX "ExaminationPaper_subjectId_idx" ON "ExaminationPaper"("subjectId");
CREATE INDEX "ExaminationPaper_educationLevelId_idx" ON "ExaminationPaper"("educationLevelId");
CREATE INDEX "ExaminationPaper_year_idx" ON "ExaminationPaper"("year");
CREATE INDEX "ExaminationPaper_verificationStatus_idx" ON "ExaminationPaper"("verificationStatus");

CREATE UNIQUE INDEX "GameMode_code_key" ON "GameMode"("code");
CREATE INDEX "GameMode_code_idx" ON "GameMode"("code");
CREATE INDEX "GameMode_gameType_idx" ON "GameMode"("gameType");
CREATE INDEX "GameMode_isActive_idx" ON "GameMode"("isActive");

CREATE INDEX "GameLobby_gameModeId_idx" ON "GameLobby"("gameModeId");
CREATE INDEX "GameLobby_hostId_idx" ON "GameLobby"("hostId");
CREATE INDEX "GameLobby_status_idx" ON "GameLobby"("status");
CREATE INDEX "GameLobby_createdAt_idx" ON "GameLobby"("createdAt");

CREATE INDEX "GameMatch_gameModeId_idx" ON "GameMatch"("gameModeId");
CREATE INDEX "GameMatch_gameLobbyId_idx" ON "GameMatch"("gameLobbyId");
CREATE INDEX "GameMatch_player1Id_idx" ON "GameMatch"("player1Id");
CREATE INDEX "GameMatch_player2Id_idx" ON "GameMatch"("player2Id");
CREATE INDEX "GameMatch_subjectId_idx" ON "GameMatch"("subjectId");
CREATE INDEX "GameMatch_status_idx" ON "GameMatch"("status");
CREATE INDEX "GameMatch_startedAt_idx" ON "GameMatch"("startedAt");

CREATE INDEX "GamePlayer_gameMatchId_idx" ON "GamePlayer"("gameMatchId");
CREATE INDEX "GamePlayer_gameLobbyId_idx" ON "GamePlayer"("gameLobbyId");
CREATE INDEX "GamePlayer_userId_idx" ON "GamePlayer"("userId");

CREATE UNIQUE INDEX "GameRound_gameMatchId_roundNumber_key" ON "GameRound"("gameMatchId", "roundNumber");
CREATE INDEX "GameRound_gameMatchId_idx" ON "GameRound"("gameMatchId");

CREATE INDEX "GameQuestion_gameMatchId_idx" ON "GameQuestion"("gameMatchId");
CREATE INDEX "GameQuestion_questionId_idx" ON "GameQuestion"("questionId");
CREATE INDEX "GameQuestion_roundNumber_idx" ON "GameQuestion"("roundNumber");

CREATE INDEX "GameAnswer_gameMatchId_idx" ON "GameAnswer"("gameMatchId");
CREATE INDEX "GameAnswer_userId_idx" ON "GameAnswer"("userId");
CREATE INDEX "GameAnswer_questionId_idx" ON "GameAnswer"("questionId");
CREATE INDEX "GameAnswer_roundNumber_idx" ON "GameAnswer"("roundNumber");

CREATE INDEX "GameScoreEvent_gameMatchId_idx" ON "GameScoreEvent"("gameMatchId");
CREATE INDEX "GameScoreEvent_userId_idx" ON "GameScoreEvent"("userId");
CREATE INDEX "GameScoreEvent_roundNumber_idx" ON "GameScoreEvent"("roundNumber");
CREATE INDEX "GameScoreEvent_eventType_idx" ON "GameScoreEvent"("eventType");

CREATE INDEX "GameResult_gameMatchId_idx" ON "GameResult"("gameMatchId");
CREATE INDEX "GameResult_winnerId_idx" ON "GameResult"("winnerId");
CREATE INDEX "GameResult_resultType_idx" ON "GameResult"("resultType");

CREATE INDEX "GameInvitation_gameLobbyId_idx" ON "GameInvitation"("gameLobbyId");
CREATE INDEX "GameInvitation_senderId_idx" ON "GameInvitation"("senderId");
CREATE INDEX "GameInvitation_recipientId_idx" ON "GameInvitation"("recipientId");
CREATE INDEX "GameInvitation_status_idx" ON "GameInvitation"("status");

CREATE INDEX "GameLeaderboardSnapshot_userId_idx" ON "GameLeaderboardSnapshot"("userId");
CREATE INDEX "GameLeaderboardSnapshot_subjectId_idx" ON "GameLeaderboardSnapshot"("subjectId");
CREATE INDEX "GameLeaderboardSnapshot_educationLevelId_idx" ON "GameLeaderboardSnapshot"("educationLevelId");
CREATE INDEX "GameLeaderboardSnapshot_totalXp_idx" ON "GameLeaderboardSnapshot"("totalXp");
CREATE INDEX "GameLeaderboardSnapshot_rank_idx" ON "GameLeaderboardSnapshot"("rank");
CREATE INDEX "GameLeaderboardSnapshot_snapshotDate_idx" ON "GameLeaderboardSnapshot"("snapshotDate");

CREATE UNIQUE INDEX "GameAchievement_code_key" ON "GameAchievement"("code");
CREATE INDEX "GameAchievement_code_idx" ON "GameAchievement"("code");
CREATE INDEX "GameAchievement_category_idx" ON "GameAchievement"("category");
CREATE INDEX "GameAchievement_isActive_idx" ON "GameAchievement"("isActive");

CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");
CREATE INDEX "UserAchievement_isCompleted_idx" ON "UserAchievement"("isCompleted");

CREATE INDEX "AiConversation_userId_idx" ON "AiConversation"("userId");
CREATE INDEX "AiConversation_studentProfileId_idx" ON "AiConversation"("studentProfileId");
CREATE INDEX "AiConversation_status_idx" ON "AiConversation"("status");
CREATE INDEX "AiConversation_lastMessageAt_idx" ON "AiConversation"("lastMessageAt");

CREATE INDEX "AiMessage_aiConversationId_idx" ON "AiMessage"("aiConversationId");
CREATE INDEX "AiMessage_role_idx" ON "AiMessage"("role");
CREATE INDEX "AiMessage_createdAt_idx" ON "AiMessage"("createdAt");

CREATE UNIQUE INDEX "AiLearningPreference_userId_key" ON "AiLearningPreference"("userId");
CREATE INDEX "AiLearningPreference_userId_idx" ON "AiLearningPreference"("userId");

CREATE INDEX "AiLearningMemory_userId_idx" ON "AiLearningMemory"("userId");
CREATE INDEX "AiLearningMemory_memoryType_idx" ON "AiLearningMemory"("memoryType");
CREATE INDEX "AiLearningMemory_memoryKey_idx" ON "AiLearningMemory"("memoryKey");
CREATE INDEX "AiLearningMemory_subjectId_idx" ON "AiLearningMemory"("subjectId");
CREATE INDEX "AiLearningMemory_isActive_idx" ON "AiLearningMemory"("isActive");

CREATE INDEX "LearningPath_studentProfileId_idx" ON "LearningPath"("studentProfileId");
CREATE INDEX "LearningPath_subjectId_idx" ON "LearningPath"("subjectId");
CREATE INDEX "LearningPath_status_idx" ON "LearningPath"("status");

CREATE INDEX "LearningPathItem_learningPathId_idx" ON "LearningPathItem"("learningPathId");
CREATE INDEX "LearningPathItem_itemType_idx" ON "LearningPathItem"("itemType");
CREATE INDEX "LearningPathItem_isCompleted_idx" ON "LearningPathItem"("isCompleted");

CREATE INDEX "StudentProgress_userId_idx" ON "StudentProgress"("userId");
CREATE INDEX "StudentProgress_studentProfileId_idx" ON "StudentProgress"("studentProfileId");
CREATE INDEX "StudentProgress_subjectId_idx" ON "StudentProgress"("subjectId");
CREATE INDEX "StudentProgress_totalXp_idx" ON "StudentProgress"("totalXp");
CREATE INDEX "StudentProgress_lastActivityAt_idx" ON "StudentProgress"("lastActivityAt");

CREATE INDEX "StudentSkillMastery_userId_idx" ON "StudentSkillMastery"("userId");
CREATE INDEX "StudentSkillMastery_studentProfileId_idx" ON "StudentSkillMastery"("studentProfileId");
CREATE INDEX "StudentSkillMastery_skillName_idx" ON "StudentSkillMastery"("skillName");
CREATE INDEX "StudentSkillMastery_subjectId_idx" ON "StudentSkillMastery"("subjectId");
CREATE INDEX "StudentSkillMastery_masteryLevel_idx" ON "StudentSkillMastery"("masteryLevel");

CREATE INDEX "RevisionPlan_studentProfileId_idx" ON "RevisionPlan"("studentProfileId");
CREATE INDEX "RevisionPlan_subjectId_idx" ON "RevisionPlan"("subjectId");
CREATE INDEX "RevisionPlan_status_idx" ON "RevisionPlan"("status");

CREATE INDEX "RevisionPlanItem_revisionPlanId_idx" ON "RevisionPlanItem"("revisionPlanId");
CREATE INDEX "RevisionPlanItem_scheduledDate_idx" ON "RevisionPlanItem"("scheduledDate");
CREATE INDEX "RevisionPlanItem_isCompleted_idx" ON "RevisionPlanItem"("isCompleted");

CREATE INDEX "LearningActivityLog_userId_idx" ON "LearningActivityLog"("userId");
CREATE INDEX "LearningActivityLog_studentProfileId_idx" ON "LearningActivityLog"("studentProfileId");
CREATE INDEX "LearningActivityLog_activityType_idx" ON "LearningActivityLog"("activityType");
CREATE INDEX "LearningActivityLog_subjectId_idx" ON "LearningActivityLog"("subjectId");
CREATE INDEX "LearningActivityLog_createdAt_idx" ON "LearningActivityLog"("createdAt");

CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE INDEX "SubscriptionPlan_code_idx" ON "SubscriptionPlan"("code");
CREATE INDEX "SubscriptionPlan_planType_idx" ON "SubscriptionPlan"("planType");
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");

CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");
CREATE INDEX "UserSubscription_subscriptionPlanId_idx" ON "UserSubscription"("subscriptionPlanId");
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");
CREATE INDEX "UserSubscription_endDate_idx" ON "UserSubscription"("endDate");

CREATE UNIQUE INDEX "PaymentTransaction_transactionRef_key" ON "PaymentTransaction"("transactionRef");
CREATE INDEX "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");
CREATE INDEX "PaymentTransaction_transactionRef_idx" ON "PaymentTransaction"("transactionRef");
CREATE INDEX "PaymentTransaction_providerRef_idx" ON "PaymentTransaction"("providerRef");
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

CREATE UNIQUE INDEX "PaymentProviderEvent_eventId_key" ON "PaymentProviderEvent"("eventId");
CREATE INDEX "PaymentProviderEvent_paymentTransactionId_idx" ON "PaymentProviderEvent"("paymentTransactionId");
CREATE INDEX "PaymentProviderEvent_eventId_idx" ON "PaymentProviderEvent"("eventId");
CREATE INDEX "PaymentProviderEvent_eventType_idx" ON "PaymentProviderEvent"("eventType");

CREATE UNIQUE INDEX "PaymentRefund_refundRef_key" ON "PaymentRefund"("refundRef");
CREATE INDEX "PaymentRefund_paymentTransactionId_idx" ON "PaymentRefund"("paymentTransactionId");
CREATE INDEX "PaymentRefund_refundRef_idx" ON "PaymentRefund"("refundRef");
CREATE INDEX "PaymentRefund_status_idx" ON "PaymentRefund"("status");

CREATE INDEX "BillingAuditLog_userId_idx" ON "BillingAuditLog"("userId");
CREATE INDEX "BillingAuditLog_action_idx" ON "BillingAuditLog"("action");
CREATE INDEX "BillingAuditLog_entityType_idx" ON "BillingAuditLog"("entityType");
CREATE INDEX "BillingAuditLog_createdAt_idx" ON "BillingAuditLog"("createdAt");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE UNIQUE INDEX "NotificationPreference_userId_notificationType_channel_key" ON "NotificationPreference"("userId", "notificationType", "channel");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");
CREATE INDEX "NotificationDelivery_channel_idx" ON "NotificationDelivery"("channel");
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

CREATE INDEX "SupportTicketMessage_supportTicketId_idx" ON "SupportTicketMessage"("supportTicketId");
CREATE INDEX "SupportTicketMessage_userId_idx" ON "SupportTicketMessage"("userId");
CREATE INDEX "SupportTicketMessage_createdAt_idx" ON "SupportTicketMessage"("createdAt");

CREATE INDEX "UserReport_reporterId_idx" ON "UserReport"("reporterId");
CREATE INDEX "UserReport_reportedUserId_idx" ON "UserReport"("reportedUserId");
CREATE INDEX "UserReport_reportType_idx" ON "UserReport"("reportType");
CREATE INDEX "UserReport_status_idx" ON "UserReport"("status");
CREATE INDEX "UserReport_createdAt_idx" ON "UserReport"("createdAt");

CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_creatorId_idx" ON "AuditLog"("creatorId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_entityType_idx" ON "AdminAuditLog"("entityType");
CREATE INDEX "AdminAuditLog_actorId_idx" ON "AdminAuditLog"("actorId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

CREATE INDEX "AdminApprovalRequest_requestType_idx" ON "AdminApprovalRequest"("requestType");
CREATE INDEX "AdminApprovalRequest_entityType_idx" ON "AdminApprovalRequest"("entityType");
CREATE INDEX "AdminApprovalRequest_requestedBy_idx" ON "AdminApprovalRequest"("requestedBy");
CREATE INDEX "AdminApprovalRequest_status_idx" ON "AdminApprovalRequest"("status");
CREATE INDEX "AdminApprovalRequest_createdAt_idx" ON "AdminApprovalRequest"("createdAt");

CREATE UNIQUE INDEX "SystemSetting_settingKey_key" ON "SystemSetting"("settingKey");
CREATE INDEX "SystemSetting_settingKey_idx" ON "SystemSetting"("settingKey");

CREATE UNIQUE INDEX "FeatureFlag_flagKey_key" ON "FeatureFlag"("flagKey");
CREATE INDEX "FeatureFlag_flagKey_idx" ON "FeatureFlag"("flagKey");
CREATE INDEX "FeatureFlag_isEnabled_idx" ON "FeatureFlag"("isEnabled");

CREATE UNIQUE INDEX "IntegrationConfiguration_integrationKey_key" ON "IntegrationConfiguration"("integrationKey");
CREATE INDEX "IntegrationConfiguration_integrationKey_idx" ON "IntegrationConfiguration"("integrationKey");
CREATE INDEX "IntegrationConfiguration_provider_idx" ON "IntegrationConfiguration"("provider");
CREATE INDEX "IntegrationConfiguration_isActive_idx" ON "IntegrationConfiguration"("isActive");

CREATE INDEX "BackgroundJob_jobType_idx" ON "BackgroundJob"("jobType");
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");
CREATE INDEX "BackgroundJob_scheduledAt_idx" ON "BackgroundJob"("scheduledAt");
CREATE INDEX "BackgroundJob_priority_idx" ON "BackgroundJob"("priority");

CREATE INDEX "DataImportJob_importType_idx" ON "DataImportJob"("importType");
CREATE INDEX "DataImportJob_status_idx" ON "DataImportJob"("status");
CREATE INDEX "DataImportJob_startedAt_idx" ON "DataImportJob"("startedAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginAuditLog" ADD CONSTRAINT "LoginAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_email_fkey" FOREIGN KEY ("email") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Continue with remaining foreign keys for all sections
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumSource" ADD CONSTRAINT "CurriculumSource_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumProgramme" ADD CONSTRAINT "CurriculumProgramme_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumOption" ADD CONSTRAINT "CurriculumOption_curriculumProgrammeId_fkey" FOREIGN KEY ("curriculumProgrammeId") REFERENCES "CurriculumProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LevelSubject" ADD CONSTRAINT "LevelSubject_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LevelSubject" ADD CONSTRAINT "LevelSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LevelSubject" ADD CONSTRAINT "LevelSubject_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CurriculumTopic" ADD CONSTRAINT "CurriculumTopic_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubjectTopic" ADD CONSTRAINT "SubjectTopic_levelSubjectId_fkey" FOREIGN KEY ("levelSubjectId") REFERENCES "LevelSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubjectTopic" ADD CONSTRAINT "SubjectTopic_curriculumTopicId_fkey" FOREIGN KEY ("curriculumTopicId") REFERENCES "CurriculumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumModule" ADD CONSTRAINT "CurriculumModule_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModuleCompetency" ADD CONSTRAINT "ModuleCompetency_curriculumModuleId_fkey" FOREIGN KEY ("curriculumModuleId") REFERENCES "CurriculumModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumChangeLog" ADD CONSTRAINT "CurriculumChangeLog_curriculumSourceId_fkey" FOREIGN KEY ("curriculumSourceId") REFERENCES "CurriculumSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolLocation" ADD CONSTRAINT "SchoolLocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolContact" ADD CONSTRAINT "SchoolContact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolLevel" ADD CONSTRAINT "SchoolLevel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolLevel" ADD CONSTRAINT "SchoolLevel_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolSubject" ADD CONSTRAINT "SchoolSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolSubject" ADD CONSTRAINT "SchoolSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClaimRequest" ADD CONSTRAINT "SchoolClaimRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClaimRequest" ADD CONSTRAINT "SchoolClaimRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolVerificationRecord" ADD CONSTRAINT "SchoolVerificationRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolVerificationRecord" ADD CONSTRAINT "SchoolVerificationRecord_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolStaffProfile" ADD CONSTRAINT "SchoolStaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherQualification" ADD CONSTRAINT "TeacherQualification_schoolStaffProfileId_fkey" FOREIGN KEY ("schoolStaffProfileId") REFERENCES "SchoolStaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_schoolStaffProfileId_fkey" FOREIGN KEY ("schoolStaffProfileId") REFERENCES "SchoolStaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolAnnouncement" ADD CONSTRAINT "SchoolAnnouncement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_curriculumProgrammeId_fkey" FOREIGN KEY ("curriculumProgrammeId") REFERENCES "CurriculumProgramme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_curriculumOptionId_fkey" FOREIGN KEY ("curriculumOptionId") REFERENCES "CurriculumOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuardianVerificationRequest" ADD CONSTRAINT "GuardianVerificationRequest_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentLearningPreference" ADD CONSTRAINT "StudentLearningPreference_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAcademicRecord" ADD CONSTRAINT "StudentAcademicRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_resourceCategoryId_fkey" FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceCurriculumLink" ADD CONSTRAINT "ResourceCurriculumLink_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceCurriculumLink" ADD CONSTRAINT "ResourceCurriculumLink_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceCurriculumLink" ADD CONSTRAINT "ResourceCurriculumLink_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceCurriculumLink" ADD CONSTRAINT "ResourceCurriculumLink_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceCurriculumLink" ADD CONSTRAINT "ResourceCurriculumLink_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CurriculumTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceFile" ADD CONSTRAINT "ResourceFile_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceAuthor" ADD CONSTRAINT "ResourceAuthor_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceReview" ADD CONSTRAINT "ResourceReview_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourcePublicationVersion" ADD CONSTRAINT "ResourcePublicationVersion_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceAccessLog" ADD CONSTRAINT "ResourceAccessLog_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceBookmark" ADD CONSTRAINT "ResourceBookmark_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectTopicId_fkey" FOREIGN KEY ("subjectTopicId") REFERENCES "SubjectTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionCurriculumLink" ADD CONSTRAINT "QuestionCurriculumLink_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionCurriculumLink" ADD CONSTRAINT "QuestionCurriculumLink_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionCurriculumLink" ADD CONSTRAINT "QuestionCurriculumLink_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionCurriculumLink" ADD CONSTRAINT "QuestionCurriculumLink_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CurriculumTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionExplanation" ADD CONSTRAINT "QuestionExplanation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_assessmentAttemptId_fkey" FOREIGN KEY ("assessmentAttemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_assessmentAttemptId_fkey" FOREIGN KEY ("assessmentAttemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameLobby" ADD CONSTRAINT "GameLobby_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "GameMode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "GameMode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_gameLobbyId_fkey" FOREIGN KEY ("gameLobbyId") REFERENCES "GameLobby"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_gameLobbyId_fkey" FOREIGN KEY ("gameLobbyId") REFERENCES "GameLobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAnswer" ADD CONSTRAINT "GameAnswer_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAnswer" ADD CONSTRAINT "GameAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameInvitation" ADD CONSTRAINT "GameInvitation_gameLobbyId_fkey" FOREIGN KEY ("gameLobbyId") REFERENCES "GameLobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameInvitation" ADD CONSTRAINT "GameInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameInvitation" ADD CONSTRAINT "GameInvitation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "GameAchievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_aiConversationId_fkey" FOREIGN KEY ("aiConversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPathItem" ADD CONSTRAINT "LearningPathItem_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_levelSubjectId_fkey" FOREIGN KEY ("levelSubjectId") REFERENCES "LevelSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentSkillMastery" ADD CONSTRAINT "StudentSkillMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSkillMastery" ADD CONSTRAINT "StudentSkillMastery_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RevisionPlan" ADD CONSTRAINT "RevisionPlan_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevisionPlanItem" ADD CONSTRAINT "RevisionPlanItem_revisionPlanId_fkey" FOREIGN KEY ("revisionPlanId") REFERENCES "RevisionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningActivityLog" ADD CONSTRAINT "LearningActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentProviderEvent" ADD CONSTRAINT "PaymentProviderEvent_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminApprovalRequest" ADD CONSTRAINT "AdminApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminApprovalRequest" ADD CONSTRAINT "AdminApprovalRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
