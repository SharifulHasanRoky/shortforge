import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runGenerationPipeline } from '@/lib/shorts/pipeline';

/**
 * POST /api/shorts/[id]/retry
 * Resets a failed/generating short and re-runs the pipeline.
 * Keeps the original hint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const imageMode: 'ai' | 'gradient' = body.imageMode === 'gradient' ? 'gradient' : 'ai';
    const short = await db.short.findUnique({ where: { id } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (short.status !== 'failed' && short.status !== 'ready') {
      return NextResponse.json({
        error: `Can only retry failed or ready shorts (current: ${short.status})`,
      }, { status: 400 });
    }

    // Cleanup old artifacts
    const fs = await import('fs');
    try {
      if (short.videoPath && fs.existsSync(short.videoPath)) fs.unlinkSync(short.videoPath);
      if (short.audioPath && fs.existsSync(short.audioPath)) fs.unlinkSync(short.audioPath);
      const imagePaths: string[] = JSON.parse(short.imagePaths || '[]');
      imagePaths.forEach(p => {
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
      });
    } catch {}

    // Reset to generating
    await db.short.update({
      where: { id },
      data: {
        status: 'generating',
        progress: 0,
        progressStep: 'Restarting...',
        error: null,
        imagePaths: '[]',
        audioPath: null,
        videoPath: null,
      },
    });

    // Re-run pipeline (do not await)
    runGenerationPipeline(id, undefined, { imageMode }).catch(async (err) => {
      console.error('Pipeline crashed on retry:', err);
      await db.short.update({
        where: { id },
        data: {
          status: 'failed',
          error: err.message || 'Pipeline crashed',
          progressStep: 'Failed',
        },
      });
    });

    return NextResponse.json({
      id,
      status: 'generating',
      message: 'Generation restarted',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
