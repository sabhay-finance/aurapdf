import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import path from 'path';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';
import { storage } from '@/lib/storage';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB max upload size

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`docs-list:${session.user.id}`, 60, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder');
    const favorite = searchParams.get('favorite');

    // Open access: return all documents in library
    const where: any = {};
    if (folder) where.folder = folder;
    if (favorite === 'true') where.is_favorite = true;

    const rawDocuments = await db.document.findMany({
      where,
      orderBy: { last_opened_at: 'desc' },
      include: {
        _count: {
          select: {
            notes: true,
            annotations: true,
            flashcards: true,
          },
        },
      },
    });

    // Transform file_url to authenticated streaming route
    const documents = rawDocuments.map((doc) => ({
      ...doc,
      file_url: `/api/documents/${doc.id}/file`,
    }));

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 5 uploads per minute
    const rl = checkRateLimit(`upload:${session.user.id}`, 5, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || (file ? file.name.replace(/\.pdf$/i, '') : 'Untitled Document');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No PDF file provided' }, { status: 400 });
    }

    // 1. File Size Validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds maximum upload size of 50MB' },
        { status: 413 }
      );
    }

    // 2. Extension & MIME Validation
    const ext = path.extname(file.name).toLowerCase();
    if (ext !== '.pdf') {
      return NextResponse.json({ success: false, error: 'Only PDF files (.pdf) are supported' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Magic Bytes Validation: verify PDF header (%PDF-)
    const header = buffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      return NextResponse.json(
        { success: false, error: 'Corrupt or invalid PDF file header' },
        { status: 400 }
      );
    }

    // 4. Save to private object storage (outside public directory)
    const storageKey = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await storage.upload(storageKey, buffer, 'application/pdf');

    // 5. Create document in database with authenticated streaming URL
    const docId = crypto.randomUUID();
    const document = await db.document.create({
      data: {
        id: docId,
        user_id: session.user.id,
        title,
        file_url: storageKey, // Store safe storage identifier
        file_size: buffer.byteLength,
        page_count: 1,
        last_page: 1,
        folder: 'Uploaded',
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        file_url: `/api/documents/${document.id}/file`,
      },
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
