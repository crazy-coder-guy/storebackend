import { PrismaClient } from '@prisma/client';

// Unpooled, direct-to-Postgres connection (bypasses pgbouncer) — required
// only for interactive `$transaction(async tx => ...)` callbacks, which
// break under pgbouncer's transaction-pooling mode (each statement inside
// the callback can land on a different pooled connection, so Postgres never
// sees them as the same transaction — Prisma error P2028). Kept to a small
// connection cap of its own so it can't eat into the same tiny session
// ceiling the pooled `prisma` client already shares across the rest of the
// app; order creation/cancellation is comparatively low-frequency.
const directUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL || '');
directUrl.searchParams.set('connection_limit', '3');

export const prismaDirect = new PrismaClient({
  datasources: { db: { url: directUrl.toString() } },
});
