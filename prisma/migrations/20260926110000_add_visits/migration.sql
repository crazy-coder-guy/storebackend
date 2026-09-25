-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "device_type" TEXT NOT NULL,
    "os" TEXT,
    "browser" TEXT,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visits_user_id_idx" ON "visits"("user_id");

-- CreateIndex
CREATE INDEX "visits_created_at_idx" ON "visits"("created_at");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
