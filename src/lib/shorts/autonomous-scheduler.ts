/**
 * Autonomous campaign scheduler.
 *
 * For each active campaign:
 *   1. Determine today's posting slots (e.g. 9 AM, 1 PM, 7 PM ET)
 *   2. For each slot that hasn't been filled yet (no Short scheduled for it):
 *      a. Pick next unused topic from the pool
 *      b. Create a Short record (status=generating)
 *      c. Run the pipeline (script → voice → images → video)
 *      d. Set scheduledAt = the slot time
 *   3. Top up the topic pool if running low (auto-replenish via LLM)
 *   4. Existing scheduler tick handles actual posting when scheduledAt hits
 *      (it calls uploadShortToYouTube)
 *
 * This runs from the /api/scheduler/tick endpoint, which fires every 60s
 * from the dashboard. So as long as the dashboard is open (or any other
 * visitor), campaigns run autonomously.
 */
import { db } from '@/lib/db';
import { generateTopicPool, TopicEntry, needsReplenishment } from './topic-pool-generator';
import { runGenerationPipeline } from './pipeline';
import { logActivity } from './script-generator';

// USA Eastern Time is UTC-5 (EST) or UTC-4 (EDT). For simplicity we use UTC-5
// (EST). For production you'd use a tz library; for this app it's fine.
const ET_OFFSET_HOURS = 5;

function etHourToUtcHour(etHour: number): number {
  return (etHour + ET_OFFSET_HOURS) % 24;
}

/**
 * Get today's slot times in UTC for a campaign.
 * Returns array of Date objects (one per slot, all today in ET).
 */
function getTodaysSlots(slotTimesEt: number[]): Date[] {
  const now = new Date();
  // Convert now to ET to figure out "today" in ET
  const nowEt = new Date(now.getTime() - ET_OFFSET_HOURS * 60 * 60 * 1000);
  const yearEt = nowEt.getUTCFullYear();
  const monthEt = nowEt.getUTCMonth();
  const dayEt = nowEt.getUTCDate();

  return slotTimesEt.map((etHour) => {
    const utcHour = etHourToUtcHour(etHour);
    const d = new Date(Date.UTC(yearEt, monthEt, dayEt, utcHour, 0, 0));
    // If etHour is 19 (7 PM), utcHour wraps to next day's 0:00 UTC.
    // Date.UTC handles month/day overflow automatically, so this is fine.
    return d;
  });
}

/**
 * Has a short already been scheduled for this campaign today at this slot?
 * We check if there's a Short for this campaign with scheduledAt within 30 min
 * of the slot time.
 */
async function isSlotFilled(campaignId: string, slotTime: Date): Promise<boolean> {
  const start = new Date(slotTime.getTime() - 30 * 60 * 1000);
  const end = new Date(slotTime.getTime() + 30 * 60 * 1000);
  const count = await db.short.count({
    where: {
      campaignId,
      scheduledAt: { gte: start, lte: end },
      // any status except 'failed' or 'draft' counts as filling the slot
      status: { in: ['generating', 'ready', 'scheduled', 'posting', 'posted'] },
    },
  });
  return count > 0;
}

/**
 * Top up the topic pool if running low. Adds 20 more topics via LLM.
 */
async function topUpTopicPool(campaign: any): Promise<void> {
  let pool: TopicEntry[] = [];
  try {
    pool = JSON.parse(campaign.topicsJson || '[]');
  } catch {
    pool = [];
  }

  if (!needsReplenishment(pool, 5)) return;

  try {
    console.log(`[Autonomous] Topping up topic pool for "${campaign.name}"...`);
    const newTopics = await generateTopicPool(campaign.niche, 20, campaign.systemPrompt || undefined);
    const newEntries: TopicEntry[] = newTopics.map((t) => ({ topic: t, used: false }));
    const combined = [...pool, ...newEntries];
    await db.campaign.update({
      where: { id: campaign.id },
      data: { topicsJson: JSON.stringify(combined) },
    });
    await logActivity(null, 'campaign', `Added ${newTopics.length} new topics to "${campaign.name}"`);
  } catch (err: any) {
    console.error(`[Autonomous] Failed to top up "${campaign.name}":`, err.message);
  }
}

/**
 * Pick next unused topic from the pool, mark it used, return it.
 */
async function consumeNextTopic(campaignId: string): Promise<TopicEntry | null> {
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return null;

  let pool: TopicEntry[] = [];
  try {
    pool = JSON.parse(campaign.topicsJson || '[]');
  } catch {
    pool = [];
  }

  const nextIdx = pool.findIndex((t) => !t.used);
  if (nextIdx === -1) return null;

  pool[nextIdx].used = true;
  pool[nextIdx].usedAt = new Date().toISOString();

  await db.campaign.update({
    where: { id: campaignId },
    data: { topicsJson: JSON.stringify(pool) },
  });

  return pool[nextIdx];
}

