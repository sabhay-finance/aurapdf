import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Ensure DATABASE_URL is set even when unconfigured in Vercel platform environment
if (!process.env.DATABASE_URL) {
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
    process.env.DATABASE_URL = `file:${tmpDbPath}`;
  } else {
    process.env.DATABASE_URL = 'file:./dev.db';
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
export default db;
