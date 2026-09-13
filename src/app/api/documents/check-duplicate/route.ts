import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveDocumentFilePath } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file_hash } = body;

    if (!file_hash || typeof file_hash !== 'string') {
      return NextResponse.json(
        { success: false, error: 'file_hash is required' },
        { status: 400 }
      );
    }

    const existing = await db.document.findFirst({
      where: {
        file_hash,
        status: { not: 'removed' },
      },
      select: {
        id: true,
        title: true,
        page_count: true,
        category: true,
        file_url: true,
        storage_path: true,
        uploaded_at: true,
        uploaded_by: true,
      },
    });

    if (existing) {
      const hasDiskFile =
        resolveDocumentFilePath(existing.id) ||
        resolveDocumentFilePath(existing.file_url) ||
        resolveDocumentFilePath(existing.storage_path);
      const hasDbFile =
        (await (db as any).documentFile.count({ where: { document_id: existing.id } })) > 0;

      if (hasDiskFile || hasDbFile) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          document: existing,
        });
      }
    }

    return NextResponse.json({
      success: true,
      isDuplicate: false,
    });
  } catch (error: any) {
    console.error('Error checking duplicate PDF:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
