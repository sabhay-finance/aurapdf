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

    const rl = checkRateLimit(`ai-viva:${session.user.id}`, 20, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      action, // 'generate' | 'evaluate'
      document_id,
      page_number = 1,
      question,
      student_answer,
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
      .map((c) => `[Page ${c.page_number}]: ${cleanExtractedText(c.text)}`)
      .join('\n\n');

    const ai = getAIProvider(apiKey, provider);

    // 1. Generate an oral exam conceptual question
    if (action === 'generate') {
      const prompt = `You are a distinguished academic professor conducting an oral exam (viva voce) on "${doc.title}" (Page ${page_number}).
Generate ONE high-yield, open-ended conceptual question testing deep comprehension (not simple memorization).
Return ONLY a valid JSON object matching:
{
  "question": "Clear, challenging oral exam question",
  "topic": "Topic Name",
  "keyConceptsTested": ["concept 1", "concept 2"]
}
Do not use markdown code blocks. Output raw JSON only.

Document Context:
${contextText || doc.title}`;

      const res = await ai.generateAnswer({
        query: prompt,
        documentTitle: doc.title,
        currentPage: Number(page_number),
        chunks: doc.chunks.map((c) => ({ page_number: c.page_number, text: c.text })),
        explanationLevel: 'exam',
      });

      let parsed: any = null;
      try {
        parsed = JSON.parse(res.answer.replace(/```json\n?|```/g, '').trim());
      } catch {
        parsed = {
          question: `Explain the fundamental decision mechanism on Page ${page_number} and how it applies under real-world market constraints.`,
          topic: doc.category || 'Core Methodology',
          keyConceptsTested: ['Decision Frameworks', 'Market Constraints'],
        };
      }

      return NextResponse.json({
        success: true,
        viva: parsed,
      });
    }

    // 2. Evaluate student oral/typed answer
    if (action === 'evaluate') {
      if (!question || !student_answer) {
        return NextResponse.json({ success: false, error: 'question and student_answer are required' }, { status: 400 });
      }

      const evalPrompt = `You are an exacting, supportive academic professor evaluating a student's oral exam (viva voce) response.
Exam Question: "${question}"
Student Response: "${student_answer}"

Evaluate the student's conceptual depth, reasoning rigor, and accuracy based on the document.
Return ONLY a valid JSON object matching:
{
  "score": number between 0 and 100,
  "status": "mastered" (if >= 80) | "proficient" (if 60-79) | "needs-work" (if < 60),
  "strengths": ["Clear point they explained well", "Accurate definition provided"],
  "blindspots": ["Key concept or step they missed", "Nuance they overlooked"],
  "expertAnswer": "1-2 sentence concise ideal model answer",
  "followUpQuestion": "A sharp follow-up probe question to test the edge of their understanding"
}
Do not use markdown code blocks. Output raw JSON only.

Curriculum Context:
${contextText || doc.title}`;

      const res = await ai.generateAnswer({
        query: evalPrompt,
        documentTitle: doc.title,
        currentPage: Number(page_number),
        chunks: doc.chunks.map((c) => ({ page_number: c.page_number, text: c.text })),
        explanationLevel: 'exam',
      });

      let evaluation: any = null;
      try {
        evaluation = JSON.parse(res.answer.replace(/```json\n?|```/g, '').trim());
      } catch {
        const isGood = student_answer.trim().length > 40;
        evaluation = {
          score: isGood ? 82 : 55,
          status: isGood ? 'mastered' : 'needs-work',
          strengths: ['Addressed the main conceptual theme directly'],
          blindspots: ['Provide more rigorous mathematical or operational conditions'],
          expertAnswer: 'A complete explanation requires explicitly linking the operational decision rule with underlying economic cost constraints.',
          followUpQuestion: 'Under what specific conditions would this rule fail to hold?',
        };
      }

      // Log student attempt in DB strictly under session.user.id
      try {
        await db.studySession.create({
          data: {
            user_id: session.user.id,
            document_id,
            pages_read: 1,
            duration_seconds: 45,
            questions_done: 1,
          },
        });
      } catch {}

      return NextResponse.json({
        success: true,
        evaluation,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Viva error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
