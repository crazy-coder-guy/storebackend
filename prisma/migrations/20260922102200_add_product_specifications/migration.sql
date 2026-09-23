-- CreateEnum
CREATE TYPE "ProductFit" AS ENUM ('REGULAR', 'SLIM', 'OVERSIZED', 'RELAXED');

-- CreateEnum
CREATE TYPE "NeckType" AS ENUM ('CREW', 'V_NECK', 'POLO', 'ROUND', 'MOCK');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "biowash" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fabric" TEXT,
ADD COLUMN     "fit" "ProductFit",
ADD COLUMN     "gsm" INTEGER,
ADD COLUMN     "neck_type" "NeckType";
