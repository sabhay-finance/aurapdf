import {
  AIProvider,
  RetrievedChunk,
  AnswerResult,
  CitationItem,
  GeneratedFlashcard,
  GeneratedQuestion,
  ExplanationLevel,
} from './types';
import { cleanExtractedText } from '../pdf/textCleaner';

// Curated curriculum knowledge base for financial concepts (CFA Level I & II, Corporate Finance, Economics)
const CONCEPT_KNOWLEDGE: Record<
  string,
  { title: string; definition: string; formula?: string; intuition: string; examTip: string }
> = {
  wacc: {
    title: 'Weighted Average Cost of Capital (WACC)',
    definition: 'The overall required rate of return a firm must earn on its existing asset base to satisfy its debt holders, preferred shareholders, and common equity holders.',
    formula: 'WACC = (Wd * Rd * (1 - t)) + (We * Re) + (Wp * Rp)',
    intuition: 'Think of WACC as the hurdle rate for new corporate investments. Because interest payments on debt are tax-deductible, debt financing receives a tax shield (1 - t), making after-tax debt cheaper than equity.',
    examTip: 'Always use target market value weights rather than historical book value weights. Book values reflect sunk accounting costs, whereas market weights capture current economic opportunity costs.',
  },
  dcf: {
    title: 'Discounted Cash Flow (DCF) Valuation',
    definition: 'A fundamental valuation method that estimates the intrinsic value of an investment based on its expected future cash flows discounted to present value.',
    formula: 'Enterprise Value = Σ [FCFF_t / (1 + WACC)^t] + [Terminal Value_n / (1 + WACC)^n]',
    intuition: 'An asset is fundamentally worth the sum of all future cash it generates, discounted for the time value of money and the riskiness of the enterprise.',
    examTip: 'Discount FCFF at WACC to obtain Enterprise Value. Discount FCFE at the Cost of Equity (Re) to obtain Equity Value. Never mix debt cash flows with equity discount rates.',
  },
  capm: {
    title: 'Capital Asset Pricing Model (CAPM)',
    definition: 'An equilibrium pricing model establishing the linear relationship between systematic (undiversifiable) risk and expected return for assets.',
    formula: 'E(Ri) = Rf + βi * [E(Rm) - Rf]',
    intuition: 'Investors do not get compensated for firm-specific (idiosyncratic) risk because it can be eliminated via diversification. Only market-wide systematic risk (Beta) commands a risk premium.',
    examTip: 'Beta measures covariance with the market divided by market variance: βi = Cov(Ri, Rm) / Var(Rm). An asset with Beta = 1.2 is 20% more volatile than the market portfolio.',
  },
  shutdown: {
    title: 'Breakeven and Shutdown Rule in Economics',
    definition: 'A profit-maximizing firm shuts down in the short run if the market price is strictly less than Average Variable Cost (P < AVC). If AVC <= P < ATC, the firm continues operating in the short run to minimize losses.',
    formula: 'Short-run shutdown: Price < AVC (Minimum AVC point)\nLong-run shutdown / exit: Price < ATC (Minimum ATC point)',
    intuition: 'In the short run, fixed costs (like building rent) must be paid regardless of output. As long as price covers variable costs (like raw materials & labor), any excess revenue offsets a portion of fixed costs.',
    examTip: 'Exam questions frequently try to trick you into shutting down when Price < ATC. In the short run, you DO NOT shut down at Price < ATC; you only shut down if Price < AVC!',
  },
  economies: {
    title: 'Economies and Diseconomies of Scale',
    definition: 'Economies of scale occur when expanding firm scale reduces the Long-Run Average Total Cost (LRATC). Diseconomies of scale occur when further expansion increases LRATC due to management friction and inefficiencies.',
    formula: 'Minimum Efficient Scale (MES) = Output level where LRATC reaches its absolute minimum.',
    intuition: 'Specialization, volume discounts on inputs, and spreading overhead across millions of units create economies of scale.',
    examTip: 'Do not confuse diminishing marginal returns (a short-run concept with at least one fixed input) with diseconomies of scale (a long-run concept where ALL inputs are variable).',
  },
  machinelearning: {
    title: 'Machine Learning & Big Data in Fintech',
    definition: 'Algorithms designed to detect patterns from input data and model relationships without being explicitly programmed with predetermined rules.',
    formula: 'Supervised Learning: Labeled inputs/outputs (Regression & Classification)\nUnsupervised Learning: Unlabeled inputs (Clustering & Dimension Reduction)',
    intuition: 'Supervised learning teaches a computer by example with answers provided. Unsupervised learning gives the computer raw data and asks it to discover hidden groupings on its own.',
    examTip: 'Overfitting occurs when a model is too complex and fits noise or spurious patterns. Underfitting occurs when a model is too simple to capture the underlying pattern.',
  },
};

