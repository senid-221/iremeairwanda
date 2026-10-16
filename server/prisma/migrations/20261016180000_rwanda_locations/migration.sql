-- Create Rwanda administrative location tables
-- Provinces, Districts, Sectors, Cells, Villages

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "provinceId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "districtId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cell" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "sectorId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRw" TEXT,
    "cellId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- Add FK columns to UserProfile
ALTER TABLE "UserProfile" ADD COLUMN "provinceId" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "districtId" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "sectorId" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "cellId" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "villageId" TEXT;

-- Add FK columns to SchoolLocation
ALTER TABLE "SchoolLocation" ADD COLUMN "provinceId" TEXT;
ALTER TABLE "SchoolLocation" ADD COLUMN "districtId" TEXT;
ALTER TABLE "SchoolLocation" ADD COLUMN "sectorId" TEXT;
ALTER TABLE "SchoolLocation" ADD COLUMN "cellId" TEXT;
ALTER TABLE "SchoolLocation" ADD COLUMN "villageId" TEXT;

-- CreateIndex (unique codes)
CREATE UNIQUE INDEX "Province_code_key" ON "Province"("code");
CREATE UNIQUE INDEX "District_code_key" ON "District"("code");
CREATE UNIQUE INDEX "Sector_code_key" ON "Sector"("code");
CREATE UNIQUE INDEX "Cell_code_key" ON "Cell"("code");
CREATE UNIQUE INDEX "Village_code_key" ON "Village"("code");

-- CreateIndex (foreign key lookups)
CREATE INDEX "District_provinceId_idx" ON "District"("provinceId");
CREATE INDEX "Sector_districtId_idx" ON "Sector"("districtId");
CREATE INDEX "Cell_sectorId_idx" ON "Cell"("sectorId");
CREATE INDEX "Village_cellId_idx" ON "Village"("cellId");

-- CreateIndex (UserProfile FK indexes)
CREATE INDEX "UserProfile_provinceId_idx" ON "UserProfile"("provinceId");
CREATE INDEX "UserProfile_districtId_idx" ON "UserProfile"("districtId");

-- CreateIndex (SchoolLocation FK indexes)
CREATE INDEX "SchoolLocation_provinceId_idx" ON "SchoolLocation"("provinceId");
CREATE INDEX "SchoolLocation_districtId_idx" ON "SchoolLocation"("districtId");

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Village" ADD CONSTRAINT "Village_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (UserProfile)
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (SchoolLocation)
ALTER TABLE "SchoolLocation" ADD CONSTRAINT "SchoolLocation_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolLocation" ADD CONSTRAINT "SchoolLocation_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolLocation" ADD CONSTRAINT "SchoolLocation_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolLocation" ADD CONSTRAINT "SchoolLocation_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolLocation" ADD CONSTRAINT "SchoolLocation_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;
