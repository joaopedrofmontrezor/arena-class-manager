-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "professorId" TEXT,
    "professorName" TEXT,
    "periodStart" DATE,
    "summary" TEXT NOT NULL,
    "changes" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_periodStart_createdAt_idx" ON "AuditLog"("periodStart", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_professorId_createdAt_idx" ON "AuditLog"("professorId", "createdAt");
