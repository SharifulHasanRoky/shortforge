import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getYouTubeConfig,
  saveYouTubeConfig,
  getYouTubeTokens,
} from '@/lib/shorts/youtube-uploader';

/**
 * GET /api/settings - returns current settings (without secrets)
 * POST /api/settings - save YouTube OAuth config
 */
export async function GET() {
  try {
    const config = await getYouTubeConfig();
    const tokens = await getYouTubeTokens();
    return NextResponse.json({
      youtube: {
        configured: !!config,
        clientId: config?.clientId || '',
        redirectUri: config?.redirectUri || '',
        connected: !!(config && tokens && tokens.access_token),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, clientSecret, redirectUri } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'clientId and clientSecret required' }, { status: 400 });
    }

    await saveYouTubeConfig({
      clientId,
      clientSecret,
      redirectUri: redirectUri || `${req.nextUrl.origin}/api/youtube/callback`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
