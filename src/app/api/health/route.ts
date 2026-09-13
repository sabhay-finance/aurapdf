import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { getAppEnvironment, getBaseUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = getAppEnvironment();
  const baseUrl = getBaseUrl();

  const healthData: Record<string, any> = {
    status: 'healthy',
    timestamp,
    environment,
    baseUrl,
    uptimeSeconds: Math.round(process.uptime()),
    checks: {},
  };

  let hasFatalError = false;

  // 1. Real Database Connectivity Check
  try {
    const start = performance.now();
    // Execute real SQL probe query
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - start);

    healthData.checks.database = {
      status: 'ok',
      latencyMs,
    };
  } catch (dbErr: any) {
    hasFatalError = true;
    healthData.status = 'unhealthy';
    healthData.checks.database = {
      status: 'error',
      message: dbErr.message,
    };
  }

  // 2. Real Storage Provider Check
  try {
    const storageCheck = await storage.checkHealth();
    healthData.checks.storage = {
      status: storageCheck.status,
      provider: storage.providerName,
      message: storageCheck.message,
    };

    if (storageCheck.status === 'error') {
      hasFatalError = true;
      healthData.status = 'unhealthy';
    } else if (storageCheck.status === 'warning' && healthData.status === 'healthy') {
      healthData.status = 'degraded';
    }
  } catch (storageErr: any) {
    hasFatalError = true;
    healthData.status = 'unhealthy';
    healthData.checks.storage = {
      status: 'error',
      provider: storage.providerName,
      message: storageErr.message,
    };
  }

  // 3. Auth Configuration Check
  healthData.checks.auth = {
    status: 'ok',
    mode: 'open-access',
    loginRequired: false,
  };

  // 4. AI Provider Configuration Check
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  healthData.checks.ai = {
    status: hasGemini || hasOpenAI ? 'ok' : 'unconfigured',
    configured: hasGemini || hasOpenAI,
    activeProvider: hasGemini ? 'gemini-2.0-flash' : hasOpenAI ? 'openai' : 'none',
  };

  const httpStatus = hasFatalError ? 503 : 200;

  return NextResponse.json(healthData, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
