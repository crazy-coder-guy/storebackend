-- Drop the old customer_id foreign key/index so the column can be replaced.
ALTER TABLE "orders" DROP CONSTRAINT "orders_customer_id_fkey";
DROP INDEX "orders_customer_id_idx";

-- Add the new user-based + snapshot columns, nullable for now so existing
-- rows can be backfilled before the NOT NULL constraint is applied.
ALTER TABLE "orders"
  ADD COLUMN "user_id" TEXT,
  ADD COLUMN "customer_name" TEXT,
  ADD COLUMN "customer_phone" TEXT,
  ADD COLUMN "customer_email" TEXT;

-- Backfill from the old customers table, matching each customer to the
-- signed-in account with the same email (every order has required auth for
-- a while now, so this recovers every order that's actually reachable).
UPDATE "orders" o
SET
  "user_id" = u.id,
  "customer_name" = c.name,
  "customer_phone" = c.phone,
  "customer_email" = c.email
FROM "customers" c
JOIN "users" u ON u.email = c.email
WHERE c.id = o."customer_id";

-- Any order that couldn't be matched to a signed-in account (e.g. a
-- pre-auth-required test order with no corresponding user) can't satisfy the
-- new NOT NULL user_id constraint — drop those rather than leave the
-- column nullable for the sake of unreachable historical rows.
DELETE FROM "orders" WHERE "user_id" IS NULL;

ALTER TABLE "orders"
  ALTER COLUMN "user_id" SET NOT NULL,
  ALTER COLUMN "customer_name" SET NOT NULL,
  ALTER COLUMN "customer_phone" SET NOT NULL,
  ALTER COLUMN "customer_email" SET NOT NULL;

ALTER TABLE "orders" DROP COLUMN "customer_id";

CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "customers";

-- User gains the ACTIVE/INACTIVE status Customer used to carry, so admin can
-- still deactivate an account.
ALTER TABLE "users" ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE';
