import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function getResolvedDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    const tmpDbPath = path.join('/tmp', 'dev.db');
    const bundledDbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    if (!fs.existsSync(tmpDbPath) && fs.existsSync(bundledDbPath)) {
      try {
        fs.copyFileSync(bundledDbPath, tmpDbPath);
      } catch (err) {
        console.warn('Could not copy bundled dev.db to /tmp:', err);
      }
    }
    return `file:${tmpDbPath}`;
  }

  return 'file:./dev.db';
}

const resolvedDbUrl = getResolvedDatabaseUrl();
process.env.DATABASE_URL = resolvedDbUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
export default db;
