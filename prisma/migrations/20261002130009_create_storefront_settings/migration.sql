-- CreateTable
CREATE TABLE "storefront_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "announcement_text" TEXT NOT NULL,
    "hero_title" TEXT NOT NULL,
    "hero_subtitle" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storefront_settings_pkey" PRIMARY KEY ("id")
);
