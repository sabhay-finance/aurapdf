import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getAIProvider, retrieveRelevantChunks } from '@/lib/ai';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`ai-query:${session.user.id}`, 20, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      document_id,
      query,
      current_page,
      selected_text,
      explanation_level = 'standard',
      apiKey,
      provider,
    } = body;

    if (!document_id || !query) {
      return NextResponse.json({ success: false, error: 'document_id and query are required' }, { status: 400 });
    }

    // Strict ownership verification: cannot query documents belonging to other users
    const doc = await db.document.findFirst({
      where: { id: document_id, user_id: session.user.id },
      include: {
        chunks: {
          select: {
            page_number: true,
            section: true,
            text: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Retrieve relevant chunks with current page priority
    const relevantChunks = retrieveRelevantChunks(query, doc.chunks, current_page, 4);

    const aiProvider = getAIProvider();
    const result = await aiProvider.generateAnswer({
      query,
      documentTitle: doc.title,
      currentPage: current_page,
      selectedText: selected_text,
      chunks: relevantChunks,
      explanationLevel: explanation_level,
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      citations: result.citations,
      suggested_followups: result.suggested_followups,
      provider: aiProvider.name,
    });
  } catch (error: any) {
    console.error('Error in AI query:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
