import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findNextSlot } from '@/lib/shorts/scheduler';

/**
 * POST /api/shorts/[id]/schedule
 * Body: { at?: ISO string } - if omitted, auto-pick next available slot
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const short = await db.short.findUnique({ where: { id } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (short.status === 'posted') {
      return NextResponse.json({ error: 'Already posted' }, { status: 400 });
    }
    if (short.status === 'generating' || short.status === 'posting') {
      return NextResponse.json({ error: `Cannot schedule while ${short.status}` }, { status: 400 });
    }

    let scheduledAt: Date;
    if (body.at) {
      scheduledAt = new Date(body.at);
      if (isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
    } else {
      scheduledAt = await findNextSlot();
    }

    await db.short.update({
      where: { id },
      data: {
        status: 'scheduled',
        scheduledAt,
        progressStep: `Scheduled for ${scheduledAt.toISOString()}`,
      },
    });

    return NextResponse.json({
      id,
      scheduledAt: scheduledAt.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
