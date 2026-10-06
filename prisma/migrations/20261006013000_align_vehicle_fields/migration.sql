-- Align Vehicle columns with the public English API contract (ATP-26).
ALTER TABLE "Vehicle" RENAME COLUMN "marca" TO "brand";
ALTER TABLE "Vehicle" RENAME COLUMN "modelo" TO "model";
ALTER TABLE "Vehicle" RENAME COLUMN "ano" TO "year";
ALTER TABLE "Vehicle" RENAME COLUMN "placa" TO "licensePlate";

ALTER TABLE "Vehicle" ADD COLUMN "version" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "color" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "fuelType" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "odometerKm" INTEGER;
