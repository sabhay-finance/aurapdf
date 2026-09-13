import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

interface SearchResult {
  pageNumber: number;
  snippet: string;
  score?: number;
  matchType: 'exact' | 'semantic';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`search:${session.user.id}`, 30, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const { id } = await params;

    // Verify document ownership
    const document = await db.document.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';
    const mode = (searchParams.get('mode') || 'exact') as 'exact' | 'semantic';

    if (!query) {
      return NextResponse.json({ success: true, results: [] });
    }

    const pages = await db.documentPage.findMany({
      where: { document_id: id },
      select: {
        page_number: true,
        text: true,
      },
      orderBy: { page_number: 'asc' },
    });

    const qLower = query.toLowerCase();
    const results: SearchResult[] = [];

    if (mode === 'exact') {
      for (const p of pages) {
        const idx = p.text.toLowerCase().indexOf(qLower);
        if (idx !== -1) {
          const start = Math.max(0, idx - 45);
          const end = Math.min(p.text.length, idx + query.length + 65);
          results.push({
            pageNumber: p.page_number,
            snippet: (start > 0 ? '...' : '') + p.text.slice(start, end).trim() + (end < p.text.length ? '...' : ''),
            matchType: 'exact',
          });
        }
      }
    } else {
      const tokens = qLower.split(/\s+/).filter((t) => t.length > 2);
      const scored: SearchResult[] = [];

      for (const p of pages) {
        const pLower = p.text.toLowerCase();
        let score = 0;

        if (pLower.includes(qLower)) {
          score += 4;
        }

        for (const t of tokens) {
          if (pLower.includes(t)) {
            score += 1;
          }
        }

        if (score > 0) {
          const firstMatchIdx = pLower.indexOf(tokens[0] || qLower);
          const start = firstMatchIdx !== -1 ? Math.max(0, firstMatchIdx - 35) : 0;
          const end = Math.min(p.text.length, start + 130);

          scored.push({
            pageNumber: p.page_number,
            snippet: (start > 0 ? '...' : '') + p.text.slice(start, end).trim() + (end < p.text.length ? '...' : ''),
            score,
            matchType: 'semantic',
          });
        }
      }

      scored.sort((a, b) => (b.score || 0) - (a.score || 0));
      results.push(...scored.slice(0, 20));
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
