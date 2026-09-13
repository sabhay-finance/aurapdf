import fs from 'fs';
import path from 'path';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStorageConfig } from './env';
import {
  isSupabaseConfigured,
  uploadCommunityPdf,
  downloadCommunityPdf,
  getCommunityPdfSignedUrl,
  deleteCommunityPdf,
  ensureCommunityBucket,
} from './supabaseServer';

export interface StorageFileResult {
  key: string;
  size: number;
}

export interface StorageStreamResult {
  body: ReadableStream | NodeJS.ReadableStream;
  contentLength: number;
  totalSize: number;
  contentType: string;
}

export function getStorageUploadsDir(): string {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return path.join('/tmp', 'storage', 'uploads');
  }
  return path.join(process.cwd(), 'storage', 'uploads');
}

export function resolveDocumentFilePath(fileUrl: string): string | null {
  if (!fileUrl) return null;
  const filename = path.basename(fileUrl);

  // Extract UUID if present in path like "cc18a35e-cf81-4b52-8611-80d85817c40f/original.pdf" or "/api/documents/cc18a35e-.../file"
  const uuidMatch = fileUrl.match(/([a-f0-9-]{36})/i);
  const docId = uuidMatch ? uuidMatch[1] : null;

  const candidates = [
    // 1. Subdirectory {docId}/original.pdf (preferred for modern uploads)
    ...(docId
      ? [
          path.join(getStorageUploadsDir(), docId, 'original.pdf'),
          path.join(process.cwd(), 'storage', 'uploads', docId, 'original.pdf'),
          path.join('/tmp', 'storage', 'uploads', docId, 'original.pdf'),
        ]
      : []),

    // 2. Exact path inside storage/uploads (if it's a file)
    path.join(getStorageUploadsDir(), fileUrl),
    path.join(process.cwd(), 'storage', 'uploads', fileUrl),
    path.join('/tmp', 'storage', 'uploads', fileUrl),

    // 3. Basename inside storage/uploads
    path.join(getStorageUploadsDir(), filename),
    path.join(process.cwd(), 'storage', 'uploads', filename),
    path.join('/tmp', 'storage', 'uploads', filename),

    // 4. Public files / samples
    path.join(process.cwd(), 'public', fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl),
    path.join(process.cwd(), 'public', 'samples', filename),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {}
  }

  return null;
}

class LocalStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = getStorageUploadsDir();
  }

  private async ensureDir(targetPath?: string) {
    const dir = targetPath ? path.dirname(targetPath) : this.baseDir;
    await mkdir(dir, { recursive: true });
  }

  async upload(key: string, buffer: Buffer): Promise<StorageFileResult> {
    const filePath = path.join(this.baseDir, key);
    await this.ensureDir(filePath);
    await writeFile(filePath, buffer);
    return { key, size: buffer.byteLength };
  }

  async getStream(key: string, range?: { start: number; end?: number }): Promise<StorageStreamResult> {
    const resolved = resolveDocumentFilePath(key);
    const filePath = resolved || path.join(this.baseDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }

    const fileStat = await stat(filePath);
    const totalSize = fileStat.size;

    let start = 0;
    let end = totalSize - 1;
    if (range) {
      start = range.start;
      end = range.end !== undefined && !isNaN(range.end) ? Math.min(range.end, totalSize - 1) : totalSize - 1;
    }

    const stream = fs.createReadStream(filePath, { start, end });
    return {
      body: stream,
      contentLength: end - start + 1,
      totalSize,
      contentType: 'application/pdf',
    };
  }

  async getSignedUrl(key: string): Promise<string> {
    // In local development, return the authenticated streaming API URL
    return `/api/documents/${encodeURIComponent(key)}/file`;
  }

  async delete(key: string): Promise<boolean> {
    const resolved = resolveDocumentFilePath(key);
    const filePath = resolved || path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      await unlink(filePath).catch(() => {});
      return true;
    }
    return false;
  }

  async checkHealth(): Promise<{ status: 'ok' | 'warning' | 'error'; message?: string }> {
    const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    if (isVercel) {
      return {
        status: 'warning',
        message: 'Running on Vercel with LocalStorage. Cloud object storage (S3/R2) is required for persistent PDF files in serverless production.',
      };
    }

    try {
      await this.ensureDir();
      return { status: 'ok' };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }
}