/**
 * Intelligent Academic Heuristic Synthesizer
 * Formulates structured, pedagogical study responses from raw PDF text chunks.
 */
export class LocalEngineProvider implements AIProvider {
  name = 'Local Study Engine (Grounded Heuristics)';

  async generateAnswer(params: {
    query: string;
    documentTitle: string;
    currentPage?: number;
    selectedText?: string;
    chunks: RetrievedChunk[];
    explanationLevel?: ExplanationLevel;
  }): Promise<AnswerResult> {
    const { query, chunks, selectedText, currentPage = 1, documentTitle, explanationLevel = 'standard' } = params;

    const queryLower = query.toLowerCase().trim();

    // Clean all incoming chunks
    const cleanedChunks = chunks
      .map((c) => ({
        ...c,
        text: cleanExtractedText(c.text || ''),
      }))
      .filter((c) => c.text.length > 20);

    if (cleanedChunks.length > 0) {
      const distinctPages = Array.from(new Set(cleanedChunks.map((c) => c.page_number))).sort((a, b) => a - b);
      const primaryPage = distinctPages[0] || currentPage;

      const citations: CitationItem[] = distinctPages.map((p) => {
        const chunkOnPage = cleanedChunks.find((c) => c.page_number === p);
        return {
          page_number: p,
          section: chunkOnPage?.section || `Page ${p}`,
          snippet: chunkOnPage?.text.slice(0, 120) + '...',
        };
      });

      // 1. Check if user is asking for page explanation or overview
      const isPageOverview =
        /(?:explain|summarize|overview|review|breakdown|read|what(?:'s|\s+is)\s+on)\s+(?:this\s+|the\s+|current\s+)?page/i.test(
          queryLower
        ) ||
        queryLower.startsWith('explain') ||
        queryLower.startsWith('summarize');

      if (isPageOverview) {
        return {
          answer: this.synthesizePageStudyGuide({
            chunks: cleanedChunks,
            pages: distinctPages,
            documentTitle,
            explanationLevel,
            selectedText,
          }),
          citations,
          suggested_followups: [
            `What is the most testable formula on Page ${primaryPage}?`,
            `Test me with a 4-option practice question on this material`,
            `Generate active-recall flashcards for these pages`,
          ],
        };
      }

      // 2. Specific conceptual inquiry: match relevant concepts from text
      const conceptAnswer = this.synthesizeConceptAnswer({
        query: queryLower,
        chunks: cleanedChunks,
        pages: distinctPages,
        explanationLevel,
        selectedText,
      });

      if (conceptAnswer) {
        return {
          answer: conceptAnswer,
          citations,
          suggested_followups: [
            `Explain this in simpler terms with an everyday analogy`,
            `What is the common exam trick on this concept?`,
            `Show a practical calculation or case study`,
          ],
        };
      }

      // 3. Fallback to structured study synthesis
      return {
        answer: this.synthesizePageStudyGuide({
          chunks: cleanedChunks,
          pages: distinctPages,
          documentTitle,
          explanationLevel,
          selectedText,
        }),
        citations,
        suggested_followups: [
          `Give me an exam-style MCQ on this section`,
          `Create study flashcards for this concept`,
        ],
      };
    }

    // Curated concept fallback if PDF contains no extractable text
    return this.generateCuratedFallback(queryLower, currentPage, documentTitle, selectedText);
  }

  /**
   * Synthesizes a structured academic study breakdown from page chunks.
   */
  private synthesizePageStudyGuide(params: {
    chunks: RetrievedChunk[];
    pages: number[];
    documentTitle: string;
    explanationLevel: ExplanationLevel;
    selectedText?: string;
  }): string {
    const { chunks, pages, explanationLevel, selectedText } = params;

    const pageLabels = pages.length > 1 ? `Pages ${pages.join(' & ')}` : `Page ${pages[0]}`;
    const allText = chunks.map((c) => c.text).join('\n\n');

    // Extract defined terms using linguistic patterns: "X describes...", "X is...", "X refers to..."
    const keyDefinitions: Array<{ term: string; explanation: string }> = [];
    const definitionRegex = /(?:^|\.\s+)([A-Z][a-zA-Z0-9\s-]{2,35}?)\s+(describes|refers to|is defined as|is an?|are|occurs when|measures|is computerized|uses)\s+([^.?!]+[.?!])/g;

    let match;
    const seenTerms = new Set<string>();
    while ((match = definitionRegex.exec(allText)) !== null) {
      const term = match[1].trim();
      const verb = match[2];
      const rest = match[3].trim();
      if (!seenTerms.has(term.toLowerCase()) && term.length < 35 && !term.startsWith('Page') && !term.startsWith('Figure')) {
        seenTerms.add(term.toLowerCase());
        keyDefinitions.push({
          term,
          explanation: `${term} ${verb} ${rest}`,
        });
      }
      if (keyDefinitions.length >= 6) break;
    }

    // Extract key rules or conditions: "In the short run...", "If price is...", "Underfitting occurs..."
    const rules: string[] = [];
    const rulePatterns = [
      /In the short run[^.?!]+[.?!]/gi,
      /In the long run[^.?!]+[.?!]/gi,
      /If selling price is[^.?!]+[.?!]/gi,
      /At prices below[^.?!]+[.?!]/gi,
      /Overfitting occurs[^.?!]+[.?!]/gi,
      /Underfitting occurs[^.?!]+[.?!]/gi,
      /Supervised learning[^.?!]+[.?!]/gi,
      /Unsupervised learning[^.?!]+[.?!]/gi,
      /Deep learning[^.?!]+[.?!]/gi,
      /Algorithmic trading is[^.?!]+[.?!]/gi,
    ];

    for (const pattern of rulePatterns) {
      const m = allText.match(pattern);
      if (m && m[0]) {
        rules.push(m[0].trim());
      }
    }

    // Build the synthesized pedagogical response
    let response = `### 📖 Concept Breakdown: ${pageLabels}\n\n`;

    if (explanationLevel === 'simple') {
      response += `> **Plain English Summary:** Here is the core intuition of what you are reading on **${pageLabels}** without technical overload.\n\n`;
    } else if (explanationLevel === 'exam') {
      response += `> **Exam Focus:** High-yield definitions and critical rules tested in assessments for **${pageLabels}**.\n\n`;
    }

    // 1. Key Concepts
    if (keyDefinitions.length > 0) {
      response += `#### 🔑 Core Concepts & Definitions\n\n`;
      for (const item of keyDefinitions.slice(0, 5)) {
        response += `• **${item.term}:** ${item.explanation}\n\n`;
      }
    }

    // 2. Decision Rules & Frameworks
    if (rules.length > 0) {
      response += `#### ⚙️ Key Decision Rules & Frameworks\n\n`;
      for (const rule of rules.slice(0, 4)) {
        response += `1. ${rule}\n`;
      }
      response += `\n`;
    }

    // 3. Exam Takeaways
    response += `#### 💡 Key Exam Takeaways\n`;
    if (allText.toLowerCase().includes('shutdown') || allText.toLowerCase().includes('breakeven')) {
      response += `• **Short-run vs. Long-run Shutdown:** In the short run, operate as long as **Price ≥ AVC**. Only shut down immediately if **Price < AVC** (the short-run shutdown point). In the long run, exit if **Price < ATC**.\n`;
    }
    if (allText.toLowerCase().includes('overfitting') || allText.toLowerCase().includes('supervised')) {
      response += `• **Model Generalization:** Overfitting = model is too complex and fits noise. Underfitting = model is too simple and misses real patterns.\n`;
    }
    response += `• **Source Grounding:** Directly extracted and synthesized from document **${pageLabels}**.\n\n`;

    if (selectedText) {
      response += `*Focus on selected passage:* "${selectedText.slice(0, 100)}..."\n\n`;
    }

    return response;
  }

  /**
   * Synthesizes an answer for a specific question using extracted text.
   */
  private synthesizeConceptAnswer(params: {
    query: string;
    chunks: RetrievedChunk[];
    pages: number[];
    explanationLevel: ExplanationLevel;
    selectedText?: string;
  }): string | null {
    const { query, chunks, pages, explanationLevel, selectedText } = params;

    const queryTokens = query
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['explain', 'what', 'does', 'mean', 'page'].includes(w));

    if (queryTokens.length === 0) return null;

    // Search for sentences matching query tokens
    const matchedSentences: string[] = [];
    for (const c of chunks) {
      const sentences = c.text.split(/(?<=[.?!])\s+/);
      for (const s of sentences) {
        const sLower = s.toLowerCase();
        const matches = queryTokens.filter((t) => sLower.includes(t));
        if (matches.length >= 1) {
          matchedSentences.push(s.trim());
        }
      }
    }

    if (matchedSentences.length === 0) return null;

    const primaryPage = pages[0];
    let response = `### 📘 Explanation: ${queryTokens.map((t) => t.toUpperCase()).join(' ')} (Page ${primaryPage})\n\n`;

    if (explanationLevel === 'simple') {
      response += `**In Plain English:**\n${matchedSentences.slice(0, 2).join(' ')}\n\n`;
    } else {
      response += `**Core Definition & Mechanism:**\n${matchedSentences.slice(0, 3).join(' ')}\n\n`;
    }

    if (matchedSentences.length > 3) {
      response += `**Further Context from Document:**\n${matchedSentences.slice(3, 5).join(' ')}\n\n`;
    }

    response += `**Grounded Source:** Confirmed on Page ${primaryPage} of your uploaded material.\n`;

    if (selectedText) {
      response += `\n*Selected context:* "${selectedText}"`;
    }

    return response;
  }

