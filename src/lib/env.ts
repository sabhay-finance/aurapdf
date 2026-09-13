/**
 * Centralized Environment & Configuration Resolver
 * Provides environment-aware, dynamic resolution of base URLs, deployment tiers,
 * and service configurations without hardcoded URLs or exposed secrets.
 */

export type AppEnvironment = 'development' | 'preview' | 'production';

/**
 * Resolves the application environment tier.
 * Prioritizes Vercel's platform environment flag (VERCEL_ENV) when deployed.
 */
export function getAppEnvironment(): AppEnvironment {
  if (process.env.VERCEL_ENV === 'production') return 'production';
  if (process.env.VERCEL_ENV === 'preview') return 'preview';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * Dynamically resolves the base URL of the application.
 * Hierarchy:
 * 1. Explicit NEXTAUTH_URL or AUTH_URL (Custom domain or manual override)
 * 2. NEXT_PUBLIC_APP_URL
 * 3. VERCEL_URL (Automatically provided on Vercel for Preview & Production)
 * 4. Localhost fallback for local development (http://localhost:3000)
 */
export function getBaseUrl(): string {
  // Explicitly configured URL
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // Vercel deployment host (Preview branches or Vercel default domain)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default local development fallback
  return 'http://localhost:3000';
}

/**
 * Returns the Google OAuth authorized redirect URI for the current environment.
 */
export function getGoogleOAuthCallbackUrl(): string {
  return `${getBaseUrl()}/api/auth/callback/google`;
}

/**
 * Server-side storage configuration.
 */
export interface StorageConfig {
  provider: 'local' | 's3';
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
}

export function getStorageConfig(): StorageConfig {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const s3Bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
  const s3Region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const s3Endpoint = process.env.S3_ENDPOINT;

  // Use S3 if bucket and credentials are provided
  if (s3Bucket && s3AccessKeyId && s3SecretAccessKey) {
    return {
      provider: 's3',
      bucket: s3Bucket,
      region: s3Region,
      endpoint: s3Endpoint,
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey,
      forcePathStyle: Boolean(s3Endpoint),
    };
  }

  return {
    provider: 'local',
  };
}

/**
 * Server-side AI configuration.
 */
export interface AIConfig {
  geminiKey?: string;
  openaiKey?: string;
  isConfigured: boolean;
}

export function getAIConfig(): AIConfig {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  return {
    geminiKey,
    openaiKey,
    isConfigured: Boolean(geminiKey || openaiKey),
  };
}
