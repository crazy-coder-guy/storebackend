#!/usr/bin/env node
// Prisma CLI commands run as separate OS processes, so they don't go through
// src/config/index.ts's in-memory DATABASE_URL/DIRECT_URL construction.
// This wrapper builds the same connection string from the discrete DB_*
// fields in .env and injects it for the wrapped command.
//
// Usage: node scripts/prisma-cli.js <command...>
//   e.g. node scripts/prisma-cli.js npx prisma migrate deploy
//        node scripts/prisma-cli.js npx prisma db push
//        node scripts/prisma-cli.js npx ts-node prisma/seed.ts

require('dotenv').config();
const { spawnSync } = require('child_process');

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_SSL } = process.env;

if (!DB_USER || !DB_PASSWORD || !DB_HOST || !DB_NAME) {
  console.error('Missing DB_USER/DB_PASSWORD/DB_HOST/DB_NAME in .env');
  process.exit(1);
}

const port = DB_PORT || '5432';
const sslParam = DB_SSL === 'true' ? '?sslmode=require' : '';
const url = `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}${sslParam}`;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/prisma-cli.js <command...>');
  process.exit(1);
}

const result = spawnSync(args[0], args.slice(1), {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
});

process.exit(result.status ?? 1);
