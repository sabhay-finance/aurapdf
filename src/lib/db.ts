import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import { ensureDatabaseTables } from './dbInit';

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

const rawDb =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = rawDb;

let initPromise: Promise<void> | null = null;
function ensureInit() {
  if (!initPromise) {
    initPromise = ensureDatabaseTables(rawDb);
  }
  return initPromise;
}

export const db: PrismaClient = new Proxy(rawDb, {
  get(target, prop) {
    const orig = (target as any)[prop];
    if (typeof orig === 'function') {
      return async (...args: any[]) => {
        await ensureInit();
        return orig.apply(target, args);
      };
    }
    if (typeof orig === 'object' && orig !== null) {
      return new Proxy(orig, {
        get(modelTarget, modelProp) {
          const modelMethod = modelTarget[modelProp];
          if (typeof modelMethod === 'function') {
            return async (...args: any[]) => {
              await ensureInit();
              return modelMethod.apply(modelTarget, args);
            };
          }
          return modelMethod;
        },
      });
    }
    return orig;
  },
}) as PrismaClient;

export default db;
