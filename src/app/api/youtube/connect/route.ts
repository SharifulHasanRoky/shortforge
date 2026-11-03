import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, getYouTubeConfig } from '@/lib/shorts/youtube-uploader';

/**
 * GET /api/youtube/connect
 * Returns the OAuth URL the user must visit to grant YouTube upload permission.
 */
export async function GET(req: NextRequest) {
  try {
    const config = await getYouTubeConfig();
    if (!config) {
      return NextResponse.json({
        error: 'Save OAuth credentials in Settings first',
      }, { status: 400 });
    }

    const url = await getAuthUrl();
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