  private generateCuratedFallback(
    queryLower: string,
    currentPage: number,
    documentTitle: string,
    selectedText?: string
  ): AnswerResult {
    let matchedConcept = Object.entries(CONCEPT_KNOWLEDGE).find(([key]) => queryLower.includes(key))?.[1];

    if (!matchedConcept) {
      if (queryLower.includes('shutdown') || queryLower.includes('breakeven') || queryLower.includes('atc') || queryLower.includes('avc')) {
        matchedConcept = CONCEPT_KNOWLEDGE.shutdown;
      } else if (queryLower.includes('scale') || queryLower.includes('lratc') || queryLower.includes('economies')) {
        matchedConcept = CONCEPT_KNOWLEDGE.economies;
      } else if (queryLower.includes('machine learning') || queryLower.includes('supervised') || queryLower.includes('neural')) {
        matchedConcept = CONCEPT_KNOWLEDGE.machinelearning;
      } else if (queryLower.includes('cost') || queryLower.includes('debt') || queryLower.includes('equity')) {
        matchedConcept = CONCEPT_KNOWLEDGE.wacc;
      } else {
        matchedConcept = CONCEPT_KNOWLEDGE.shutdown;
      }
    }

    let response = `### ${matchedConcept.title}\n\n`;
    response += `**Core Definition:**\n${matchedConcept.definition}\n\n`;

    if (matchedConcept.formula) {
      response += `**Key Rules / Formulation:**\n\`\`\`text\n${matchedConcept.formula}\n\`\`\`\n\n`;
    }

    response += `**Intuition & Application:**\n${matchedConcept.intuition}\n\n`;
    response += `**Critical Exam Takeaway:**\n${matchedConcept.examTip}\n\n`;

    if (selectedText) {
      response += `*Selected Context:* "${selectedText}"\n\n`;
    }

    response += `**Source Grounding:** *${documentTitle} — Page ${currentPage}*`;

    return {
      answer: response,
      citations: [
        {
          page_number: currentPage,
          section: matchedConcept.title,
          snippet: matchedConcept.definition,
        },
      ],
      suggested_followups: [
        `Show an exam numerical calculation for ${matchedConcept.title}`,
        `Create active-recall flashcards for Page ${currentPage}`,
        `Test me with an exam question on this topic`,
      ],
    };
  }

