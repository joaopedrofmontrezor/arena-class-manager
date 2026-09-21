-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('TURMA', 'PERSONAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PROFESSOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "professorId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "professorValue" DECIMAL(10,2) NOT NULL,
    "assistantValue" DECIMAL(10,2) NOT NULL,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lesson_professorId_idx" ON "Lesson"("professorId");

-- CreateIndex
CREATE INDEX "Lesson_assistantId_idx" ON "Lesson"("assistantId");

-- CreateIndex
CREATE INDEX "Lesson_date_idx" ON "Lesson"("date");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
