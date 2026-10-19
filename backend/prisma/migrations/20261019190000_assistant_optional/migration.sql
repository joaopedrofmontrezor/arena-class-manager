-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_assistantId_fkey";

-- AlterTable
ALTER TABLE "Lesson" ALTER COLUMN "assistantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
