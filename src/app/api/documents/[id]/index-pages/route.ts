import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { chunkPageText } from '@/lib/pdf/chunker';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`index:${session.user.id}`, 20, 60);
    if (!rl.success) return createRateLimitResponse(rl.reset);

    const { id } = await params;

    // Verify document ownership
    const document = await db.document.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!document || document.user_id !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const body = await req.json();
    const { pages, totalPages } = body as {
      pages: Array<{ pageNumber: number; text: string; width?: number; height?: number }>;
      totalPages?: number;
    };

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json({ success: false, error: 'Pages array required' }, { status: 400 });
    }

    // Save pages
    for (const p of pages) {
      await db.documentPage.upsert({
        where: {
          document_id_page_number: {
            document_id: id,
            page_number: p.pageNumber,
          },
        },
        update: {
          text: p.text,
          width: p.width || 612,
          height: p.height || 792,
        },
        create: {
          document_id: id,
          page_number: p.pageNumber,
          text: p.text,
          width: p.width || 612,
          height: p.height || 792,
        },
      });
    }

    // Chunk and save chunks
    const chunks = chunkPageText(pages);
    for (const chunk of chunks) {
      const existing = await db.documentChunk.findFirst({
        where: {
          document_id: id,
          page_number: chunk.pageNumber,
          chunk_index: chunk.chunkIndex,
        },
      });

      if (existing) {
        await db.documentChunk.update({
          where: { id: existing.id },
          data: {
            text: chunk.text,
            section: chunk.section,
          },
        });
      } else {
        await db.documentChunk.create({
          data: {
            document_id: id,
            page_number: chunk.pageNumber,
            chunk_index: chunk.chunkIndex,
            section: chunk.section,
            text: chunk.text,
          },
        });
      }
    }

    // Update document page count
    if (totalPages) {
      await db.document.update({
        where: { id },
        data: { page_count: totalPages },
      });
    }

    return NextResponse.json({
      success: true,
      indexedPages: pages.length,
      indexedChunks: chunks.length,
    });
  } catch (error: any) {
    console.error('Error indexing pages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
