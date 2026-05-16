-- CreateTable
CREATE TABLE "CurriculumMonth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL DEFAULT 4,
    "targetBand" TEXT,
    "learnerJson" TEXT,
    "designNotesJson" TEXT,
    "rubricTemplatesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CurriculumMission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionKey" TEXT NOT NULL,
    "curriculumMonthId" TEXT NOT NULL,
    "practiceTaskId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "orderInWeek" INTEGER NOT NULL,
    "weekSlug" TEXT NOT NULL DEFAULT '',
    "weekTitle" TEXT NOT NULL DEFAULT '',
    "learningObjective" TEXT NOT NULL DEFAULT '',
    "targetCEFR" TEXT NOT NULL DEFAULT '',
    "scenario" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL DEFAULT '',
    "timeTargetSec" INTEGER NOT NULL DEFAULT 90,
    "passOverallThreshold" INTEGER NOT NULL DEFAULT 60,
    "requiredElementsJson" TEXT NOT NULL DEFAULT '[]',
    "usefulPhrasesJson" TEXT NOT NULL DEFAULT '[]',
    "successCriteriaJson" TEXT NOT NULL DEFAULT '[]',
    "reviewDrillsJson" TEXT NOT NULL DEFAULT '[]',
    "evaluationWeightsJson" TEXT NOT NULL DEFAULT '{}',
    "modelAnswer" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CurriculumMission_curriculumMonthId_fkey" FOREIGN KEY ("curriculumMonthId") REFERENCES "CurriculumMonth" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumMission_practiceTaskId_fkey" FOREIGN KEY ("practiceTaskId") REFERENCES "PracticeTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumMonth_monthKey_key" ON "CurriculumMonth"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumMission_missionKey_key" ON "CurriculumMission"("missionKey");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumMission_practiceTaskId_key" ON "CurriculumMission"("practiceTaskId");

-- CreateIndex
CREATE INDEX "CurriculumMission_curriculumMonthId_weekNumber_orderInWeek_idx" ON "CurriculumMission"("curriculumMonthId", "weekNumber", "orderInWeek");

-- AlterTable Evaluation
ALTER TABLE "Evaluation" ADD COLUMN "curriculumMissionKey" TEXT;

-- AlterTable Evaluation
ALTER TABLE "Evaluation" ADD COLUMN "feedbackJson" TEXT;

-- AlterTable ReviewItem
ALTER TABLE "ReviewItem" ADD COLUMN "drillId" TEXT;

-- AlterTable ReviewItem
ALTER TABLE "ReviewItem" ADD COLUMN "drillType" TEXT;

-- AlterTable ReviewItem
ALTER TABLE "ReviewItem" ADD COLUMN "drillTitle" TEXT;

-- AlterTable ReviewItem
ALTER TABLE "ReviewItem" ADD COLUMN "drillInstructions" TEXT;
