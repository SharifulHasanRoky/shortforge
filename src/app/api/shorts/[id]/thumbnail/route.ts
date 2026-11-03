import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/shorts/[id]/thumbnail
 * Returns the first image of the short as a JPEG thumbnail.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const short = await db.short.findUnique({ where: { id } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let imagePaths: string[] = [];
    try { imagePaths = JSON.parse(short.imagePaths || '[]'); } catch {}

    // If we have generated images, serve the first one
    if (imagePaths.length > 0 && fs.existsSync(imagePaths[0])) {
      const buffer = fs.readFileSync(imagePaths[0]);
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Fallback: extract first frame from video
    if (short.videoPath && fs.existsSync(short.videoPath)) {
      const thumbDir = '/home/z/my-project/storage/thumbnails';
      if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
      const thumbPath = path.join(thumbDir, `${id}.jpg`);
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync(
        `ffmpeg -y -i "${short.videoPath}" -frames:v 1 -q:v 2 "${thumbPath}" -loglevel error`
      );
      const buffer = fs.readFileSync(thumbPath);
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    return NextResponse.json({ error: 'No thumbnail available' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
