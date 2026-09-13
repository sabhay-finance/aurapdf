import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AuraPDF Study database...');

  // 1. Create or ensure Demo User
  const user = await prisma.user.upsert({
    where: { email: 'student@aura.study' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'student@aura.study',
      name: 'Alex Vance',
    },
  });

  // 2. Create Sample Document
  const document = await prisma.document.upsert({
    where: { id: 'cfa-equity-valuation' },
    update: {
      file_url: '/samples/equity_valuation.pdf',
      page_count: 8,
    },
    create: {
      id: 'cfa-equity-valuation',
      user_id: user.id,
      title: 'Equity Valuation & Financial Analysis (CFA Level I)',
      file_url: '/samples/equity_valuation.pdf',
      file_size: 11200,
      page_count: 8,
      last_page: 2,
      is_favorite: true,
      folder: 'CFA Exam Prep',
    },
  });

  // 3. Document Pages and Chunks text data
  const pageTexts = [
    {
      pageNumber: 1,
      text: 'CFA Level I Study Program. Equity Valuation & Financial Analysis. Volume 4: Corporate Finance & Asset Valuation Frameworks. Welcome to the comprehensive study module on Equity Valuation. Candidates explore fundamental valuation principles, discounted cash flow (DCF) models, multi-stage dividend discount techniques, WACC, and Terminal Value computations.',
      section: 'Overview & Learning Objectives',
    },
    {
      pageNumber: 2,
      text: 'Chapter 1: Foundations of Intrinsic Value. Intrinsic value represents the estimated true or fundamental value of an asset based on complete analysis of its qualitative and quantitative characteristics, independent of current market quotation. An equity security is said to be undervalued if market price is lower than intrinsic value, and overvalued if market price exceeds intrinsic value. Alpha = Realized Return - Expected Return (based on CAPM). E(R) = Rf + Beta * [E(Rm) - Rf].',
      section: 'Chapter 1: Foundations of Intrinsic Value',
    },
    {
      pageNumber: 3,
      text: 'Chapter 2: Discounted Cash Flow (DCF) Valuation. The Discounted Cash Flow approach values an asset based on the present value of its expected future cash flows, discounted at a rate reflecting riskiness. Free Cash Flow to Firm (FCFF) = NI + NCC + Int * (1 - TaxRate) - FCInv - WCInv. Free Cash Flow to Equity (FCFE) = FCFF - Int * (1 - TaxRate) + Net Borrowing.',
      section: 'Chapter 2: Discounted Cash Flow Valuation',
    },
    {
      pageNumber: 4,
      text: 'Chapter 3: Weighted Average Cost of Capital (WACC). The Weighted Average Cost of Capital is the overall required rate of return of a firm, weighted according to the market values of its debt and equity financing components. WACC = (Wd * Rd * (1 - t)) + (We * Re) + (Wp * Rp). Because interest payments on debt are tax-deductible, after-tax cost of debt is Rd * (1 - t). Pitfalls: Employing book value weights instead of market value weights.',
      section: 'Chapter 3: Weighted Average Cost of Capital (WACC)',
    },
    {
      pageNumber: 5,
      text: 'Chapter 4: Terminal Value & Long-Term Growth. In a standard two-stage DCF, detailed forecasts are formulated for an explicit forecast horizon. The Terminal Value captures cash flows beyond this window. Gordon Growth Model for Terminal Value: TV_n = (FCFF_(n+1)) / (WACC - g), where g must not exceed the sustainable macroeconomic growth rate (2% - 3.5%). Exit Multiple Approach: TV_n = EBITDA_n * Benchmark Multiple.',
      section: 'Chapter 4: Terminal Value & Long-Term Growth',
    },
    {
      pageNumber: 6,
      text: 'Chapter 5: Market Multiples & Relative Valuation. Relative valuation compares a company price to an underlying financial metric across peers. Price-to-Earnings (P/E), EV/EBITDA. Enterprise Value = Market Capitalization + Total Debt + Preferred Stock - Cash & Investments.',
      section: 'Chapter 5: Market Multiples',
    },
    {
      pageNumber: 7,
      text: 'Chapter 6: Practice Examination Questions. Question 1 (Topic: WACC): 40% debt, 60% equity, pre-tax cost of debt 6%, cost of equity 11%, tax rate 25%. WACC = 8.40%. Question 2 (Topic: Terminal Value): When g exceeds r, Gordon Growth model produces undefined or negative valuation. Question 3 (Topic: Intrinsic Value): Fundamental value based on future cash flows and qualitative characteristics.',
      section: 'Chapter 6: Practice Examination Questions',
    },
    {
      pageNumber: 8,
      text: 'Formula Summary Cheat Sheet. 1. CAPM: Re = Rf + Beta*(Rm - Rf). 2. WACC: [Wd*Rd*(1 - t)] + [We*Re]. 3. Gordon Growth: P0 = D1 / (r - g). 4. FCFF: NI + NCC + Int*(1-t) - FCInv - WCInv. 5. Enterprise Value: Market Cap + Total Debt + Preferred - Cash.',
      section: 'Formula Summary Cheat Sheet',
    },
  ];

  for (const p of pageTexts) {
    await prisma.documentPage.upsert({
      where: {
        document_id_page_number: {
          document_id: document.id,
          page_number: p.pageNumber,
        },
      },
      update: { text: p.text },
      create: {
        document_id: document.id,
        page_number: p.pageNumber,
        text: p.text,
        width: 612,
        height: 792,
      },
    });

    await prisma.documentChunk.deleteMany({
      where: { document_id: document.id, page_number: p.pageNumber },
    });

    await prisma.documentChunk.create({
      data: {
        document_id: document.id,
        page_number: p.pageNumber,
        section: p.section,
        chunk_index: 0,
        text: p.text,
      },
    });
  }

  // 4. Create Topics
  const topicNames = [
    { name: 'Weighted Average Cost of Capital (WACC)', desc: 'Financing weights, tax shields, and overall cost of capital' },
    { name: 'Terminal Value & Multi-Stage Growth', desc: 'Gordon growth perpetual horizon and exit multiples' },
    { name: 'Discounted Cash Flow (DCF)', desc: 'FCFF, FCFE, and cash flow discounting mechanisms' },
    { name: 'Intrinsic Value & CAPM', desc: 'Fundamental valuation vs market price, alpha generation' },
  ];

  const createdTopics: Record<string, string> = {};
  for (const t of topicNames) {
    const topic = await prisma.topic.upsert({
      where: {
        document_id_name: {
          document_id: document.id,
          name: t.name,
        },
      },
      update: {},
      create: {
        document_id: document.id,
        name: t.name,
        description: t.desc,
      },
    });
    createdTopics[t.name] = topic.id;
  }

  // 5. Create Flashcards
  const flashcardsData = [
    {
      source_page: 2,
      question: 'What is intrinsic value in equity analysis?',
      answer: 'The estimated true or fundamental value of an asset based on qualitative and quantitative factors, independent of current market price.',
      source_text: 'Intrinsic value represents the estimated true or fundamental value of an asset...',
      difficulty: 2,
      review_count: 3,
      tags: 'Foundations, Valuation',
    },
    {
      source_page: 4,
      question: 'What is the standard formula for Weighted Average Cost of Capital (WACC)?',
      answer: 'WACC = (Wd * Rd * (1 - t)) + (We * Re) + (Wp * Rp)',
      source_text: 'WACC = (Wd * Rd * (1 - t)) + (We * Re) + (Wp * Rp)',
      difficulty: 1,
      review_count: 1,
      tags: 'WACC, Formulas',
    },
    {
      source_page: 4,
      question: 'Why is the cost of debt adjusted by (1 - t) in WACC?',
      answer: 'Because interest payments on debt are tax-deductible in most jurisdictions, providing an interest tax shield that reduces after-tax debt financing cost.',
      source_text: 'Because interest payments on debt are tax-deductible in most jurisdictions...',
      difficulty: 1,
      review_count: 2,
      tags: 'WACC, Taxes',
    },
    {
      source_page: 5,
      question: 'What is the Gordon Growth Model equation for Terminal Value?',
      answer: 'Terminal Value (TV_n) = (FCFF_(n+1)) / (WACC - g)',
      source_text: 'Terminal Value (TV_n) = (FCFF_(n+1)) / (WACC - g)',
      difficulty: 1,
      review_count: 1,
      tags: 'Terminal Value, DCF',
    },
  ];

  for (const fc of flashcardsData) {
    const existing = await prisma.flashcard.findFirst({
      where: { document_id: document.id, question: fc.question },
    });
    if (!existing) {
      await prisma.flashcard.create({
        data: {
          user_id: user.id,
          document_id: document.id,
          source_page: fc.source_page,
          question: fc.question,
          answer: fc.answer,
          difficulty: fc.difficulty,
          review_count: fc.review_count,
          source_text: fc.source_text,
          tags: fc.tags,
        },
      });
    }
  }

  // 6. Create Questions and initial Attempts for weak topic modeling
  const questionsData = [
    {
      source_page: 4,
      topic: 'Weighted Average Cost of Capital (WACC)',
      question: 'A company has a target capital structure of 40% debt and 60% equity. Its pre-tax cost of debt is 6%, its cost of equity is 11%, and its marginal tax rate is 25%. What is the company WACC?',
      options: JSON.stringify([
        { key: 'A', text: '7.80%' },
        { key: 'B', text: '8.40%' },
        { key: 'C', text: '9.00%' },
        { key: 'D', text: '9.50%' },
      ]),
      correct_answer: 'B',
      explanation: 'WACC = (0.40 * 0.06 * (1 - 0.25)) + (0.60 * 0.11) = (0.40 * 0.045) + 0.066 = 0.018 + 0.066 = 0.084 (8.40%).',
      difficulty: 'standard',
    },
    {
      source_page: 4,
      topic: 'Weighted Average Cost of Capital (WACC)',
      question: 'When estimating component weights for a firm WACC, which weights are theoretically preferred?',
      options: JSON.stringify([
        { key: 'A', text: 'Historical book value of debt and equity' },
        { key: 'B', text: 'Target market values of debt and equity' },
        { key: 'C', text: 'Replacement cost of physical assets' },
        { key: 'D', text: 'Regulatory capital minimums' },
      ]),
      correct_answer: 'B',
      explanation: 'Market value weights capture the current economic opportunity cost of capital committed to the firm.',
      difficulty: 'standard',
    },
    {
      source_page: 5,
      topic: 'Terminal Value & Multi-Stage Growth',
      question: 'In a Gordon Growth Model valuation, if perpetual growth rate (g) exceeds the discount rate (r), what occurs?',
      options: JSON.stringify([
        { key: 'A', text: 'The valuation asymptotically approaches zero' },
        { key: 'B', text: 'The formula yields an undefined or negative economic value' },
        { key: 'C', text: 'Value stabilizes at enterprise book equity' },
        { key: 'D', text: 'The valuation equals the risk-free rate' },
      ]),
      correct_answer: 'B',
      explanation: 'If g >= r, the denominator (r - g) becomes zero or negative, making the model mathematically invalid.',
      difficulty: 'exam',
    },
    {
      source_page: 2,
      topic: 'Intrinsic Value & CAPM',
      question: 'Under CAPM, if Beta is 1.2, Risk-Free rate is 3%, and Expected Market Return is 8%, what is expected return?',
      options: JSON.stringify([
        { key: 'A', text: '8.4%' },
        { key: 'B', text: '9.0%' },
        { key: 'C', text: '9.6%' },
        { key: 'D', text: '10.2%' },
      ]),
      correct_answer: 'B',
      explanation: 'E(R) = 3% + 1.2 * (8% - 3%) = 3% + 1.2 * 5% = 3% + 6% = 9.0%.',
      difficulty: 'standard',
    },
  ];

  for (const q of questionsData) {
    const existing = await prisma.question.findFirst({
      where: { document_id: document.id, question: q.question },
    });
    const questionRecord = existing ?? (await prisma.question.create({
      data: {
        user_id: user.id,
        document_id: document.id,
        source_page: q.source_page,
        topic: q.topic,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      },
    }));

    // Record realistic historical attempts to seed weak topics
    if (q.topic === 'Weighted Average Cost of Capital (WACC)') {
      // 3 incorrect out of 7 attempts -> ~43%
      const count = await prisma.attempt.count({ where: { question_id: questionRecord.id } });
      if (count === 0) {
        await prisma.attempt.createMany({
          data: [
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'A', correct: false, time_taken: 42 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'B', correct: true, time_taken: 35 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'C', correct: false, time_taken: 50 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'B', correct: true, time_taken: 28 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'A', correct: false, time_taken: 44 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'D', correct: false, time_taken: 39 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'B', correct: true, time_taken: 31 },
          ],
        });
      }
    } else if (q.topic === 'Terminal Value & Multi-Stage Growth') {
      const count = await prisma.attempt.count({ where: { question_id: questionRecord.id } });
      if (count === 0) {
        await prisma.attempt.createMany({
          data: [
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'B', correct: true, time_taken: 38 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'A', correct: false, time_taken: 55 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'B', correct: true, time_taken: 40 },
          ],
        });
      }
    } else if (q.topic === 'Intrinsic Value & CAPM') {
      const count = await prisma.attempt.count({ where: { question_id: questionRecord.id } });
      if (count === 0) {
        await prisma.attempt.createMany({
          data: [
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'B', correct: true, time_taken: 22 },
            { user_id: user.id, question_id: questionRecord.id, selected_answer: 'B', correct: true, time_taken: 19 },
          ],
        });
      }
    }
  }

  // 7. Initial Sample Notes
  const existingNote = await prisma.note.findFirst({ where: { document_id: document.id } });
  if (!existingNote) {
    await prisma.note.create({
      data: {
        user_id: user.id,
        document_id: document.id,
        page_number: 4,
        selected_text: 'Because interest payments on debt are tax-deductible...',
        content: 'Remember the tax shield: Rd*(1-t). Only debt has this deduction, never equity!',
        coordinates: JSON.stringify({ x: 0.1, y: 0.45 }),
      },
    });
  }

  // 8. Initial Sample Annotations (subtle highlight on page 2)
  const existingAnno = await prisma.annotation.findFirst({ where: { document_id: document.id } });
  if (!existingAnno) {
    await prisma.annotation.create({
      data: {
        user_id: user.id,
        document_id: document.id,
        page_number: 2,
        type: 'highlight',
        coordinates: JSON.stringify({ x: 0.08, y: 0.18, width: 0.84, height: 0.06 }),
        color: 'rgba(245, 205, 71, 0.35)',
      },
    });
  }

  // 9. Seed / Backfill DocumentFile binary table
  const samplePdfPath = path.join(process.cwd(), 'public', 'samples', 'equity_valuation.pdf');
  if (fs.existsSync(samplePdfPath)) {
    const sampleBuffer = fs.readFileSync(samplePdfPath);
    await prisma.documentFile.upsert({
      where: { document_id: document.id },
      update: { data: sampleBuffer },
      create: {
        document_id: document.id,
        data: sampleBuffer,
      },
    });
    console.log('   📄 Seeded binary for cfa-equity-valuation.');
  }

  // Backfill any existing library documents from storage/uploads
  const allDocs = await prisma.document.findMany({
    include: { file_data: { select: { id: true } } },
  });

  for (const doc of allDocs) {
    if (!doc.file_data) {
      const filename = path.basename(doc.file_url);
      const candidates = [
        path.join(process.cwd(), 'storage', 'uploads', filename),
        path.join(process.cwd(), 'public', 'samples', filename),
        path.join('/tmp', 'storage', 'uploads', filename),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          const buf = fs.readFileSync(cand);
          await prisma.documentFile.create({
            data: {
              document_id: doc.id,
              data: buf,
            },
          });
          console.log(`   📦 Backfilled binary into DB for doc "${doc.title}" (${buf.byteLength} bytes)`);
          break;
        }
      }
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
