import { prisma } from './prisma';

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (err) {
    console.error('Failed to connect to the database:', err);
    throw err;
  }
}