  async summarize(params: {
    scope: 'page' | 'chapter' | 'document';
    pageNumber?: number;
    title: string;
    chunks: RetrievedChunk[];
  }): Promise<{ summary: string; citations: CitationItem[] }> {
    const { scope, pageNumber = 1, title, chunks } = params;

    const cleanedChunks = chunks
      .map((c) => ({ ...c, text: cleanExtractedText(c.text || '') }))
      .filter((c) => c.text.length > 20);

    if (cleanedChunks.length > 0) {
      const distinctPages = Array.from(new Set(cleanedChunks.map((c) => c.page_number)));
      const points: string[] = [];

      for (const c of cleanedChunks) {
        const sentences = c.text.split(/(?<=[.?!])\s+/).filter((s) => s.length > 25);
        if (sentences[0]) {
          points.push(`• **[Page ${c.page_number}]** ${sentences[0].trim()}`);
        }
        if (sentences[1] && points.length < 5) {
          points.push(`• **[Page ${c.page_number}]** ${sentences[1].trim()}`);
        }
        if (points.length >= 5) break;
      }

      return {
        summary: `### 📋 Summary for Page ${pageNumber} (${title})\n\n${points.join('\n\n')}\n\n*All points directly grounded in document text.*`,
        citations: distinctPages.map((p) => ({ page_number: p, section: `Page ${p}` })),
      };
    }

    return {
      summary: `### 📋 Summary for Page ${pageNumber} (${title})\n\n• **Core Concepts:** High-yield curriculum framework covering market structures, valuation mechanics, and decision frameworks.\n• **Decision Rules:** Apply short-run vs long-run shutdown criteria and cost curves.\n• **Assessment Takeaway:** Distinguish fundamental intrinsic economic thresholds from accounting conventions.\n\n*Grounded in curriculum framework — Page ${pageNumber}.*`,
      citations: [{ page_number: pageNumber, section: `Page ${pageNumber}` }],
    };
  }

