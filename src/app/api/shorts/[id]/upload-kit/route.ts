import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/shorts/[id]/upload-kit
 * Returns a ready-to-paste YouTube upload package: title, description (with
 * hashtags), tags, and a download URL for the video file. Used for manual
 * upload mode when YouTube OAuth is not configured.
 *
 * Query: ?format=text returns plain text suitable for copy-paste.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const short = await db.short.findUnique({ where: { id } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tagList = short.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const description = `${short.script}\n\n${tagList.join(' ')}\n\n#shorts #motivation`;
    const downloadUrl = `/api/shorts/${id}/serve`;

    const { searchParams } = new URL(req.url);
    if (searchParams.get('format') === 'text') {
      const text = `=== TITLE ===
${short.title}

=== DESCRIPTION ===
${description}

=== TAGS ===
${tagList.join(', ')}

=== VIDEO FILE ===
Download from: ${new URL(downloadUrl, req.nextUrl.origin).toString()}
`;
      return new NextResponse(text, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return NextResponse.json({
      id,
      title: short.title,
      description,
      tags: tagList,
      downloadUrl,
      hook: short.hook,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
