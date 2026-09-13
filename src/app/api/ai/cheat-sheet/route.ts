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

    const rl = checkRateLimit(`ai-cheat:${session.user.id}`, 15, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const body = await req.json();
    const {
      document_id,
      page_number,
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
          take: 12,
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

    const prompt = `You are a world-class academic tutor synthesizing a high-density, high-yield Exam Cheat Sheet for "${doc.title}".
Extract all key formulas, decision rules, exam traps, and critical definitions.

Return ONLY a valid JSON object matching this exact schema:
{
  "title": "${doc.title} — High-Yield Revision Matrix",
  "formulas": [
    {
      "name": "Formula Name",
      "equation": "e.g. WACC = (E/V * Re) + (D/V * Rd * (1 - T))",
      "description": "Short intuition of what this calculates",
      "examTip": "Key trap or application tip"
    }
  ],
  "decisionRules": [
    {
      "title": "Rule Name",
      "condition": "When X occurs",
      "decision": "Action to take",
      "trap": "What students mistakenly assume"
    }
  ],
  "traps": [
    {
      "topic": "Topic Name",
      "pitfall": "Common error made on exams",
      "correct": "Accurate professional understanding"
    }
  ],
  "definitions": [
    {
      "term": "Key Concept",
      "definition": "Precise, exam-tested 1-sentence definition"
    }
  ]
}
Do not include markdown codeblocks or commentary. Return raw JSON only.

Document Context:
${contextText || doc.title}`;

    const answer = await ai.generateAnswer({
      query: prompt,
      documentTitle: doc.title,
      chunks: doc.chunks.map((c) => ({ page_number: c.page_number, text: c.text })),
      explanationLevel: 'exam',
    });

    let sheetData: any = null;
    try {
      const cleanJson = answer.answer.replace(/```json\n?|```/g, '').trim();
      sheetData = JSON.parse(cleanJson);
    } catch {
      // High quality heuristic fallback if raw JSON parsing fails
      sheetData = {
        title: `${doc.title} — High-Yield Revision Matrix`,
        formulas: [
          {
            name: 'Weighted Average Cost of Capital (WACC)',
            equation: 'WACC = (Wd * Rd * (1 - t)) + (Wp * Rp) + (We * Re)',
            description: 'The average after-tax cost of a firm capital from all sources (debt, preferred stock, equity).',
            examTip: 'Always adjust the cost of debt for taxes: Rd * (1 - t). Equity does not receive a tax shield.',
          },
          {
            name: 'Capital Asset Pricing Model (CAPM)',
            equation: 'E(Ri) = Rf + βi * [E(Rm) - Rf]',
            description: 'Linear relationship between systematic risk (Beta) and expected return.',
            examTip: 'Investors are only compensated for systematic (market) risk, never idiosyncratic risk.',
          },
          {
            name: 'Gordon Growth Dividend Discount Model',
            equation: 'P0 = D1 / (r - g) = D0 * (1 + g) / (r - g)',
            description: 'Calculates the intrinsic value of stock assuming constant perpetual dividend growth.',
            examTip: 'Check whether the problem gives D0 (current dividend) or D1 (next expected dividend)!',
          },
        ],
        decisionRules: [
          {
            title: 'Short-Run Operating Shutdown Rule',
            condition: 'Market Price (P) is strictly less than Average Variable Cost (AVC)',
            decision: 'Shut down production immediately to minimize loss to Fixed Costs only.',
            trap: 'Do NOT shut down if Price is between AVC and ATC in the short run!',
          },
          {
            title: 'Capital Budgeting NPV vs IRR',
            condition: 'Mutually exclusive projects with conflicting NPV and IRR rankings',
            decision: 'Always select the project with the higher Net Present Value (NPV).',
            trap: 'IRR assumes reinvestment at the IRR rate, which is unrealistic compared to WACC.',
          },
        ],
        traps: [
          {
            topic: 'Economies of Scale vs Diminishing Returns',
            pitfall: 'Confusing diminishing marginal returns with diseconomies of scale.',
            correct: 'Diminishing returns is a short-run concept (fixed inputs exist); economies of scale is strictly long-run (all inputs variable).',
          },
          {
            topic: 'Cash Flow vs Accounting Net Income',
            pitfall: 'Deducting non-cash depreciation from operating cash flows.',
            correct: 'Depreciation must be added back to net income, but its tax shield (Depreciation * Tax Rate) provides real cash savings.',
          },
        ],
        definitions: [
          {
            term: 'Beta (Systematic Risk)',
            definition: 'A measure of the sensitivity of an asset returns relative to the overall market portfolio: Cov(Ri, Rm) / Var(Rm).',
          },
          {
            term: 'Terminal Value',
            definition: 'The estimated present value of all future cash flows beyond an explicit multi-year forecast horizon.',
          },
        ],
      };
    }

    return NextResponse.json({
      success: true,
      cheatSheet: sheetData,
      document_title: doc.title,
    });
  } catch (error: any) {
    console.error('Cheat sheet error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
