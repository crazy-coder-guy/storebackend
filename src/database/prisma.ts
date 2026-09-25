import { PrismaClient } from '@prisma/client';
import { config } from '../config';

// Pooled (pgbouncer, transaction mode) — the default for everything except
// the interactive `$transaction(async tx => ...)` callbacks in
// order.service.ts, which need `prismaDirect` instead (see that file's
// comment for why). Routing the bulk of the app's queries through pgbouncer
// is what lets many concurrent requests (e.g. the dashboard's dozen parallel
// queries) share Supabase's small real Postgres connection ceiling instead
// of exhausting it 1:1.
export const prisma = new PrismaClient({
  log: config.nodeEnv === 'production' ? [] : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
