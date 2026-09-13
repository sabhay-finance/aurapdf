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

    const where: any = { user_id: session.user.id };
    if (documentId) {
      // Verify document ownership
      const doc = await db.document.findUnique({
        where: { id: documentId },
        select: { user_id: true },
      });
      if (!doc || doc.user_id !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }
      where.document_id = documentId;
    }
    if (pageNumber) where.page_number = Number(pageNumber);

    const notes = await db.note.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        document: {
          select: { title: true },
        },
      },
    });

    return NextResponse.json({ success: true, notes });
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
    const {
      document_id,
      page_number = 1,
      selected_text,
      content,
      coordinates,
    } = body;

    if (!document_id || !content) {
      return NextResponse.json({ success: false, error: 'document_id and content are required' }, { status: 400 });
    }

    // Verify document ownership
    const doc = await db.document.findUnique({
      where: { id: document_id },
      select: { user_id: true },
    });
    if (!doc || doc.user_id !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const note = await db.note.create({
      data: {
        document_id,
        user_id: session.user.id,
        page_number: Number(page_number),
        selected_text: selected_text || null,
        content,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
      },
    });

    return NextResponse.json({ success: true, note });
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

    const existing = await db.note.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!existing || existing.user_id !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    await db.note.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Note deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
