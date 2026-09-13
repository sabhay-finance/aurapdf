import { RetrievedChunk } from './types';

// Comprehensive stop words including prompt meta-verbs to prevent false matching
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for', 'of',
  'to', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'beneath',
  'under', 'above', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'are', 'was', 'were',
  // Meta prompt terms that should not skew content relevance
  'explain', 'summarize', 'summary', 'page', 'pages', 'tell', 'me', 'what', 'does',
  'chapter', 'section', 'document', 'textbook', 'concept', 'notes', 'help'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Performs semantic / lexical retrieval over document chunks with smart intent detection.
 * Prioritizes target page(s) when the student asks for page explanations or summaries.
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: Array<{ page_number: number; section?: string | null; text: string }>,
  currentPage?: number,
  topK = 5
): RetrievedChunk[] {
  if (!chunks.length) return [];

  const trimmedQuery = query.trim();

  // 1. Detect explicit page references in the query: e.g. "Page 23", "p. 23", "page 23-24"
  const pageRangeMatch = trimmedQuery.match(/(?:pages?|p\.?)\s*(\d+)(?:\s*(?:-|to|and)\s*(\d+))?/i);
  const explicitPageStart = pageRangeMatch ? parseInt(pageRangeMatch[1], 10) : null;
  const explicitPageEnd = pageRangeMatch && pageRangeMatch[2] ? parseInt(pageRangeMatch[2], 10) : explicitPageStart;

  // 2. Check if the intent is to explain or summarize the current or targeted page(s)
  const isPageScopeQuery =
    /(?:explain|summarize|overview|review|breakdown|read|what(?:'s|\s+is)\s+on)\s+(?:this\s+|the\s+|current\s+)?page/i.test(
      trimmedQuery
    ) ||
    Boolean(explicitPageStart);

  const targetPages = new Set<number>();
  if (explicitPageStart) {
    for (let p = explicitPageStart; p <= (explicitPageEnd || explicitPageStart); p++) {
      targetPages.add(p);
    }
  } else if (isPageScopeQuery && currentPage) {
    targetPages.add(currentPage);
    // In reading view, often studying two-page spreads
    targetPages.add(currentPage + 1);
  }

  // If asking to explain a specific page/spread, directly gather chunks from those pages
  if (targetPages.size > 0) {
    const pageChunks = chunks.filter((c) => targetPages.has(c.page_number));
    if (pageChunks.length > 0) {
      // If query also mentions specific concepts (e.g. "explain shutdown on page 23")
      const contentTokens = tokenize(trimmedQuery);
      if (contentTokens.length > 0) {
        // Rank page chunks by content token overlap
        const scoredPageChunks = pageChunks.map((c) => {
          const lowerText = c.text.toLowerCase();
          let score = 5.0; // High baseline for correct page
          for (const token of contentTokens) {
            if (lowerText.includes(token)) score += 2.0;
          }
          return { ...c, score };
        });
        scoredPageChunks.sort((a, b) => b.score - a.score);
        return scoredPageChunks.slice(0, topK);
      }

      // Return page chunks in reading order
      return pageChunks.slice(0, topK).map((c, idx) => ({ ...c, score: 10 - idx * 0.5 }));
    }
  }

  // 3. General semantic TF-IDF query matching for conceptual questions
  const queryTokens = tokenize(trimmedQuery);
  if (!queryTokens.length) {
    // If no specific content tokens, fallback to current page chunks or first chunks
    return chunks
      .filter((c) => (currentPage ? c.page_number === currentPage || c.page_number === currentPage + 1 : true))
      .slice(0, topK)
      .map((c) => ({ ...c, score: 1.0 }));
  }

  // Calculate document frequencies across corpus
  const docCount = chunks.length;
  const df: Record<string, number> = {};
  for (const token of queryTokens) {
    let count = 0;
    for (const chunk of chunks) {
      if (chunk.text.toLowerCase().includes(token)) count++;
    }
    df[token] = count || 1;
  }

  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    const chunkTextLower = chunk.text.toLowerCase();
    let score = 0;

    for (const token of queryTokens) {
      // Term frequency in chunk
      const tf = chunkTokens.filter((t) => t === token).length;
      if (tf > 0) {
        // IDF weight
        const idf = Math.log((docCount + 1) / df[token]);
        score += tf * idf;
      }

      // Exact substring match bonus
      if (chunkTextLower.includes(token)) {
        score += 2.0;
      }
    }

    // Proximity boost if chunk is from the active reading page or spread
    if (currentPage && (chunk.page_number === currentPage || chunk.page_number === currentPage + 1)) {
      score *= 1.8;
    }

    return {
      page_number: chunk.page_number,
      section: chunk.section,
      text: chunk.text,
      score,
    };
  });

  // Sort descending by score
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  const top = scored.filter((c) => (c.score || 0) > 0).slice(0, topK);
  if (top.length === 0) {
    return scored.slice(0, topK);
  }

  return top;
}
