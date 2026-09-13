import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('document_id');
    const pageNumber = searchParams.get('page_number');

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'document_id is required' }, { status: 400 });
    }

    // Verify document exists
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const where: any = { document_id: documentId, user_id: session.user.id };
    if (pageNumber) where.page_number = Number(pageNumber);

    const annotations = await db.annotation.findMany({
      where,
      orderBy: { created_at: 'asc' },
    });

    return NextResponse.json({ success: true, annotations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, document_id, page_number, type, coordinates, content, color } = body;

    if (!document_id || !page_number || !type || !coordinates) {
      return NextResponse.json({ success: false, error: 'Missing required annotation fields' }, { status: 400 });
    }

    // Verify document exists
    const document = await db.document.findUnique({
      where: { id: document_id },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const coordsStr = typeof coordinates === 'string' ? coordinates : JSON.stringify(coordinates);

    // Create annotation
    const annotation = await db.annotation.create({
      data: {
        id: id || undefined,
        document_id,
        user_id: session?.user?.id || 'demo-user-id',
        page_number: Number(page_number),
        type,
        coordinates: coordsStr,
        content: content || null,
        color: color || 'rgba(245, 205, 71, 0.35)',
      },
    });

    return NextResponse.json({ success: true, annotation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const existing = await db.annotation.findUnique({
      where: { id },
      select: { id: true, user_id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Annotation not found' }, { status: 404 });
    }

    if (existing.user_id !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden: You can only delete your own annotations' }, { status: 403 });
    }

    await db.annotation.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Annotation deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
