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
    const dueOnly = searchParams.get('due_only') === 'true';

    const where: any = {};
    if (documentId) {
      const doc = await db.document.findUnique({
        where: { id: documentId },
        select: { id: true },
      });
      if (!doc) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }
      where.document_id = documentId;
    }
    if (dueOnly) {
      where.next_review_at = { lte: new Date() };
    }

    const flashcards = await db.flashcard.findMany({
      where,
      orderBy: { next_review_at: 'asc' },
      include: {
        document: {
          select: { title: true },
        },
      },
    });

    return NextResponse.json({ success: true, flashcards });
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
      source_page = 1,
      question,
      answer,
      source_text,
      tags,
    } = body;

    if (!document_id || !question || !answer) {
      return NextResponse.json({ success: false, error: 'document_id, question, and answer are required' }, { status: 400 });
    }

    // Verify document exists
    const doc = await db.document.findUnique({
      where: { id: document_id },
      select: { id: true },
    });
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const card = await db.flashcard.create({
      data: {
        user_id: session?.user?.id || 'demo-user-id',
        document_id,
        source_page: Number(source_page),
        question,
        answer,
        source_text: source_text || null,
        tags: tags || null,
        difficulty: 0,
        review_count: 0,
      },
    });

    return NextResponse.json({ success: true, flashcard: card });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
