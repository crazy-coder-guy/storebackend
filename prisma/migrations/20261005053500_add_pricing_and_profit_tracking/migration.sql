-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "cost_price" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "courier_cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "exchange_buffer" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "marketing_cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "misc_cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "net_contribution" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "packaging_cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_gateway_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "product_cost_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping_fee" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "cost_price" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cost_price" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "pricing_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "packaging_cost" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "courier_cost" DECIMAL(65,30) NOT NULL DEFAULT 65,
    "payment_gateway_percent" DECIMAL(65,30) NOT NULL DEFAULT 2.5,
    "exchange_buffer" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "misc_cost" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "marketing_cost" DECIMAL(65,30) NOT NULL DEFAULT 75,
    "target_profit" DECIMAL(65,30) NOT NULL DEFAULT 150,
    "free_shipping_threshold" DECIMAL(65,30) NOT NULL DEFAULT 999,
    "shipping_charge" DECIMAL(65,30) NOT NULL DEFAULT 59,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id")
);

