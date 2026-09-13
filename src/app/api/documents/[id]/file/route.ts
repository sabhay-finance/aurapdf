import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import path from 'path';
import { stat, open } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';
import { resolveDocumentFilePath } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate Request
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized. Please log in.', { status: 401 });
    }

    // Rate limiting (60 file stream chunks per minute per user)
    const rl = checkRateLimit(`stream:${session.user.id}`, 60, 60);
    if (!rl.success) {
      return createRateLimitResponse(rl.reset);
    }

    const { id } = await params;

    // 2. Verify Ownership in Database
    const document = await db.document.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        title: true,
        file_url: true,
      },
    });

    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const safeTitle = encodeURIComponent(document.title.replace(/[^a-zA-Z0-9_-]/g, '_'));
    const securityHeaders = {
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
      'Accept-Ranges': 'bytes',
    };

    const range = req.headers.get('range');

    // 3. First attempt to serve from local disk cache if available
    const resolvedPath = resolveDocumentFilePath(document.file_url);
    if (resolvedPath) {
      try {
        const fileStat = await stat(resolvedPath);
        const fileSize = fileStat.size;

        if (fileSize > 0) {
          const fileHandle = await open(resolvedPath, 'r');
          const magicBuffer = Buffer.alloc(5);
          await fileHandle.read(magicBuffer, 0, 5, 0);
          await fileHandle.close();

          if (magicBuffer.toString('ascii') === '%PDF-') {
            if (range) {
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

              if (!isNaN(start) && start < fileSize && end < fileSize && start <= end) {
                const chunkSize = end - start + 1;
                const fileStream = createReadStream(resolvedPath, { start, end });
                const webStream = Readable.toWeb(fileStream) as ReadableStream;

                return new NextResponse(webStream, {
                  status: 206,
                  headers: {
                    ...securityHeaders,
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Content-Length': chunkSize.toString(),
                  },
                });
              }
            }

            const fileStream = createReadStream(resolvedPath);
            const webStream = Readable.toWeb(fileStream) as ReadableStream;
            return new NextResponse(webStream, {
              status: 200,
              headers: {
                ...securityHeaders,
                'Content-Length': fileSize.toString(),
              },
            });
          }
        }
      } catch {
        // Fallback to database binary
      }
    }

    // 4. Fallback to database-backed PDF binary storage
    const docFile = await (db as any).documentFile.findUnique({
      where: { document_id: id },
      select: { data: true },
    });

    if (!docFile || !docFile.data) {
      return new NextResponse('Stored document file not found', { status: 404 });
    }

    const fileBuffer = Buffer.isBuffer(docFile.data)
      ? docFile.data
      : Buffer.from(docFile.data);

    const fileSize = fileBuffer.length;

    // Validate magic bytes (%PDF-)
    if (fileSize >= 5) {
      const magic = fileBuffer.subarray(0, 5).toString('ascii');
      if (magic !== '%PDF-') {
        return new NextResponse('File is not a valid PDF document', { status: 400 });
      }
    }

    // Handle range request for database buffer
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse('Requested range not satisfiable', {
          status: 416,
          headers: {
            ...securityHeaders,
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunk = fileBuffer.subarray(start, end + 1);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          ...securityHeaders,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunk.length.toString(),
        },
      });
    }

    // Return full PDF buffer
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        ...securityHeaders,
        'Content-Length': fileSize.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error securely streaming document:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
