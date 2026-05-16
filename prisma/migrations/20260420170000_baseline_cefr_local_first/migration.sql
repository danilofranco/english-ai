-- Baseline: local-first CEFR + practice (replaces prior migrations)

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "PracticeTaskContent";
DROP TABLE IF EXISTS "LearningPathStep";
DROP TABLE IF EXISTS "LearningPath";
DROP TABLE IF EXISTS "Evaluation";
DROP TABLE IF EXISTS "Attempt";
DROP TABLE IF EXISTS "PracticeTask";
DROP TABLE IF EXISTS "LearningContent";
DROP TABLE IF EXISTS "ReviewItem";
DROP TABLE IF EXISTS "UserProgressSnapshot";
DROP TABLE IF EXISTS "ContentItem";
DROP TABLE IF EXISTS "VoiceMessage";
DROP TABLE IF EXISTS "VoiceSession";
DROP TABLE IF EXISTS "EvaluationResult";
DROP TABLE IF EXISTS "EvaluationQuestion";
DROP TABLE IF EXISTS "Flashcard";
DROP TABLE IF EXISTS "VocabularyItem";
DROP TABLE IF EXISTS "StudySession";
DROP TABLE IF EXISTS "DiagnosticResult";
DROP TABLE IF EXISTS "Goal";
DROP TABLE IF EXISTS "Note";
DROP TABLE IF EXISTS "Tag";
DROP TABLE IF EXISTS "LessonContent";
DROP TABLE IF EXISTS "ContentSource";
DROP TABLE IF EXISTS "Unit";
DROP TABLE IF EXISTS "Module";
DROP TABLE IF EXISTS "Progress";
DROP TABLE IF EXISTS "Lesson";
DROP TABLE IF EXISTS "ChatSession";
DROP TABLE IF EXISTS "Grammar";
DROP TABLE IF EXISTS "UserVocabulary";
DROP TABLE IF EXISTS "Vocabulary";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "Level";

PRAGMA foreign_keys=ON;

CREATE TABLE "Level" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedCapabilities" TEXT NOT NULL,
    "expectedSkills" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "levelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "LearningContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "cefrLevelId" TEXT,
    "skillType" TEXT,
    "topic" TEXT,
    "source" TEXT,
    "sourceType" TEXT,
    "localPath" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "difficulty" TEXT,
    "estimatedMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningContent_cefrLevelId_fkey" FOREIGN KEY ("cefrLevelId") REFERENCES "Level" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LearningContent_localPath_key" ON "LearningContent"("localPath");

CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "levelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningPath_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LearningPathStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learningPathId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningPathStep_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LearningPathStep_learningPathId_order_idx" ON "LearningPathStep"("learningPathId", "order");

CREATE TABLE "PracticeTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "cefrLevelId" TEXT NOT NULL,
    "skillType" TEXT NOT NULL,
    "scenarioType" TEXT NOT NULL DEFAULT 'general_fluency',
    "category" TEXT NOT NULL,
    "estimatedDurationSec" INTEGER NOT NULL DEFAULT 120,
    "expectedOutputType" TEXT NOT NULL DEFAULT 'spoken_monologue',
    "evaluationRubric" TEXT,
    "promptTemplate" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PracticeTask_cefrLevelId_fkey" FOREIGN KEY ("cefrLevelId") REFERENCES "Level" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PracticeTask_cefrLevelId_idx" ON "PracticeTask"("cefrLevelId");

CREATE TABLE "PracticeTaskContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceTaskId" TEXT NOT NULL,
    "learningContentId" TEXT NOT NULL,
    CONSTRAINT "PracticeTaskContent_practiceTaskId_fkey" FOREIGN KEY ("practiceTaskId") REFERENCES "PracticeTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeTaskContent_learningContentId_fkey" FOREIGN KEY ("learningContentId") REFERENCES "LearningContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PracticeTaskContent_practiceTaskId_learningContentId_key" ON "PracticeTaskContent"("practiceTaskId", "learningContentId");

CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceTaskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioPath" TEXT,
    "transcriptText" TEXT,
    "durationSec" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending_evaluation',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attempt_practiceTaskId_fkey" FOREIGN KEY ("practiceTaskId") REFERENCES "PracticeTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Attempt_userId_practiceTaskId_idx" ON "Attempt"("userId", "practiceTaskId");

CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "estimatedCefr" TEXT NOT NULL,
    "grammarScore" INTEGER NOT NULL,
    "vocabularyScore" INTEGER NOT NULL,
    "clarityScore" INTEGER NOT NULL,
    "coherenceScore" INTEGER NOT NULL,
    "taskCompletionScore" INTEGER NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "mainCorrections" TEXT NOT NULL,
    "rewrittenAnswer" TEXT NOT NULL,
    "suggestedVocabulary" TEXT NOT NULL,
    "nextStep" TEXT NOT NULL,
    "llmModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evaluation_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Evaluation_attemptId_key" ON "Evaluation"("attemptId");
CREATE INDEX "Evaluation_userId_idx" ON "Evaluation"("userId");

CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT,
    "practiceTaskId" TEXT,
    "dueAt" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReviewItem_practiceTaskId_fkey" FOREIGN KEY ("practiceTaskId") REFERENCES "PracticeTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ReviewItem_userId_status_idx" ON "ReviewItem"("userId", "status");

CREATE TABLE "UserProgressSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "estimatedOverallLevel" TEXT,
    "totalPracticeMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "weeklyConsistency" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProgressSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserProgressSnapshot_userId_key" ON "UserProgressSnapshot"("userId");
