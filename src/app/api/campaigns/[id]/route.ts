import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TopicEntry } from '@/lib/shorts/topic-pool-generator';

/**
 * GET /api/campaigns/[id] - get full campaign details (with topic pool)
 * PATCH /api/campaigns/[id] - update fields (active, imageMode, slots, etc.)
 * DELETE /api/campaigns/[id] - delete campaign (Shorts are not deleted, just unlinked)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const c = await db.campaign.findUnique({ where: { id } });
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let pool: TopicEntry[] = [];
    try { pool = JSON.parse(c.topicsJson || '[]'); } catch {}

    // Recent shorts for this campaign
    const recentShorts = await db.short.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        hint: true,
        title: true,
        status: true,
        progress: true,
        progressStep: true,
        scheduledAt: true,
        postedAt: true,
        youtubeVideoId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      id: c.id,
      name: c.name,
      niche: c.niche,
      systemPrompt: c.systemPrompt,
      imageMode: c.imageMode,
      slotsPerDay: c.slotsPerDay,
      slotTimesEt: c.slotTimesEt.split(',').map((s) => parseInt(s.trim(), 10)),
      active: c.active,
      topicPool: pool,
      recentShorts,
      createdAt: c.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const c = await db.campaign.findUnique({ where: { id } });
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const update: any = {};
    if (typeof body.active === 'boolean') update.active = body.active;
    if (typeof body.name === 'string') update.name = body.name;
    if (typeof body.niche === 'string') update.niche = body.niche;
    if (typeof body.systemPrompt === 'string') update.systemPrompt = body.systemPrompt || null;
    if (body.imageMode === 'ai' || body.imageMode === 'gradient') update.imageMode = body.imageMode;
    if (typeof body.slotsPerDay === 'number') update.slotsPerDay = Math.max(1, Math.min(6, body.slotsPerDay));
    if (body.slotTimesEt) {
      if (Array.isArray(body.slotTimesEt)) {
        update.slotTimesEt = body.slotTimesEt.map((n: any) => parseInt(n, 10)).filter((n: number) => !isNaN(n) && n >= 0 && n < 24).join(',');
      } else if (typeof body.slotTimesEt === 'string') {
        update.slotTimesEt = body.slotTimesEt;
      }
    }

    await db.campaign.update({ where: { id }, data: update });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Unlink shorts first (campaignId -> null)
    await db.short.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
    await db.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
