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

    const rl = checkRateLimit(`ai-gen-flashcards:${session.user.id}`, 15, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      document_id,
      page_number,
      selected_text,
      count = 3,
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

    let chunks = await db.documentChunk.findMany({
      where,
      take: 6,
    });

    if (selected_text) {
      chunks = [
        {
          id: 'selected',
          document_id,
          page_number: page_number || 1,
          section: 'Selected Concept',
          chunk_index: 0,
          text: selected_text,
          embedding: null,
        },
        ...chunks,
      ];
    }

    const ai = getAIProvider(apiKey, provider);
    const generated = await ai.generateFlashcards({
      chunks: chunks.map((c) => ({
        page_number: c.page_number,
        section: c.section,
        text: c.text,
      })),
      count,
    });

    const savedCards = [];
    if (saveToDatabase && generated.length > 0) {
      for (const card of generated) {
        const saved = await db.flashcard.create({
          data: {
            user_id: session?.user?.id || 'demo-user-id',
            document_id,
            source_page: card.source_page,
            question: card.question,
            answer: card.answer,
            source_text: card.source_text,
            tags: card.tags,
            difficulty: 0,
            review_count: 0,
          },
        });
        savedCards.push(saved);
      }
    }

    return NextResponse.json({
      success: true,
      flashcards: saveToDatabase ? savedCards : generated,
      count: generated.length,
    });
  } catch (error: any) {
    console.error('Error generating flashcards:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
