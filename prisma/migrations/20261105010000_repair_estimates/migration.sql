-- ATP-38: repair estimates linked to vehicles (separate from Maintenance).

CREATE TYPE "RepairEstimateStatus" AS ENUM ('DRAFT', 'FINALIZED', 'ARCHIVED');

CREATE TYPE "RepairEstimateItemCategory" AS ENUM ('PART', 'LABOR');

CREATE TABLE "RepairEstimate" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "RepairEstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairEstimate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RepairEstimateItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RepairEstimateItemCategory" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairEstimateItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepairEstimate_vehicleId_idx" ON "RepairEstimate"("vehicleId");

CREATE INDEX "RepairEstimate_status_idx" ON "RepairEstimate"("status");

CREATE INDEX "RepairEstimateItem_estimateId_idx" ON "RepairEstimateItem"("estimateId");

ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepairEstimateItem" ADD CONSTRAINT "RepairEstimateItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "RepairEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
