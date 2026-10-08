-- AlterTable
ALTER TABLE "User" ADD COLUMN "cnh" TEXT;
ALTER TABLE "User" ADD COLUMN "document" TEXT;
ALTER TABLE "User" ADD COLUMN "documentType" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_cnh_key" ON "User"("cnh");

-- CreateIndex
CREATE UNIQUE INDEX "User_document_key" ON "User"("document");
