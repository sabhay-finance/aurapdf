import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const COMMUNITY_PDF_BUCKET = 'community-pdfs';

function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

function getSupabaseKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

let serverClient: SupabaseClient | null = null;

/**
 * Returns an authenticated server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY (preferred) or public anon key as fallback.
 */
export function getServerSupabase(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) return null;

  if (!serverClient) {
    serverClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClient;
}

let bucketVerified = false;

/**
 * Ensures that the community-pdfs bucket exists in Supabase Storage.
 * Creates the bucket if it does not exist yet.
 */
export async function ensureCommunityBucket(): Promise<boolean> {
  if (bucketVerified) return true;
  const client = getServerSupabase();
  if (!client) return false;

  try {
    const { data: bucket, error } = await client.storage.getBucket(COMMUNITY_PDF_BUCKET);
    if (bucket && !error) {
      bucketVerified = true;
      return true;
    }

    // Bucket does not exist, create it as a private, secure storage bucket
    const { error: createError } = await client.storage.createBucket(COMMUNITY_PDF_BUCKET, {
      public: false,
      fileSizeLimit: '100MB',
      allowedMimeTypes: ['application/pdf'],
    });

    if (createError && !createError.message.includes('already exists')) {
      console.warn('Notice creating Supabase Storage bucket:', createError.message);
      return false;
    }

    bucketVerified = true;
    return true;
  } catch (err: any) {
    console.warn('Notice verifying Supabase Storage bucket:', err?.message || err);
    return false;
  }
}

/**
 * Uploads a community PDF to Supabase Storage:
 * community-pdfs/{documentId}/original.pdf
 */
export async function uploadCommunityPdf(
  documentId: string,
  buffer: Buffer,
  contentType = 'application/pdf'
): Promise<{ storagePath: string; size: number }> {
  const client = getServerSupabase();
  if (!client) {
    throw new Error('Supabase is not configured on the server');
  }

  await ensureCommunityBucket();

  const storagePath = `${documentId}/original.pdf`;
  const { error } = await client.storage
    .from(COMMUNITY_PDF_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  return { storagePath, size: buffer.byteLength };
}

/**
 * Downloads a community PDF from Supabase Storage as an ArrayBuffer/Buffer.
 */
export async function downloadCommunityPdf(
  documentId: string
): Promise<{ buffer: Buffer; contentType: string; size: number }> {
  const client = getServerSupabase();
  if (!client) {
    throw new Error('Supabase is not configured on the server');
  }

  const storagePath = `${documentId}/original.pdf`;
  const { data, error } = await client.storage
    .from(COMMUNITY_PDF_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Supabase Storage download failed: ${error?.message || 'Object not found'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    contentType: data.type || 'application/pdf',
    size: buffer.byteLength,
  };
}

/**
 * Generates a secure, time-limited signed URL for a community PDF.
 */
export async function getCommunityPdfSignedUrl(
  documentId: string,
  expiresIn = 3600,
  downloadFilename?: string
): Promise<string> {
  const client = getServerSupabase();
  if (!client) {
    throw new Error('Supabase is not configured on the server');
  }

  const storagePath = `${documentId}/original.pdf`;
  const { data, error } = await client.storage
    .from(COMMUNITY_PDF_BUCKET)
    .createSignedUrl(storagePath, expiresIn, {
      download: downloadFilename || false,
    });

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown error'}`);
  }

  return data.signedUrl;
}

/**
 * Creates a signed upload URL for direct browser-to-Supabase upload.
 * Bypasses Vercel's 4.5MB serverless body size limitation completely.
 */
export async function createCommunityPdfUploadUrl(
  documentId: string
): Promise<{ signedUrl: string; token: string; path: string } | null> {
  const client = getServerSupabase();
  if (!client) return null;

  await ensureCommunityBucket();

  const path = `${documentId}/original.pdf`;
  const { data, error } = await client.storage
    .from(COMMUNITY_PDF_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('Failed to create signed upload URL:', error);
    return null;
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

/**
 * Deletes a community PDF from Supabase Storage (orphan cleanup or admin deletion).
 */
export async function deleteCommunityPdf(documentId: string): Promise<boolean> {
  const client = getServerSupabase();
  if (!client) return false;

  try {
    const storagePath = `${documentId}/original.pdf`;
    const { error } = await client.storage
      .from(COMMUNITY_PDF_BUCKET)
      .remove([storagePath]);

    return !error;
  } catch {
    return false;
  }
}

