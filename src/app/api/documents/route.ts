import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';
import { storage, resolveDocumentFilePath } from '@/lib/storage';

const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10);
const MAX_FILE_SIZE_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`docs-list:${session.user.id}`, 60, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'recent';
    const favorite = searchParams.get('favorite');
    const search = searchParams.get('search');

    const where: any = {
      status: { not: 'removed' },
    };

    if (category && category !== 'All') {
      where.category = category;
    }

    if (favorite === 'true') {
      where.is_favorite = true;
    }

    if (search) {
      where.title = {
        contains: search,
      };
    }

    let orderBy: any = { uploaded_at: 'desc' };
    if (sort === 'popular') {
      orderBy = [{ view_count: 'desc' }, { download_count: 'desc' }];
    } else if (sort === 'title') {
      orderBy = { title: 'asc' };
    }

    const rawDocuments = await db.document.findMany({
      where,
      orderBy,
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

    // Rate limiting: 10 uploads per minute
    const rl = checkRateLimit(`upload:${session.user.id}`, 10, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title =
      (formData.get('title') as string) ||
      (file ? file.name.replace(/\.pdf$/i, '') : 'Untitled Document');
    const category = (formData.get('category') as string) || 'General';
    const description = (formData.get('description') as string) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No PDF file provided' }, { status: 400 });
    }

    // 1. File Size Validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File exceeds maximum upload size of ${MAX_UPLOAD_MB}MB` },
        { status: 413 }
      );
    }

    // 2. Extension Validation
    const ext = path.extname(file.name).toLowerCase();
    if (ext !== '.pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF documents (.pdf) are accepted' },
        { status: 400 }
      );
    }

    // Read bytes & validate PDF header magic bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const header = buffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      return NextResponse.json(
        { success: false, error: 'Invalid file format: corrupt or invalid PDF header' },
        { status: 400 }
      );
    }

    const force = formData.get('force') === 'true';

    // 3. SHA-256 Duplicate Detection
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const existingDoc = await db.document.findFirst({
      where: {
        file_hash: fileHash,
        status: { not: 'removed' },
      },
    });

    if (existingDoc && !force) {
      const hasDiskFile =
        resolveDocumentFilePath(existingDoc.id) ||
        resolveDocumentFilePath(existingDoc.file_url) ||
        resolveDocumentFilePath(existingDoc.storage_path);
      const hasDbFile =
        (await (db as any).documentFile.count({ where: { document_id: existingDoc.id } })) > 0;

      if (hasDiskFile || hasDbFile) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          message: 'This PDF is already in the Community Library.',
          document: {
            ...existingDoc,
            file_url: `/api/documents/${existingDoc.id}/file`,
          },
        });
      }
    }

    // 4. Generate Document UUID & Upload to Supabase Storage: community-pdfs/{document_id}/original.pdf
    const docId = crypto.randomUUID();
    const storageKey = `${docId}/original.pdf`;

    try {
      await storage.upload(storageKey, buffer, 'application/pdf');
    } catch (storageErr: any) {
      console.error('Storage upload failure:', storageErr);
      return NextResponse.json(
        { success: false, error: `Storage upload failed: ${storageErr.message || 'Cloud storage error'}` },
        { status: 502 }
      );
    }

    // 5. Create Database Record (with Orphan Cleanup on failure)
    let document;
    try {
      document = await db.document.create({
        data: {
          id: docId,
          user_id: session.user.id,
          title,
          description,
          original_filename: file.name,
          storage_path: storageKey,
          mime_type: 'application/pdf',
          file_url: `/api/documents/${docId}/file`,
          file_size: buffer.byteLength,
          file_hash: fileHash,
          category,
          folder: category,
          uploaded_by: session.user.name || 'Community Member',
          uploaded_at: new Date(),
          page_count: 1,
          last_page: 1,
          status: 'active',
          visibility: 'community',
          processing_status: 'ready',
          text_extraction_status: 'pending',
          ai_indexing_status: 'pending',
        },
      });

      // Save database-level binary backup so the PDF is indestructible
      try {
        await (db as any).documentFile.upsert({
          where: { document_id: docId },
          update: { data: buffer },
          create: {
            document_id: docId,
            data: buffer,
          },
        });
      } catch (binErr) {
        console.warn('Non-fatal: could not store binary backup in DocumentFile:', binErr);
      }
    } catch (dbErr: any) {
      // Partial failure cleanup: remove the uploaded storage object
      console.error('Database write failed, cleaning up orphaned storage file:', dbErr);
      await storage.delete(storageKey).catch(() => {});
      return NextResponse.json(
        { success: false, error: `Failed to create database record: ${dbErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isDuplicate: false,
      document: {
        ...document,
        file_url: `/api/documents/${document.id}/file`,
      },
    });
  } catch (error: any) {
    console.error('Error in document upload:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
