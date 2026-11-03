import { NextResponse } from 'next/server';
import { processDueShorts } from '@/lib/shorts/scheduler';
import { runAutonomousTick } from '@/lib/shorts/autonomous-scheduler';

/**
 * POST /api/scheduler/tick
 * Called every 60s from the dashboard. Does two things:
 *   1. Autonomous mode: for each active campaign, check today's slots and
 *      trigger generation for unfilled ones (so the video is ready by post time)
 *   2. Posting mode: upload any shorts whose scheduledAt has passed
 *
 * Returns counts.
 */
export async function POST() {
  try {
    // 1. Autonomous: trigger generation for unfilled campaign slots
    const autoResult = await runAutonomousTick();

    // 2. Post any due shorts
    const postResult = await processDueShorts();

    return NextResponse.json({
      autonomous: {
        generated: autoResult.generated.length,
        errors: autoResult.errors.length,
      },
      posting: {
        posted: postResult.posted.length,
        failed: postResult.failed.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
