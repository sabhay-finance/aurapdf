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

    // 3. Resolve private storage path
    const resolvedPath = resolveDocumentFilePath(document.file_url);
    if (!resolvedPath) {
      return new NextResponse('Stored document file not found', { status: 404 });
    }
    const filePath = resolvedPath;

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      return new NextResponse('Stored document file not found', { status: 404 });
    }

    const fileSize = fileStat.size;

    // 4. Validate Magic Bytes: ensure file starts with '%PDF-'
    try {
      const fileHandle = await open(filePath, 'r');
      const magicBuffer = Buffer.alloc(5);
      await fileHandle.read(magicBuffer, 0, 5, 0);
      await fileHandle.close();

      if (magicBuffer.toString('ascii') !== '%PDF-') {
        return new NextResponse('File is not a valid PDF document', { status: 400 });
      }
    } catch (readErr) {
      console.error('Error validating PDF magic bytes:', readErr);
      return new NextResponse('Unable to verify document integrity', { status: 500 });
    }

    const range = req.headers.get('range');
    const safeTitle = encodeURIComponent(document.title.replace(/[^a-zA-Z0-9_-]/g, '_'));

    const securityHeaders = {
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
      'Accept-Ranges': 'bytes',
    };

    // 5. Handle HTTP Range Requests for PDF.js streaming
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

      const chunkSize = end - start + 1;
      const fileStream = createReadStream(filePath, { start, end });
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

    // Full file stream
    const fileStream = createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream;

    return new NextResponse(webStream, {
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
