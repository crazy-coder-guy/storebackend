import { PrismaClient } from '@prisma/client';
import { config } from '../config';

export const prisma = new PrismaClient({
  log: config.nodeEnv === 'production' ? [] : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});
