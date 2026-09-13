import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getAIProvider } from '@/lib/ai';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`ai-gen-questions:${session.user.id}`, 15, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      document_id,
      page_number,
      count = 2,
      difficulty = 'standard',
      apiKey,
      provider,
      saveToDatabase = true,
    } = body;

    if (!document_id) {
      return NextResponse.json({ success: false, error: 'document_id is required' }, { status: 400 });
    }

    // Document check
    const doc = await db.document.findFirst({
      where: { id: document_id },
    });
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const where: any = { document_id };
    if (page_number) where.page_number = Number(page_number);

    const chunks = await db.documentChunk.findMany({
      where,
      take: 6,
    });

    const ai = getAIProvider(apiKey, provider);
    const questions = await ai.generateQuestions({
      chunks: chunks.map((c) => ({
        page_number: c.page_number,
        section: c.section,
        text: c.text,
      })),
      count,
      difficulty,
    });

    const savedQuestions = [];
    if (saveToDatabase && questions.length > 0) {
      for (const q of questions) {
        const saved = await db.question.create({
          data: {
            user_id: session?.user?.id || 'demo-user-id',
            document_id,
            source_page: q.source_page,
            topic: q.topic,
            question: q.question,
            options: JSON.stringify(q.options),
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            difficulty,
          },
        });
        savedQuestions.push(saved);
      }
    }

    return NextResponse.json({
      success: true,
      questions: saveToDatabase ? savedQuestions : questions,
      count: questions.length,
    });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
