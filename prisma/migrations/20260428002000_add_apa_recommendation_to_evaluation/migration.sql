-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN "apaPhase" TEXT NOT NULL DEFAULT 'practice';
ALTER TABLE "Evaluation" ADD COLUMN "apaReason" TEXT NOT NULL DEFAULT 'Keep practicing with targeted feedback.';
ALTER TABLE "Evaluation" ADD COLUMN "apaMicroGoal" TEXT NOT NULL DEFAULT 'Use the feedback in your next attempt.';
