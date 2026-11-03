'use client';
import { useEffect } from 'react';
import { useApp } from '@/lib/shorts/store';

/**
 * Invisible component that pings the scheduler tick endpoint every 30s.
 * Each tick:
 *   1. Triggers autonomous generation for unfilled campaign slots
 *   2. Posts any shorts whose scheduledAt has passed
 *
 * As long as the dashboard is open in any browser tab, the system runs
 * autonomously. For 24/7 operation even when no browser is open, deploy
 * with a cron service (e.g. Vercel Cron, Railway Cron) that pings
 * POST /api/scheduler/tick every minute.
 */
export function SchedulerTick() {
  const bump = useApp((s) => s.bump);

  useEffect(() => {
    const tick = async () => {
      try {
        await fetch('/api/scheduler/tick', { method: 'POST' });
        bump();
      } catch {}
    };
    // Initial tick on mount (small delay to let page settle)
    const initialTimer = setTimeout(tick, 2000);
    const interval = setInterval(tick, 30_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [bump]);

  return null;
}
