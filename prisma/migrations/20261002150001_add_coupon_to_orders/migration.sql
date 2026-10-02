-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "coupon_id" TEXT,
ADD COLUMN     "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "orders_coupon_id_idx" ON "orders"("coupon_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
