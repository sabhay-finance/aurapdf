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

    const rl = checkRateLimit(`ai-explain:${session.user.id}`, 30, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      document_id,
      selected_text,
      page_number = 1,
      mode = 'explain', // 'explain' | 'simple' | 'example'
      apiKey,
      provider,
    } = body;

    if (!selected_text) {
      return NextResponse.json({ success: false, error: 'selected_text is required' }, { status: 400 });
    }

    let surroundingText = selected_text;
    if (document_id) {
      const doc = await db.document.findFirst({
        where: { id: document_id, user_id: session.user.id },
      });
      if (!doc) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }

      const pageChunk = await db.documentChunk.findFirst({
        where: { document_id, page_number },
      });
      if (pageChunk) {
        surroundingText = pageChunk.text;
      }
    }

    const ai = getAIProvider(apiKey, provider);
    const result = await ai.explainSelection({
      selectedText: selected_text,
      pageNumber: Number(page_number),
      surroundingText,
      mode,
    });

    return NextResponse.json({
      success: true,
      explanation: result.explanation,
      citations: result.citations,
      provider: ai.name,
    });
  } catch (error: any) {
    console.error('Error in explain API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
