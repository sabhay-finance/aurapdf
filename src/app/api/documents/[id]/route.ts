import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import path from 'path';
import { storage } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const document = await db.document.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { page_number: 'asc' },
        },
        annotations: {
          orderBy: { created_at: 'asc' },
        },
        notes: {
          orderBy: { created_at: 'asc' },
        },
        _count: {
          select: {
            chunks: true,
            flashcards: true,
            questions: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        file_url: `/api/documents/${document.id}/file`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.document.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};
    if (body.last_page !== undefined) data.last_page = Number(body.last_page);
    if (body.last_opened_at) data.last_opened_at = new Date(body.last_opened_at);
    if (body.page_count !== undefined) data.page_count = Number(body.page_count);
    if (body.title !== undefined) data.title = body.title;
    if (body.is_favorite !== undefined) data.is_favorite = Boolean(body.is_favorite);
    if (body.folder !== undefined) data.folder = body.folder;

    const document = await db.document.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        file_url: `/api/documents/${document.id}/file`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const document = await db.document.findUnique({ where: { id } });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Physical deletion from private storage
    if (document.file_url) {
      await storage.delete(document.file_url);
    }

    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
