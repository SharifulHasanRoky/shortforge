import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/shorts/list?status=ready&limit=50
 * Returns all shorts, optionally filtered by status.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const shorts = await db.short.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        hint: true,
        title: true,
        hook: true,
        status: true,
        progress: true,
        progressStep: true,
        error: true,
        scheduledAt: true,
        postedAt: true,
        youtubeVideoId: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        // Don't send big fields (script, imagePrompts, imagePaths) in list view
      },
    });

    return NextResponse.json({ shorts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
