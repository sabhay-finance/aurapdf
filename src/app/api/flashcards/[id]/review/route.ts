import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { calculateNextReview } from '@/lib/study/spacedRepetition';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { rating } = body; // 1: Again, 2: Hard, 3: Good, 4: Easy

    if (!rating || rating < 1 || rating > 4) {
      return NextResponse.json({ success: false, error: 'Rating must be between 1 and 4' }, { status: 400 });
    }

    const card = await db.flashcard.findUnique({ where: { id } });
    if (!card || card.user_id !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Flashcard not found' }, { status: 404 });
    }

    const next = calculateNextReview(
      rating,
      card.interval_days,
      card.ease_factor,
      card.review_count
    );

    const updated = await db.flashcard.update({
      where: { id },
      data: {
        interval_days: next.interval_days,
        ease_factor: next.ease_factor,
        review_count: next.review_count,
        next_review_at: next.next_review_at,
        difficulty: next.difficulty,
      },
    });

    return NextResponse.json({ success: true, flashcard: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
