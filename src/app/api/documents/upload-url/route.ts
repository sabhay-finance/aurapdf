import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSupabaseConfigured, createCommunityPdfUploadUrl } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = crypto.randomUUID();

    if (isSupabaseConfigured()) {
      const uploadData = await createCommunityPdfUploadUrl(documentId);
      if (uploadData?.signedUrl) {
        return NextResponse.json({
          success: true,
          directUpload: true,
          documentId,
          signedUrl: uploadData.signedUrl,
          token: uploadData.token,
          path: uploadData.path,
        });
      }
    }

    return NextResponse.json({
      success: true,
      directUpload: false,
      documentId,
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to prepare upload' },
      { status: 500 }
    );
  }
}
