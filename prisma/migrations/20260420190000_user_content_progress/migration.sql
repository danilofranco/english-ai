-- CreateTable
CREATE TABLE "UserContentProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "learningContentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "lastOpenedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserContentProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserContentProgress_learningContentId_fkey" FOREIGN KEY ("learningContentId") REFERENCES "LearningContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserContentProgress_userId_learningContentId_key" ON "UserContentProgress"("userId", "learningContentId");

-- CreateIndex
CREATE INDEX "UserContentProgress_userId_idx" ON "UserContentProgress"("userId");
