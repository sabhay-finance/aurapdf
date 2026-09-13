export interface RawPageText {
  pageNumber: number;
  text: string;
  width?: number;
  height?: number;
}

export interface ChunkResult {
  pageNumber: number;
  chunkIndex: number;
  section: string;
  text: string;
}

/**
 * Splits document page text into page-aware semantic chunks.
 * Retains page_number, section heading, and clean text boundaries.
 */
export function chunkPageText(pages: RawPageText[], maxChunkLength = 600): ChunkResult[] {
  const results: ChunkResult[] = [];

  for (const page of pages) {
    const rawLines = page.text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let currentSection = `Page ${page.pageNumber}`;
    let buffer = '';
    let chunkIndex = 0;

    for (const line of rawLines) {
      // Detect potential section headers (short, bold, or starting with Chapter/Topic)
      if (
        (line.startsWith('Chapter') || line.startsWith('Topic') || line.startsWith('Volume') || line.endsWith(':')) &&
        line.length < 75
      ) {
        currentSection = line.replace(/:$/, '');
      }

      if (buffer.length + line.length > maxChunkLength && buffer.length > 100) {
        results.push({
          pageNumber: page.pageNumber,
          chunkIndex: chunkIndex++,
          section: currentSection,
          text: buffer.trim(),
        });
        buffer = '';
      }

      buffer += (buffer.length ? ' ' : '') + line;
    }

    if (buffer.trim().length > 0) {
      results.push({
        pageNumber: page.pageNumber,
        chunkIndex: chunkIndex++,
        section: currentSection,
        text: buffer.trim(),
      });
    }
  }

  return results;
}