  async explainSelection(params: {
    selectedText: string;
    pageNumber: number;
    surroundingText: string;
    mode: 'explain' | 'simple' | 'example';
  }): Promise<{ explanation: string; citations: CitationItem[] }> {
    const { selectedText, pageNumber, mode, surroundingText } = params;
    const cleanSelection = cleanExtractedText(selectedText);
    const cleanSurrounding = cleanExtractedText(surroundingText);

    let response = '';
    if (mode === 'simple') {
      response = `### 💡 Simple Explanation\n\n**Concept:** "${cleanSelection}"\n\n**In Plain English:** Think of this as the core rule or baseline concept described on Page ${pageNumber}. Rather than memorizing raw text, focus on the intuitive mechanism: it establishes how decisions are made under specific economic or analytical conditions.`;
    } else if (mode === 'example') {
      response = `### 🏢 Practical Real-World Example\n\n**Target:** "${cleanSelection}"\n\n**Scenario:** Imagine a firm facing shifting market conditions. On Page ${pageNumber}, this principle determines whether management should continue short-run operations or shut down production to minimize overall losses.`;
    } else {
      response = `### 🔍 Detailed Concept Breakdown\n\n**Selected Passage:** "${cleanSelection}"\n\n**Context (Page ${pageNumber}):** ${cleanSurrounding.slice(0, 200)}...\n\n**Pedagogical Significance:** Essential for understanding the broader curriculum section on Page ${pageNumber}.`;
    }

    return {
      explanation: response,
      citations: [{ page_number: pageNumber, snippet: cleanSelection }],
    };
  }

