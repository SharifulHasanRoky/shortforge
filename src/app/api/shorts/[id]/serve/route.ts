import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';

/**
 * GET /api/shorts/[id]/serve
 * Streams the final video file (mp4) for in-browser preview.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const short = await db.short.findUnique({ where: { id } });
    if (!short || !short.videoPath) {
      return NextResponse.json({ error: 'Video not available' }, { status: 404 });
    }
    if (!fs.existsSync(short.videoPath)) {
      return NextResponse.json({ error: 'Video file missing' }, { status: 404 });
    }

    const stat = fs.statSync(short.videoPath);
    const fileSize = stat.size;
    const range = req.headers.get('range');

    if (range) {
      // Parse Range header for video streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(short.videoPath, { start, end });
      // Use Response with web stream
      const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (c) => controller.enqueue(c));
          stream.on('end', () => controller.close());
          stream.on('error', (e) => controller.error(e));
        },
      });
      return new NextResponse(readable as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    }

    // No range - return full file
    const stream = fs.createReadStream(short.videoPath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (c) => controller.enqueue(c));
        stream.on('end', () => controller.close());
        stream.on('error', (e) => controller.error(e));
      },
    });
    return new NextResponse(readable as any, {
      status: 200,
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
