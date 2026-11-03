/**
 * Scheduler logic: figures out next available time slot for a Short.
 * Default 3/day at 9 AM, 1 PM, 7 PM USA Eastern.
 */
import { db } from '@/lib/db';

export interface ScheduleSlot {
  hourUTC: number;
  label: string;
}

// USA Eastern Time is UTC-5 (EST) or UTC-4 (EDT). We use UTC-5 as default.
// 9 AM ET = 14:00 UTC (EST) / 13:00 UTC (EDT)
// 1 PM ET = 18:00 UTC (EST) / 17:00 UTC (EDT)
// 7 PM ET = 00:00 UTC next day (EST) / 23:00 UTC same day (EDT)
// We use EST (UTC-5) for simplicity.
export const DEFAULT_SLOTS: ScheduleSlot[] = [
  { hourUTC: 14, label: '9 AM Eastern' },
  { hourUTC: 18, label: '1 PM Eastern' },
  { hourUTC: 0, label: '7 PM Eastern' }, // next-day UTC
];

/**
 * Find next available scheduling slot.
 * Considers: already-scheduled shorts (avoid double-booking) + future date.
 */
export async function findNextSlot(fromDate: Date = new Date()): Promise<Date> {
  // Get all upcoming scheduled shorts in next 14 days
  const upcoming = await db.short.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { gt: fromDate },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // Try each day starting tomorrow, for each slot find the first free one
  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);

    for (const slot of DEFAULT_SLOTS) {
      const slotDate = new Date(day);
      slotDate.setUTCHours(slot.hourUTC, 0, 0, 0);
      // For "0" slot (7 PM ET), it's next day UTC
      if (slot.hourUTC === 0) {
        slotDate.setDate(slotDate.getDate() + 1);
      }
      // Skip past
      if (slotDate <= fromDate) continue;

      // Check if this slot is taken
      const taken = upcoming.some(s => {
        const diff = Math.abs(s.scheduledAt!.getTime() - slotDate.getTime());
        return diff < 60 * 60 * 1000; // within 1 hour = same slot
      });

      if (!taken) return slotDate;
    }
  }

  // Fallback: 2 days from now at default slot
  const fallback = new Date(fromDate);
  fallback.setDate(fallback.getDate() + 2);
  fallback.setUTCHours(14, 0, 0, 0);
  return fallback;
}

/**
 * Process scheduled shorts that are due for posting.
 * Returns the IDs of shorts that were attempted.
 */
export async function processDueShorts(): Promise<{
  posted: string[];
  failed: { id: string; error: string }[];
}> {
  const now = new Date();
  const due = await db.short.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: now },
    },
  });

  const posted: string[] = [];
  const failed: { id: string; error: string }[] = [];

  // Import here to avoid circular dep
  const { uploadShortToYouTube } = await import('./youtube-uploader');
  const { isYouTubeConnected, getYouTubeConfig, getYouTubeTokens } = await import('./youtube-uploader');

  const config = await getYouTubeConfig();
  const tokens = await getYouTubeTokens();
  if (!isYouTubeConnected(config, tokens)) {
    // Can't post - mark all as needing manual action
    for (const s of due) {
      await db.short.update({
        where: { id: s.id },
        data: {
          status: 'ready',
          progressStep: 'YouTube not connected. Connect in Settings, then click Post Now.',
        },
      });
      failed.push({ id: s.id, error: 'YouTube not connected' });
    }
    return { posted, failed };
  }

  for (const s of due) {
    try {
      await db.short.update({
        where: { id: s.id },
        data: { status: 'posting', progressStep: 'Uploading to YouTube...' },
      });
      const videoId = await uploadShortToYouTube(s.id);
      posted.push(s.id);
      console.log(`Posted ${s.id} -> ${videoId}`);
    } catch (err: any) {
      failed.push({ id: s.id, error: err.message });
      await db.short.update({
        where: { id: s.id },
        data: {
          status: 'ready',
          error: err.message,
          progressStep: `Post failed: ${err.message}`,
        },
      });
    }
  }

  return { posted, failed };
}