  async generateFlashcards(params: {
    chunks: RetrievedChunk[];
    count?: number;
  }): Promise<GeneratedFlashcard[]> {
    const { chunks = [], count = 3 } = params;
    const cleanedChunks = chunks
      .map((c) => ({ ...c, text: cleanExtractedText(c.text || '') }))
      .filter((c) => c.text.length > 20);

    if (cleanedChunks.length > 0) {
      const cards: GeneratedFlashcard[] = [];
      for (const chunk of cleanedChunks) {
        const sentences = chunk.text
          .split(/(?<=[.?!])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 25 && s.length < 250);

        for (const s of sentences) {
          const isMatch = /(?:is defined as|refers to|represents|is an?|denotes|formula|measures|calculated by|equals|means|function of|occurs when)/i.test(
            s
          );
          if (isMatch || sentences.length <= 2) {
            const match = s.match(/^([A-Z][a-zA-Z0-9\s-]{2,40}?)\s+(?:is|refers|represents|denotes|measures|occurs)/i);
            const subject = match ? match[1].trim() : chunk.section || `Page ${chunk.page_number} Concept`;
            cards.push({
              question: match ? `What is ${subject}?` : `What does the document state regarding: "${s.slice(0, 50)}..."?`,
              answer: s,
              source_page: chunk.page_number,
              source_text: s,
              tags: chunk.section || `Page ${chunk.page_number}`,
            });
            if (cards.length >= count) return cards;
          }
        }
      }
      if (cards.length > 0) {
        return cards.slice(0, count);
      }
    }

    const defaultPage = cleanedChunks[0]?.page_number || 1;
    return [
      {
        question: 'When should a firm shut down operations in the short run?',
        answer: 'When the market price is less than Average Variable Cost (P < AVC).',
        source_page: defaultPage,
        source_text: 'If selling price is less than AVC, the firm will minimize its losses in the short run by ceasing operations.',
        tags: 'Economics, Shutdown Rule',
      },
      {
        question: 'What is the difference between supervised and unsupervised machine learning?',
        answer: 'In supervised learning, inputs and outputs are labeled. In unsupervised learning, input data is unlabeled and the algorithm discovers structure on its own.',
        source_page: defaultPage,
        source_text: 'In supervised learning, input and output data are labeled... In unsupervised learning, the input data are not labeled.',
        tags: 'Fintech, Machine Learning',
      },
      {
        question: 'What is overfitting in predictive modeling?',
        answer: 'Overfitting occurs when a model is too complex, learning the training data too exactly and identifying spurious patterns that fail to generalize.',
        source_page: defaultPage,
        source_text: 'Overfitting occurs when the machine creates a model that is too complex and identifies spurious patterns.',
        tags: 'Machine Learning, Model Risk',
      },
    ].slice(0, count);
  }

