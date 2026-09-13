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
    const { searchParams } = new URL(req.url);
    const shouldIncrementView = searchParams.get('increment_view') === 'true';

    let document = await db.document.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { page_number: 'asc' },
        },
        annotations: {
          where: { user_id: session.user.id },
          orderBy: { created_at: 'asc' },
        },
        notes: {
          where: { user_id: session.user.id },
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

    if (!document || document.status === 'removed') {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Community access check: must be community visible or owned by current user
    if (document.visibility !== 'community' && document.user_id !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized access to private document' }, { status: 403 });
    }

    // Increment view count safely if requested (debounced from client)
    if (shouldIncrementView) {
      document = await db.document.update({
        where: { id },
        data: {
          view_count: { increment: 1 },
          last_opened_at: new Date(),
        },
        include: {
          pages: { orderBy: { page_number: 'asc' } },
          annotations: { where: { user_id: session.user.id }, orderBy: { created_at: 'asc' } },
          notes: { where: { user_id: session.user.id }, orderBy: { created_at: 'asc' } },
          _count: {
            select: {
              chunks: true,
              flashcards: true,
              questions: true,
            },
          },
        },
      });
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
    const isOwner = existing.user_id === session.user.id;

    if (!isOwner && (body.title !== undefined || body.description !== undefined || body.category !== undefined || body.folder !== undefined)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const data: any = {};
    if (isOwner && body.last_page !== undefined) data.last_page = Number(body.last_page);
    if (isOwner && body.last_opened_at) data.last_opened_at = new Date(body.last_opened_at);
    if (body.page_count !== undefined) data.page_count = Number(body.page_count);
    if (isOwner && body.title !== undefined) data.title = body.title;
    if (isOwner && body.description !== undefined) data.description = body.description;
    if (isOwner && body.category !== undefined) {
      data.category = body.category;
      data.folder = body.category;
    }
    if (isOwner && body.is_favorite !== undefined) data.is_favorite = Boolean(body.is_favorite);
    if (isOwner && body.folder !== undefined) data.folder = body.folder;
    if (body.ai_indexing_status !== undefined) data.ai_indexing_status = body.ai_indexing_status;

    let document: any = existing;
    if (Object.keys(data).length > 0) {
      document = await db.document.update({
        where: { id },
        data,
      });
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        file_url: `/api/documents/${id}/file`,
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

    // Community security: Deletion restricted to uploader or admin/moderator
    const userRole = (session.user as any)?.role || 'member';
    const isUploader = document.user_id === session.user.id;
    const isModerator = userRole === 'admin' || userRole === 'moderator' || process.env.NODE_ENV === 'development';

    if (!isUploader && !isModerator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Community PDFs can only be removed by administrators or the uploader.' },
        { status: 403 }
      );
    }

    // Physical deletion from Supabase / cloud storage
    const storagePath = document.storage_path || `${document.id}/original.pdf`;
    await storage.delete(storagePath).catch(() => {});

    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Document deleted from community library' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