/**
 * Main entry point. For each active campaign, check today's slots and
 * trigger generation for any that are unfilled and need a head-start.
 *
 * We trigger generation ~2 hours before the slot so the video has time to
 * be ready before posting time. If we're past that window but the slot
 * hasn't been filled, we trigger immediately as a catch-up.
 */
export async function runAutonomousTick(): Promise<{ generated: string[]; errors: { campaignId: string; error: string }[] }> {
  const campaigns = await db.campaign.findMany({
    where: { active: true },
  });

  const generated: string[] = [];
  const errors: { campaignId: string; error: string }[] = [];
  const now = new Date();

  for (const campaign of campaigns) {
    try {
      // 1. Top up pool if needed (non-blocking-ish, runs first)
      await topUpTopicPool(campaign);

      // 2. Parse slot times
      const slotTimesEt = campaign.slotTimesEt
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n) && n >= 0 && n < 24);

      if (slotTimesEt.length === 0) {
        errors.push({ campaignId: campaign.id, error: 'No valid slot times' });
        continue;
      }

      const todaysSlots = getTodaysSlots(slotTimesEt);

      // 3. For each slot, if not filled AND we're within the "pre-generate" window
      //    (>= 2 hours before slot time, or any time today if slot already passed but unfilled),
      //    trigger generation.
      const PRE_GENERATE_HOURS = 2;

      for (const slotTime of todaysSlots) {
        const filled = await isSlotFilled(campaign.id, slotTime);
        if (filled) continue;

        const msUntilSlot = slotTime.getTime() - now.getTime();
        const hoursUntilSlot = msUntilSlot / (60 * 60 * 1000);

        // Trigger if:
        //  - slot is in the future AND within PRE_GENERATE_HOURS (we want to be ready early)
        //  - OR slot already passed today but still unfilled (catch-up: generate now, post immediately)
        const shouldTrigger =
          (hoursUntilSlot <= PRE_GENERATE_HOURS && hoursUntilSlot > -6) || // up to 6h past
          hoursUntilSlot < 0;

        if (!shouldTrigger) continue;

        // 4. Pick a topic
        const topic = await consumeNextTopic(campaign.id);
        if (!topic) {
          // Pool empty (topUp may have failed). Skip this slot, will retry next tick.
          console.log(`[Autonomous] No topics left for "${campaign.name}" - skipping slot ${slotTime.toISOString()}`);
          continue;
        }

        // 5. Create Short record
        const short = await db.short.create({
          data: {
            campaignId: campaign.id,
            hint: topic.topic,
            title: `Generating: ${topic.topic.slice(0, 40)}...`,
            script: '',
            captionText: '',
            hook: '',
            imagePrompts: '[]',
            imagePaths: '[]',
            tags: '#motivation,#mindset,#success',
            status: 'generating',
            progress: 0,
            progressStep: 'Starting (autonomous)...',
            scheduledAt: slotTime, // pre-set the slot time
          },
        });

        // 6. Fire pipeline in background
        runGenerationPipeline(short.id, undefined, { imageMode: campaign.imageMode as 'ai' | 'gradient' })
          .then(async () => {
            // After pipeline completes, set status to 'scheduled' if not already
            // (the existing scheduler tick handles actual posting when slot hits)
            const fresh = await db.short.findUnique({ where: { id: short.id } });
            if (fresh && fresh.status === 'ready' && fresh.scheduledAt) {
              await db.short.update({
                where: { id: short.id },
                data: {
                  status: 'scheduled',
                  progressStep: `Scheduled for ${fresh.scheduledAt.toISOString()}`,
                },
              });
            }
          })
          .catch(async (err) => {
            console.error(`[Autonomous] Pipeline failed for ${short.id}:`, err);
            await db.short.update({
              where: { id: short.id },
              data: {
                status: 'failed',
                error: err.message || 'Pipeline crashed',
                progressStep: 'Failed',
              },
            });
          });

        generated.push(short.id);
        await logActivity(short.id, 'campaign', `Autonomous: started "${topic.topic.slice(0, 40)}" for "${campaign.name}"`);
        console.log(`[Autonomous] Started short ${short.id} for campaign "${campaign.name}" at slot ${slotTime.toISOString()}`);
      }
    } catch (err: any) {
      console.error(`[Autonomous] Error in campaign ${campaign.id}:`, err);
      errors.push({ campaignId: campaign.id, error: err.message });
    }
  }

  return { generated, errors };
}
