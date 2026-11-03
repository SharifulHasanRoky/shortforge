import { NextResponse } from 'next/server';
import {
  getYouTubeConfig,
  getYouTubeTokens,
  isYouTubeConnected,
} from '@/lib/shorts/youtube-uploader';

/**
 * GET /api/youtube/status
 */
export async function GET() {
  try {
    const config = await getYouTubeConfig();
    const tokens = await getYouTubeTokens();
    return NextResponse.json({
      configured: !!config,
      connected: isYouTubeConnected(config, tokens),
      redirectUri: config?.redirectUri || '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
