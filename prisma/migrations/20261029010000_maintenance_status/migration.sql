-- ATP-39: kanban status for maintenance/repair tracking.
-- Historical rows default to DONE (completed service), never reclassified as pending.

CREATE TYPE "MaintenanceStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- Backfill histórico como DONE; default de novas linhas = TODO.
ALTER TABLE "Maintenance"
ADD COLUMN "status" "MaintenanceStatus" NOT NULL DEFAULT 'DONE';

ALTER TABLE "Maintenance"
ALTER COLUMN "status" SET DEFAULT 'TODO';

CREATE INDEX "Maintenance_status_idx" ON "Maintenance"("status");
