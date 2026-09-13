import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { analyzeTopicPerformance } from '@/lib/study/weakTopics';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`analytics-weak:${session.user.id}`, 30, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('document_id');

    const where: any = { user_id: session.user.id };
    if (documentId) {
      // Verify document ownership
      const doc = await db.document.findFirst({
        where: { id: documentId, user_id: session.user.id },
      });
      if (!doc) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }
      where.question = { document_id: documentId };
    }

    const attempts = await db.attempt.findMany({
      where,
      include: {
        question: {
          select: {
            topic: true,
            source_page: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const analysis = analyzeTopicPerformance(attempts);

    return NextResponse.json({
      success: true,
      analysis,
      totalAttempts: attempts.length,
    });
  } catch (error: any) {
    console.error('Error analyzing weak topics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
