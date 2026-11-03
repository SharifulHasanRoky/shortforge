import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/stats - dashboard summary
 */
export async function GET() {
  try {
    const total = await db.short.count();
    const ready = await db.short.count({ where: { status: 'ready' } });
    const scheduled = await db.short.count({ where: { status: 'scheduled' } });
    const posted = await db.short.count({ where: { status: 'posted' } });
    const generating = await db.short.count({ where: { status: 'generating' } });
    const failed = await db.short.count({ where: { status: 'failed' } });
    const draft = await db.short.count({ where: { status: 'draft' } });

    // Next 5 upcoming scheduled
    const upcoming = await db.short.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        hint: true,
        scheduledAt: true,
      },
    });

    // Recent 5 activities
    const recentActivity = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        message: true,
        shortId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      counts: { total, ready, scheduled, posted, generating, failed, draft },
      upcoming,
      recentActivity,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
