import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`study-sessions-get:${session.user.id}`, 60, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const sessions = await db.studySession.findMany({
      where: { user_id: session.user.id },
      orderBy: { started_at: 'desc' },
      take: 20,
      include: {
        document: {
          select: { title: true },
        },
      },
    });

    const totalSeconds = sessions.reduce((acc, s) => acc + s.duration_seconds, 0);
    const totalPages = sessions.reduce((acc, s) => acc + s.pages_read, 0);
    const totalQuestions = sessions.reduce((acc, s) => acc + s.questions_done, 0);

    return NextResponse.json({
      success: true,
      sessions,
      stats: {
        totalMinutes: Math.round(totalSeconds / 60),
        totalPages,
        totalQuestions,
        sessionCount: sessions.length,
      },
    });
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

    const rl = checkRateLimit(`study-sessions-post:${session.user.id}`, 60, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      document_id,
      started_at,
      ended_at = new Date(),
      pages_read = 0,
      duration_seconds = 0,
      questions_done = 0,
      flashcards_done = 0,
    } = body;

    if (!document_id) {
      return NextResponse.json({ success: false, error: 'document_id is required' }, { status: 400 });
    }

    // Verify document exists
    const doc = await db.document.findFirst({
      where: { id: document_id },
    });
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const studySession = await db.studySession.create({
      data: {
        user_id: session?.user?.id || 'demo-user-id',
        document_id,
        started_at: started_at ? new Date(started_at) : new Date(),
        ended_at: new Date(ended_at),
        pages_read: Number(pages_read),
        duration_seconds: Number(duration_seconds),
        questions_done: Number(questions_done),
        flashcards_done: Number(flashcards_done),
      },
    });

    return NextResponse.json({ success: true, session: studySession });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
