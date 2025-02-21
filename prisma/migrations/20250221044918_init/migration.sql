-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "transaction_time" TIMESTAMP(3) NOT NULL,
    "transaction_status" TEXT NOT NULL,
    "payment_type" TEXT,
    "payment_detail" TEXT,
    "ppn" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "pju" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "gross_amount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalPower" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "adminFee" DECIMAL(65,30) NOT NULL DEFAULT 4000.00,
    "totalPricePower" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_order_id_key" ON "transactions"("order_id");
