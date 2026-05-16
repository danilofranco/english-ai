-- AlterTable
ALTER TABLE "LearningContent" ADD COLUMN "folderPath" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "LearningContent_folderPath_idx" ON "LearningContent"("folderPath");
