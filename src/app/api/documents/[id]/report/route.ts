import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const reporterId = session?.user?.id || 'anonymous-user';

    // Rate limiting: 10 reports per 5 minutes per user
    const rl = checkRateLimit(`report:${reporterId}`, 10, 300);
    if (!rl.success) {
      return createRateLimitResponse(rl.reset);
    }

    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
      select: { id: true, title: true, status: true },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid reason for this report.' },
        { status: 400 }
      );
    }

    const report = await (db as any).report.create({
      data: {
        document_id: id,
        reported_by: session?.user?.email || reporterId,
        reason,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Report submitted for community review.',
      reportId: report.id,
    });
  } catch (error: any) {
    console.error('Error submitting document report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit report' },
      { status: 500 }
    );
  }
}
