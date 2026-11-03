import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runGenerationPipeline } from '@/lib/shorts/pipeline';

/**
 * POST /api/shorts/generate
 * Body: { hint: string, schedule?: boolean }
 * Creates a Short record and kicks off the generation pipeline.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hint = (body.hint || '').toString().trim();
    const scheduleAfterReady = body.schedule !== false; // default true
    const imageMode: 'ai' | 'gradient' = body.imageMode === 'gradient' ? 'gradient' : 'ai';

    if (!hint) {
      return NextResponse.json({ error: 'hint is required' }, { status: 400 });
    }
    if (hint.length > 500) {
      return NextResponse.json({ error: 'hint too long (max 500 chars)' }, { status: 400 });
    }

    // Create Short record
    const short = await db.short.create({
      data: {
        hint,
        title: `Generating: ${hint.slice(0, 40)}...`,
        script: '',
        captionText: '',
        hook: '',
        imagePrompts: '[]',
        imagePaths: '[]',
        tags: '#motivation,#mindset,#success',
        status: 'generating',
        progress: 0,
        progressStep: 'Starting...',
      },
    });

    // Fire pipeline in background (do not await)
    runGenerationPipeline(short.id, undefined, { imageMode }).catch(async (err) => {
      console.error('Pipeline crashed:', err);
      await db.short.update({
        where: { id: short.id },
        data: {
          status: 'failed',
          error: err.message || 'Pipeline crashed',
          progressStep: 'Failed',
        },
      });
    });

    // If schedule-after-ready, we'll auto-schedule when status becomes ready
    // (handled in scheduler/tick - any ready short without scheduledAt gets next slot)
    if (!scheduleAfterReady) {
      // user will manually schedule
    }

    return NextResponse.json({
      id: short.id,
      status: 'generating',
      message: 'Generation started. Poll /api/shorts/[id] for progress.',
    });
  } catch (err: any) {
    console.error('Generate API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