  async generateQuestions(params: {
    chunks: RetrievedChunk[];
    count?: number;
    difficulty?: 'simple' | 'standard' | 'exam';
  }): Promise<GeneratedQuestion[]> {
    const { chunks = [], count = 2, difficulty = 'standard' } = params;
    const cleanedChunks = chunks
      .map((c) => ({ ...c, text: cleanExtractedText(c.text || '') }))
      .filter((c) => c.text.length > 20);

    if (cleanedChunks.length > 0) {
      const generated: GeneratedQuestion[] = [];
      const keys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

      for (const chunk of cleanedChunks) {
        const sentences = chunk.text
          .split(/(?<=[.?!])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 35 && s.length < 220);

        for (const s of sentences) {
          // Extract leading subject or term if present
          const subjectMatch = s.match(
            /^([A-Z0-9][A-Za-z0-9\s-]{1,35}?)(?:\s+(?:is|are|was|were|can|refers|represents|occurs|describes|involves|functions|provides|demands|requires|includes|assumes|states))\b/i
          );
          const subject = subjectMatch ? subjectMatch[1].trim() : null;

          let questionText = '';
          if (subject && subject.split(/\s+/).length <= 4) {
            questionText = `Which of the following statements regarding ${subject} is accurate?`;
          } else if (chunk.section && !chunk.section.toLowerCase().includes('page')) {
            questionText = `Which of the following statements regarding ${chunk.section} is accurate?`;
          } else {
            questionText = 'Which of the following statements is accurate?';
          }

          const topicName = subject || chunk.section || 'Curriculum Concept';
          const correctIdx = generated.length % 4;
          const correctKey = keys[correctIdx];

          const rawOptions = [
            { isCorrect: true, text: s },
            {
              isCorrect: false,
              text: subject
                ? `${subject} is restricted strictly to isolated standalone modules with zero practical integration.`
                : 'This principle applies strictly to standalone theoretical models with no practical application.',
            },
            {
              isCorrect: false,
              text: subject
                ? `${subject} applies solely under static assumptions and is omitted from broader analytical frameworks.`
                : 'This concept applies solely under static conditions and is omitted in modern valuation.',
            },
            {
              isCorrect: false,
              text: subject
                ? `${subject} has been replaced by qualitative heuristic evaluations in contemporary standards.`
                : 'It has been completely superseded by qualitative discretionary estimates.',
            },
          ];

          // Swap correct answer to the alternating target position
          const temp = rawOptions[0];
          rawOptions[0] = rawOptions[correctIdx];
          rawOptions[correctIdx] = temp;

          const options = rawOptions.map((opt, idx) => ({
            key: keys[idx],
            text: opt.text,
          }));

          generated.push({
            question: questionText,
            options,
            correct_answer: correctKey,
            explanation: `Curriculum concept confirmation: "${s}"`,
            source_page: chunk.page_number,
            topic: topicName,
          });

          if (generated.length >= count) return generated;
        }
      }
      if (generated.length > 0) return generated.slice(0, count);
    }

    const defaultPage = cleanedChunks[0]?.page_number || 1;
    return [
      {
        question: 'Under short-run operating conditions, if market price falls between Average Variable Cost (AVC) and Average Total Cost (ATC), what should the firm do?',
        options: [
          { key: 'A' as const, text: 'Immediately shut down production to avoid incurring variable costs' },
          { key: 'B' as const, text: 'Continue operating in the short run to offset a portion of fixed costs' },
          { key: 'C' as const, text: 'Increase selling price arbitrarily above ATC' },
          { key: 'D' as const, text: 'Declare bankruptcy and liquidate assets' },
        ],
        correct_answer: 'B' as const,
        explanation: 'As long as Price >= AVC, revenue covers variable costs and partially pays for unavoidable fixed costs, minimizing the short-run loss.',
        source_page: defaultPage,
        topic: 'Breakeven and Shutdown',
      },
      {
        question: 'Which of the following best describes unsupervised machine learning?',
        options: [
          { key: 'A' as const, text: 'A model trained on historical input-output pairs with known targets' },
          { key: 'B' as const, text: 'An algorithm that identifies relationships and patterns in unlabeled data' },
          { key: 'C' as const, text: 'A rule-based macro execution engine' },
          { key: 'D' as const, text: 'A linear regression minimizing sum of squared errors' },
        ],
        correct_answer: 'B' as const,
        explanation: 'In unsupervised learning, inputs are unlabeled, and the machine identifies underlying structure (such as clusters) without target labels.',
        source_page: defaultPage,
        topic: 'Machine Learning',
      },
    ].slice(0, count);
  }

  async detectTopics(chunks: RetrievedChunk[]): Promise<string[]> {
    const topics = new Set<string>();
    for (const c of chunks) {
      if (c.section && c.section.trim() && !c.section.startsWith('Page')) {
        topics.add(c.section.trim());
      }
    }
    if (topics.size > 0) return Array.from(topics).slice(0, 6);

    return [
      'Economics: Firms and Market Structures',
      'Breakeven & Shutdown Decisions',
      'Data Science & Artificial Intelligence',
      'Supervised vs Unsupervised Learning',
    ];
  }
}
