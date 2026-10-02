-- Supabase auto-exposes every table in the `public` schema through its own
-- REST API (PostgREST), completely independent of this backend's Express
-- API. This app never uses Supabase's client SDK or PostgREST (it talks to
-- Postgres directly via Prisma, connected as the table owner, which bypasses
-- RLS by default) — so enabling RLS here with zero policies locks PostgREST
-- out entirely without affecting this app's own queries at all.
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sizes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."colors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inventory_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."storefront_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."featured_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."search_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exchange_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."push_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."visits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."coupon_redemptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
