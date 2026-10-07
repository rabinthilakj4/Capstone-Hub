import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || '';

const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export default prisma;
