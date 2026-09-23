-- CreateTable
CREATE TABLE "storefront_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "announcement_text" TEXT NOT NULL,
    "hero_title" TEXT NOT NULL,
    "hero_subtitle" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storefront_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_products" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featured_products_product_id_key" ON "featured_products"("product_id");

-- CreateIndex
CREATE INDEX "featured_products_sort_order_idx" ON "featured_products"("sort_order");

-- AddForeignKey
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

