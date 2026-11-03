import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTopicPool, TopicEntry } from '@/lib/shorts/topic-pool-generator';

/**
 * GET /api/campaigns - list all campaigns
 * POST /api/campaigns - create a new campaign
 *   Body: { name, niche, systemPrompt?, imageMode?, slotsPerDay?, slotTimesEt? }
 */
export async function GET() {
  try {
    const campaigns = await db.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { shorts: true } },
      },
    });

    // Augment with topic pool stats + today's progress
    const augmented = await Promise.all(
      campaigns.map(async (c) => {
        let pool: TopicEntry[] = [];
        try { pool = JSON.parse(c.topicsJson || '[]'); } catch {}
        const unused = pool.filter((t) => !t.used).length;

        // Count today's shorts for this campaign
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayCount = await db.short.count({
          where: {
            campaignId: c.id,
            createdAt: { gte: todayStart },
            status: { in: ['generating', 'ready', 'scheduled', 'posting', 'posted'] },
          },
        });

        const postedTotal = await db.short.count({
          where: { campaignId: c.id, status: 'posted' },
        });

        return {
          id: c.id,
          name: c.name,
          niche: c.niche,
          systemPrompt: c.systemPrompt,
          imageMode: c.imageMode,
          slotsPerDay: c.slotsPerDay,
          slotTimesEt: c.slotTimesEt.split(',').map((s) => parseInt(s.trim(), 10)),
          active: c.active,
          topicPoolSize: pool.length,
          unusedTopics: unused,
          todayCount,
          postedTotal,
          totalShorts: c._count.shorts,
          createdAt: c.createdAt,
        };
      })
    );

    return NextResponse.json({ campaigns: augmented });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, niche, systemPrompt, imageMode, slotsPerDay, slotTimesEt, autoGenerateTopics } = body;

    if (!name || !niche) {
      return NextResponse.json({ error: 'name and niche are required' }, { status: 400 });
    }

    // Validate slot times
    let slotsStr = '9,13,19';
    if (slotTimesEt) {
      if (Array.isArray(slotTimesEt)) {
        slotsStr = slotTimesEt.map((n: any) => parseInt(n, 10)).filter((n: number) => !isNaN(n) && n >= 0 && n < 24).join(',');
      } else if (typeof slotTimesEt === 'string') {
        slotsStr = slotTimesEt;
      }
    }
    if (!slotsStr) slotsStr = '9,13,19';

    const imgMode = imageMode === 'gradient' ? 'gradient' : 'ai';
    const spd = Math.max(1, Math.min(6, parseInt(slotsPerDay, 10) || 3));

    const campaign = await db.campaign.create({
      data: {
        name,
        niche,
        systemPrompt: systemPrompt || null,
        imageMode: imgMode,
        slotsPerDay: spd,
        slotTimesEt: slotsStr,
        active: true,
        topicsJson: '[]',
      },
    });

    // Optionally auto-generate topic pool right away
    if (autoGenerateTopics !== false) {
      try {
        const topics = await generateTopicPool(niche, 30, systemPrompt || undefined);
        const entries: TopicEntry[] = topics.map((t) => ({ topic: t, used: false }));
        await db.campaign.update({
          where: { id: campaign.id },
          data: { topicsJson: JSON.stringify(entries) },
        });
      } catch (err: any) {
        // Don't fail the create, just log it
        console.error('Failed to auto-generate topics:', err.message);
      }
    }

    return NextResponse.json({ id: campaign.id, ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
