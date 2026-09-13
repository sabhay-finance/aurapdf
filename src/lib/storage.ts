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
  const filename = path.basename(fileUrl);
  const candidates = [
    path.join('/tmp', 'storage', 'uploads', filename),
    path.join(process.cwd(), 'storage', 'uploads', filename),
    path.join(process.cwd(), 'public', 'samples', filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

class LocalStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = getStorageUploadsDir();
  }

  private async ensureDir() {
    await mkdir(this.baseDir, { recursive: true });
  }

  async upload(key: string, buffer: Buffer): Promise<StorageFileResult> {
    await this.ensureDir();
    const filePath = path.join(this.baseDir, key);
    await writeFile(filePath, buffer);
    return { key, size: buffer.byteLength };
  }

  async getStream(key: string, range?: { start: number; end: number }): Promise<StorageStreamResult> {
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
      end = Math.min(range.end, totalSize - 1);
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

  async getStream(key: string, range?: { start: number; end: number }): Promise<StorageStreamResult> {
    const rangeHeader = range ? `bytes=${range.start}-${range.end}` : undefined;
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

// Unified Storage API
class StorageManager {
  private local = new LocalStorageProvider();
  private s3: S3StorageProvider | null = null;

  private getProvider() {
    const config = getStorageConfig();
    if (config.provider === 's3') {
      if (!this.s3) {
        this.s3 = new S3StorageProvider(config);
      }
      return this.s3;
    }
    return this.local;
  }

  get providerName(): 'local' | 's3' {
    return getStorageConfig().provider;
  }

  async upload(key: string, buffer: Buffer, contentType = 'application/pdf'): Promise<StorageFileResult> {
    return this.getProvider().upload(key, buffer, contentType);
  }

  async getStream(key: string, range?: { start: number; end: number }): Promise<StorageStreamResult> {
    return this.getProvider().getStream(key, range);
  }

  async getSignedUrl(key: string, expiresIn = 900): Promise<string> {
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
