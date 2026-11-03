import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTopicPool, TopicEntry } from '@/lib/shorts/topic-pool-generator';

/**
 * POST /api/campaigns/[id]/generate-topics
 * Body: { count?: number, replace?: boolean }
 * Generates N new topic ideas via LLM and adds to the pool.
 * If replace=true, replaces the entire pool.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const count = Math.max(5, Math.min(50, parseInt(body.count, 10) || 20));
    const replace = body.replace === true;

    const c = await db.campaign.findUnique({ where: { id } });
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newTopics = await generateTopicPool(c.niche, count, c.systemPrompt || undefined);

    let pool: TopicEntry[] = [];
    if (!replace) {
      try { pool = JSON.parse(c.topicsJson || '[]'); } catch {}
    }
    const newEntries: TopicEntry[] = newTopics.map((t) => ({ topic: t, used: false }));
    const combined = [...pool, ...newEntries];

    await db.campaign.update({
      where: { id },
      data: { topicsJson: JSON.stringify(combined) },
    });

    return NextResponse.json({
      added: newTopics.length,
      total: combined.length,
      unused: combined.filter((t) => !t.used).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
