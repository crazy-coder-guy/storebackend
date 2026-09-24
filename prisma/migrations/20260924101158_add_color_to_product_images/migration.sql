-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "color_id" TEXT;

-- CreateIndex
CREATE INDEX "product_images_color_id_idx" ON "product_images"("color_id");

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

