-- Align Maintenance columns with the public English API contract (ATP-28).
ALTER TABLE "Maintenance" RENAME COLUMN "tipo" TO "type";
ALTER TABLE "Maintenance" RENAME COLUMN "descricao" TO "description";
ALTER TABLE "Maintenance" RENAME COLUMN "data" TO "serviceDate";
ALTER TABLE "Maintenance" RENAME COLUMN "quilometragem" TO "odometerKm";

ALTER TABLE "Maintenance" ADD COLUMN "costCents" INTEGER;
UPDATE "Maintenance"
SET "costCents" = ROUND(("custo")::numeric * 100)::integer
WHERE "custo" IS NOT NULL;
ALTER TABLE "Maintenance" DROP COLUMN "custo";

ALTER TABLE "Maintenance" ADD COLUMN "workshopName" TEXT;
ALTER TABLE "Maintenance" ADD COLUMN "notes" TEXT;
