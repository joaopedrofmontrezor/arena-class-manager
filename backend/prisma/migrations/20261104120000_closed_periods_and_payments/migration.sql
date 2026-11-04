-- CreateTable
CREATE TABLE "ClosedPeriod" (
    "id" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" TEXT NOT NULL,

    CONSTRAINT "ClosedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingPayment" (
    "id" TEXT NOT NULL,
    "closedPeriodId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById" TEXT NOT NULL,

    CONSTRAINT "ClosingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClosedPeriod_periodStart_key" ON "ClosedPeriod"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingPayment_closedPeriodId_professorId_key" ON "ClosingPayment"("closedPeriodId", "professorId");

-- AddForeignKey
ALTER TABLE "ClosedPeriod" ADD CONSTRAINT "ClosedPeriod_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingPayment" ADD CONSTRAINT "ClosingPayment_closedPeriodId_fkey" FOREIGN KEY ("closedPeriodId") REFERENCES "ClosedPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingPayment" ADD CONSTRAINT "ClosingPayment_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingPayment" ADD CONSTRAINT "ClosingPayment_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
