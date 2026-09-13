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
    const topic = searchParams.get('topic');
    const pageNumber = searchParams.get('page_number');

    // Scoped strictly to documents belonging to the authenticated user
    const where: any = {
      document: {
        user_id: session.user.id,
      },
    };

    if (documentId) {
      const doc = await db.document.findUnique({
        where: { id: documentId },
        select: { user_id: true },
      });
      if (!doc || doc.user_id !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }
      where.document_id = documentId;
    }
    if (topic) where.topic = topic;
    if (pageNumber) where.source_page = Number(pageNumber);

    const questions = await db.question.findMany({
      where,
      orderBy: { created_at: 'asc' },
      include: {
        document: {
          select: { title: true },
        },
        attempts: {
          where: { user_id: session.user.id },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    const parsed = questions.map((q) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));

    return NextResponse.json({ success: true, questions: parsed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
