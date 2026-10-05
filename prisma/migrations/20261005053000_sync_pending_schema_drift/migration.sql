-- AlterTable
ALTER TABLE "storefront_settings" ADD COLUMN     "is_maintenance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maintenance_notice" TEXT,
ADD COLUMN     "maintenance_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "body_length" DECIMAL(65,30),
ADD COLUMN     "chest_width" DECIMAL(65,30),
ADD COLUMN     "shoulder_width" DECIMAL(65,30),
ADD COLUMN     "sleeve_length" DECIMAL(65,30),
ALTER COLUMN "color_id" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_color_id_fkey";

-- DropIndex
DROP INDEX "product_variants_product_id_color_id_size_id_key";

-- CreateIndex
CREATE INDEX "product_variants_product_id_size_id_idx" ON "product_variants"("product_id", "size_id");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
