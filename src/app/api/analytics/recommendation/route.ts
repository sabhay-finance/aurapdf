import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { analyzeTopicPerformance } from '@/lib/study/weakTopics';
import { generateStudyRecommendation } from '@/lib/study/recommendation';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`analytics-rec:${session.user.id}`, 30, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const minutes = Number(searchParams.get('minutes')) || 45;

    // Get the most recent document owned by authenticated user
    const doc = await db.document.findFirst({
      where: { user_id: userId },
      orderBy: { last_opened_at: 'desc' },
    });

    if (!doc) {
      return NextResponse.json({
        success: false,
        error: 'No documents found to generate recommendations.',
      });
    }

    // Get attempts for this document
    const attempts = await db.attempt.findMany({
      where: {
        user_id: userId,
        question: { document_id: doc.id },
      },
      include: {
        question: {
          select: {
            topic: true,
            source_page: true,
          },
        },
      },
    });

    const topicAnalysis = analyzeTopicPerformance(attempts);

    // Count due flashcards
    const dueFlashcardsCount = await db.flashcard.count({
      where: {
        user_id: userId,
        document_id: doc.id,
        next_review_at: { lte: new Date() },
      },
    });

    const recommendation = generateStudyRecommendation({
      availableMinutes: minutes,
      documentId: doc.id,
      documentTitle: doc.title,
      currentPage: doc.last_page || 1,
      totalPages: doc.page_count || 8,
      topicAnalysis,
      dueFlashcardsCount,
    });

    return NextResponse.json({ success: true, recommendation });
  } catch (error: any) {
    console.error('Error generating recommendation:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
