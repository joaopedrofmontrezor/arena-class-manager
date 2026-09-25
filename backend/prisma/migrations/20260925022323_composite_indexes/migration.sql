-- DropIndex
DROP INDEX "Lesson_assistantId_idx";

-- DropIndex
DROP INDEX "Lesson_professorId_idx";

-- CreateIndex
CREATE INDEX "Lesson_professorId_date_idx" ON "Lesson"("professorId", "date");

-- CreateIndex
CREATE INDEX "Lesson_assistantId_date_idx" ON "Lesson"("assistantId", "date");
