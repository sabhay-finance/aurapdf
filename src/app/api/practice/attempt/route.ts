import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      question_id,
      selected_answer,
      time_taken = 0,
    } = body;

    if (!question_id || !selected_answer) {
      return NextResponse.json({ success: false, error: 'question_id and selected_answer required' }, { status: 400 });
    }

    const question = await db.question.findUnique({
      where: { id: question_id },
      include: {
        document: {
          select: { user_id: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    const isCorrect = question.correct_answer.toUpperCase() === selected_answer.toUpperCase();

    const attempt = await db.attempt.create({
      data: {
        user_id: session?.user?.id || 'demo-user-id',
        question_id,
        selected_answer,
        correct: isCorrect,
        time_taken: Number(time_taken),
      },
    });

    return NextResponse.json({
      success: true,
      attempt,
      correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      source_page: question.source_page,
    });
  } catch (error: any) {
    console.error('Error recording attempt:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
