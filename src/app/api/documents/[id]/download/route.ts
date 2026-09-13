import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { storage, resolveDocumentFilePath } from '@/lib/storage';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'demo-user-id';

    // Rate limiting (30 downloads per minute per user)
    const rl = checkRateLimit(`download:${userId}`, 30, 60);
    if (!rl.success) {
      return createRateLimitResponse(rl.reset);
    }

    const { id } = await params;

    // Fetch document metadata
    const document = await db.document.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        title: true,
        original_filename: true,
        file_url: true,
        storage_path: true,
        visibility: true,
        status: true,
      },
    });

    if (!document || document.status === 'removed') {
      return new NextResponse('Document not found', { status: 404 });
    }

    // Community access authorization
    if (document.visibility !== 'community' && document.user_id !== userId) {
      return new NextResponse('Unauthorized access to private document', { status: 403 });
    }

    // Increment download count asynchronously
    db.document
      .update({
        where: { id },
        data: { download_count: { increment: 1 } },
      })
      .catch((err) => console.error('Failed to increment download count:', err));

    const rawFilename = document.original_filename || `${document.title}.pdf`;
    const cleanFilename = rawFilename.endsWith('.pdf') ? rawFilename : `${rawFilename}.pdf`;
    const safeFilename = encodeURIComponent(cleanFilename.replace(/[^a-zA-Z0-9._-]/g, '_'));

    const downloadHeaders = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-transform',
    };

    // 1. Primary: Cloud / StorageManager stream
    try {
      const storageKey = document.storage_path || `${id}/original.pdf`;
      const streamResult = await storage.getStream(storageKey);

      const body =
        Buffer.isBuffer(streamResult.body) || streamResult.body instanceof Uint8Array
          ? (streamResult.body as any)
          : streamResult.body instanceof Readable
          ? (Readable.toWeb(streamResult.body) as ReadableStream)
          : streamResult.body;

      return new NextResponse(body, {
        status: 200,
        headers: {
          ...downloadHeaders,
          'Content-Length': streamResult.totalSize.toString(),
        },
      });
    } catch {
      // Continue to local/db fallbacks
    }

    // 2. Secondary: Local disk cache
    const resolvedPath = resolveDocumentFilePath(document.file_url);
    if (resolvedPath) {
      try {
        const fileStat = await stat(resolvedPath);
        if (fileStat.size > 0) {
          const fileStream = createReadStream(resolvedPath);
          const webStream = Readable.toWeb(fileStream) as ReadableStream;
          return new NextResponse(webStream, {
            status: 200,
            headers: {
              ...downloadHeaders,
              'Content-Length': fileStat.size.toString(),
            },
          });
        }
      } catch {
        // Fallback
      }
    }

    // 3. Tertiary: Database-backed PDF binary
    const docFile = await (db as any).documentFile.findUnique({
      where: { document_id: id },
      select: { data: true },
    });

    if (docFile?.data) {
      const fileBuffer = Buffer.isBuffer(docFile.data)
        ? docFile.data
        : Buffer.from(docFile.data);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          ...downloadHeaders,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    return new NextResponse('Stored document file not found', { status: 404 });
  } catch (error: any) {
    console.error('Error downloading document:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
