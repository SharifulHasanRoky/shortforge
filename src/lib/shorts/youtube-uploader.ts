/**
 * YouTube uploader using googleapis.
 * Requires OAuth2 credentials stored in Setting table.
 *
 * Setup (user does this in Settings tab):
 *  1. Create Google Cloud project, enable YouTube Data API v3
 *  2. Create OAuth2 Desktop credentials
 *  3. Paste client_id + client_secret + redirect_uri
 *  4. Click "Connect YouTube" -> opens Google OAuth consent
 *  5. We exchange the auth code for access+refresh tokens, store them
 *  6. Now we can upload videos as the user
 */
import { db } from '@/lib/db';
import { google } from 'googleapis';
import fs from 'fs';

const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // OOB for desktop-style flow
// Alternative: postmessage (for installed app flow)

export interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface YouTubeTokens {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
  scope?: string;
}

async function getSetting(key: string): Promise<string | null> {
  const rec = await db.setting.findUnique({ where: { key } });
  return rec?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getYouTubeConfig(): Promise<YouTubeConfig | null> {
  const clientId = await getSetting('yt_client_id');
  const clientSecret = await getSetting('yt_client_secret');
  const redirectUri = (await getSetting('yt_redirect_uri')) || 'http://localhost:3000/api/youtube/callback';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export async function saveYouTubeConfig(cfg: YouTubeConfig): Promise<void> {
  await setSetting('yt_client_id', cfg.clientId);
  await setSetting('yt_client_secret', cfg.clientSecret);
  await setSetting('yt_redirect_uri', cfg.redirectUri);
}

export async function getYouTubeTokens(): Promise<YouTubeTokens | null> {
  const raw = await getSetting('yt_tokens');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveYouTubeTokens(tokens: YouTubeTokens): Promise<void> {
  await setSetting('yt_tokens', JSON.stringify(tokens));
}

export function isYouTubeConnected(
  config: YouTubeConfig | null,
  tokens: YouTubeTokens | null
): boolean {
  return !!(config && tokens && tokens.access_token);
}

/**
 * Build the OAuth2 client using stored config + tokens.
 */
async function getOAuth2Client() {
  const config = await getYouTubeConfig();
  if (!config) throw new Error('YouTube OAuth not configured');
  const tokens = await getYouTubeTokens();
  if (!tokens) throw new Error('YouTube not connected');

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    scope: tokens.scope,
    token_type: 'Bearer',
  });

  // Auto-refresh on expiry
  oauth2Client.on('tokens', async (newTokens) => {
    const updated: YouTubeTokens = {
      access_token: newTokens.access_token ?? tokens.access_token,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
      expiry_date: newTokens.expiry_date,
      scope: newTokens.scope ?? tokens.scope,
    };
    await saveYouTubeTokens(updated);
  });

  return oauth2Client;
}

/**
 * Get the Google OAuth URL for the user to visit and grant permission.
 */
export async function getAuthUrl(): Promise<string> {
  const config = await getYouTubeConfig();
  if (!config) throw new Error('YouTube OAuth not configured');

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
    prompt: 'consent',
  });
}

/**
 * Exchange the auth code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<YouTubeTokens> {
  const config = await getYouTubeConfig();
  if (!config) throw new Error('YouTube OAuth not configured');

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens (need refresh_token - re-authorize with prompt=consent)');
  }

  const ytTokens: YouTubeTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    scope: tokens.scope,
  };

  await saveYouTubeTokens(ytTokens);
  return ytTokens;
}

/**
 * Upload a video to YouTube.
 * Returns the YouTube video ID.
 */
export async function uploadShortToYouTube(
  shortId: string
): Promise<string> {
  const short = await db.short.findUnique({ where: { id: shortId } });
  if (!short) throw new Error('Short not found');
  if (!short.videoPath || !fs.existsSync(short.videoPath)) {
    throw new Error('Video file missing');
  }

  const auth = await getOAuth2Client();
  const youtube = google.youtube({ version: 'v3', auth });

  // Build description with CTA and tags
  const tagList = short.tags
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  const description = `${short.script}\n\n${tagList.join(' ')}\n\n#shorts #motivation`;

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: short.title,
        description,
        tags: ['shorts', 'motivation', ...tagList],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(short.videoPath),
    },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error('YouTube upload succeeded but no video ID returned');

  await db.short.update({
    where: { id: shortId },
    data: {
      status: 'posted',
      postedAt: new Date(),
      youtubeVideoId: videoId,
      progressStep: `Posted: https://youtube.com/shorts/${videoId}`,
    },
  });

  return videoId;
}
