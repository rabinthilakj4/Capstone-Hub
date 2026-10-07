import { PrismaClient } from '@prisma/client';

declare global {
  var __prismaClient: PrismaClient | undefined;
}

let dbUrl = process.env.DATABASE_URL || '';

// Enforce single connection per serverless function instance to prevent Supabase pooler exhaustion (EMAXCONNSESSION)
if (dbUrl && !dbUrl.includes('connection_limit=')) {
  dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=1';
}

const prisma =
  global.__prismaClient ||
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL === '1') {
  global.__prismaClient = prisma;
}

export default prisma;
