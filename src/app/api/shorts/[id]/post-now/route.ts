import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  isYouTubeConnected,
  getYouTubeConfig,
  getYouTubeTokens,
  uploadShortToYouTube,
} from '@/lib/shorts/youtube-uploader';

/**
 * POST /api/shorts/[id]/post-now
 * Immediately attempt to upload to YouTube (skipping schedule).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const short = await db.short.findUnique({ where: { id } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (short.status === 'posted') {
      return NextResponse.json({ error: 'Already posted', youtubeVideoId: short.youtubeVideoId }, { status: 400 });
    }
    if (short.status !== 'ready' && short.status !== 'scheduled' && short.status !== 'failed') {
      return NextResponse.json({ error: `Short not ready (status: ${short.status})` }, { status: 400 });
    }

    const config = await getYouTubeConfig();
    const tokens = await getYouTubeTokens();
    if (!isYouTubeConnected(config, tokens)) {
      return NextResponse.json({
        error: 'YouTube not connected. Go to Settings to connect.',
      }, { status: 400 });
    }

    await db.short.update({
      where: { id },
      data: { status: 'posting', progressStep: 'Uploading to YouTube...' },
    });

    // Run upload in background
    uploadShortToYouTube(id).catch(async (err) => {
      console.error('Upload failed:', err);
      await db.short.update({
        where: { id },
        data: {
          status: 'failed',
          error: err.message,
          progressStep: `Post failed: ${err.message}`,
        },
      });
    });

    return NextResponse.json({
      id,
      status: 'posting',
      message: 'Upload started. Poll /api/shorts/[id] for status.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
