import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/shorts/youtube-uploader';

/**
 * GET /api/youtube/callback?code=XXX
 * OAuth2 redirect handler. Exchanges code for tokens.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/?yt_error=${encodeURIComponent(error)}`, req.nextUrl.origin));
    }
    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    await exchangeCodeForTokens(code);
    // Redirect back to home with success flag
    return NextResponse.redirect(new URL('/?yt_connected=1', req.nextUrl.origin));
  } catch (err: any) {
    console.error('YouTube callback error:', err);
    return NextResponse.redirect(
      new URL(`/?yt_error=${encodeURIComponent(err.message)}`, req.nextUrl.origin)
    );
  }
}