class S3StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: ReturnType<typeof getStorageConfig>) {
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('S3 credentials are required to initialize S3StorageProvider');
    }

    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(key: string, buffer: Buffer, contentType = 'application/pdf'): Promise<StorageFileResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);
    return { key, size: buffer.byteLength };
  }

  async getStream(key: string, range?: { start: number; end?: number }): Promise<StorageStreamResult> {
    const rangeHeader = range
      ? `bytes=${range.start}-${range.end !== undefined && !isNaN(range.end) ? range.end : ''}`
      : undefined;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Range: rangeHeader,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Empty response body from S3 for key: ${key}`);
    }

    const totalSize = response.ContentLength || 0;
    const contentLength = response.ContentLength || totalSize;

    return {
      body: response.Body as ReadableStream,
      contentLength,
      totalSize,
      contentType: response.ContentType || 'application/pdf',
    };
  }

  async getSignedUrl(key: string, expiresIn = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async checkHealth(): Promise<{ status: 'ok' | 'warning' | 'error'; message?: string }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: 'healthcheck-probe',
      });
      await this.client.send(command).catch((err) => {
        // A 404 (NotFound) is expected and proves valid connection and credentials
        if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
          throw err;
        }
      });
      return { status: 'ok' };
    } catch (err: any) {
      return { status: 'error', message: `S3 connection failed: ${err.message}` };
    }
  }
}

class SupabaseStorageProvider {
  async upload(key: string, buffer: Buffer, contentType = 'application/pdf'): Promise<StorageFileResult> {
    const documentId = key.replace(/\/original\.pdf$/, '');
    const { storagePath, size } = await uploadCommunityPdf(documentId, buffer, contentType);
    return { key: storagePath, size };
  }

  async getStream(key: string, range?: { start: number; end?: number }): Promise<StorageStreamResult> {
    const documentId = key.replace(/\/original\.pdf$/, '');
    const { buffer, contentType, size } = await downloadCommunityPdf(documentId);

    let start = 0;
    let end = size - 1;
    if (range) {
      start = range.start;
      end = range.end !== undefined && !isNaN(range.end) ? Math.min(range.end, size - 1) : size - 1;
    }

    const chunk = buffer.subarray(start, end + 1);
    return {
      body: chunk as any,
      contentLength: chunk.length,
      totalSize: size,
      contentType,
    };
  }

  async getSignedUrl(key: string, expiresIn = 3600, downloadFilename?: string): Promise<string> {
    const documentId = key.replace(/\/original\.pdf$/, '');
    return getCommunityPdfSignedUrl(documentId, expiresIn, downloadFilename);
  }

  async delete(key: string): Promise<boolean> {
    const documentId = key.replace(/\/original\.pdf$/, '');
    return deleteCommunityPdf(documentId);
  }

  async checkHealth(): Promise<{ status: 'ok' | 'warning' | 'error'; message?: string }> {
    const ok = await ensureCommunityBucket();
    return ok
      ? { status: 'ok' }
      : { status: 'warning', message: 'Could not connect to Supabase community-pdfs bucket' };
  }
}

// Unified Storage API
class StorageManager {
  private local = new LocalStorageProvider();
  private s3: S3StorageProvider | null = null;
  private supabase = new SupabaseStorageProvider();

  private getProvider() {
    if (isSupabaseConfigured()) {
      return this.supabase;
    }
    const config = getStorageConfig();
    if (config.provider === 's3') {
      if (!this.s3) {
        this.s3 = new S3StorageProvider(config);
      }
      return this.s3;
    }
    return this.local;
  }

  get providerName(): 'supabase' | 's3' | 'local' {
    if (isSupabaseConfigured()) return 'supabase';
    return getStorageConfig().provider;
  }

  async upload(key: string, buffer: Buffer, contentType = 'application/pdf'): Promise<StorageFileResult> {
    return this.getProvider().upload(key, buffer, contentType);
  }

  async getStream(key: string, range?: { start: number; end?: number }): Promise<StorageStreamResult> {
    return this.getProvider().getStream(key, range);
  }

  async getSignedUrl(key: string, expiresIn = 900, downloadFilename?: string): Promise<string> {
    if (isSupabaseConfigured()) {
      return this.supabase.getSignedUrl(key, expiresIn, downloadFilename);
    }
    return this.getProvider().getSignedUrl(key, expiresIn);
  }

  async delete(key: string): Promise<boolean> {
    return this.getProvider().delete(key);
  }

  async checkHealth() {
    return this.getProvider().checkHealth();
  }
}

export const storage = new StorageManager();
