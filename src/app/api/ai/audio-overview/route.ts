import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getAIProvider } from '@/lib/ai';
import { cleanExtractedText } from '@/lib/pdf/textCleaner';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`ai-audio:${session.user.id}`, 20, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      document_id,
      page_number = 1,
      language = 'en', // 'en' | 'hinglish'
      apiKey,
      provider,
    } = body;

    if (!document_id) {
      return NextResponse.json({ success: false, error: 'document_id is required' }, { status: 400 });
    }

    const doc = await db.document.findFirst({
      where: { id: document_id },
      include: {
        chunks: {
          where: {
            page_number: {
              in: [Number(page_number), Number(page_number) + 1],
            },
          },
          take: 6,
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const contextText = doc.chunks
      .map((c) => `[Page ${c.page_number} (${c.section || 'Concept'})]:\n${cleanExtractedText(c.text)}`)
      .join('\n\n');

    const ai = getAIProvider(apiKey, provider);

    const isHinglish = language === 'hinglish';
    const systemPrompt = `You are the lead host of an elite NotebookLM-style academic audio study podcast for students studying "${doc.title}".
Generate a dynamic, captivating 90-second spoken audio study briefing for Page ${page_number}.

FORMAT & STYLE RULES:
1. Spoken Language: ${isHinglish ? 'Natural, fluent, engaging Hinglish (Hindi + English terms). Start with a warm greeting like "Namaste dosto, chaliye dekhte hain is concept me sabse important kya hai..."' : 'Crisp, engaging, authoritative modern English. Start with a warm hook like "Welcome to your AuraPDF audio brief. Today, let’s unpack..."'}
2. Pacing: Write exclusively in clean spoken sentences. Avoid bullet points, symbols, asterisks, math LaTeX formulas, or markdown tables.
3. Content:
   - Identify the core concept or decision rule.
   - Give 1 intuitive real-world analogy.
   - Highlight the critical exam trap or takeaway to remember.
4. Keep the total length around 160-220 spoken words so it reads aloud in approximately 75-90 seconds.`;

    const prompt = `${systemPrompt}\n\nDocument Context:\n${contextText || doc.title}\n\nDeliver the audio script now:`;

    let scriptText = '';
    const answerResult = await ai.generateAnswer({
      query: prompt,
      documentTitle: doc.title,
      currentPage: Number(page_number),
      chunks: doc.chunks.map((c) => ({
        page_number: c.page_number,
        section: c.section,
        text: c.text,
      })),
      explanationLevel: 'simple',
    });

    scriptText = answerResult.answer
      .replace(/[*#`_~>\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json({
      success: true,
      title: `Page ${page_number} Audio Brief`,
      script: scriptText,
      language,
      page_number: Number(page_number),
      document_title: doc.title,
    });
  } catch (error: any) {
    console.error('Audio overview error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
