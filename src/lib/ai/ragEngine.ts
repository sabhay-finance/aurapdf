import { RetrievedChunk } from './types';

// Simple stop words to improve token matching quality
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for', 'of',
  'to', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'beneath',
  'under', 'above', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'are', 'was', 'were'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Performs semantic / lexical retrieval over document chunks.
 * Calculates TF-IDF style term relevance + boosts chunks from the current page.
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: Array<{ page_number: number; section?: string | null; text: string }>,
  currentPage?: number,
  topK = 4
): RetrievedChunk[] {
  if (!chunks.length) return [];

  const queryTokens = tokenize(query);
  if (!queryTokens.length) {
    // If no specific query tokens, prioritize current page or first few chunks
    return chunks
      .filter((c) => (currentPage ? c.page_number === currentPage : true))
      .slice(0, topK)
      .map((c) => ({ ...c, score: 1.0 }));
  }

  // Calculate document frequencies
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
        score += 1.5;
      }
    }

    // Proximity boost if chunk is from the current reading page
    if (currentPage && chunk.page_number === currentPage) {
      score *= 1.4;
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

  // If top chunks have 0 score, return current page or top chunks anyway
  const top = scored.filter((c) => (c.score || 0) > 0).slice(0, topK);
  if (top.length === 0) {
    return scored.slice(0, topK);
  }

  return top;
}
