import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      title,
      category = 'General',
      description = null,
      file_hash,
      file_size = 0,
      original_filename = 'document.pdf',
    } = body;

    if (!id || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required document fields' },
        { status: 400 }
      );
    }

    // Verify hash uniqueness
    if (file_hash) {
      const existing = await db.document.findFirst({
        where: {
          file_hash,
          status: { not: 'removed' },
        },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          message: 'This PDF is already in the Community Library.',
          document: {
            ...existing,
            file_url: `/api/documents/${existing.id}/file`,
          },
        });
      }
    }

    const storagePath = `${id}/original.pdf`;

    const document = await db.document.create({
      data: {
        id,
        user_id: session.user.id,
        title,
        description,
        original_filename,
        storage_path: storagePath,
        mime_type: 'application/pdf',
        file_url: `/api/documents/${id}/file`,
        file_size: Number(file_size),
        file_hash: file_hash || null,
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

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        file_url: `/api/documents/${document.id}/file`,
      },
    });
  } catch (error: any) {
    console.error('Error completing cloud upload:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register community document' },
      { status: 500 }
    );
  }
}
