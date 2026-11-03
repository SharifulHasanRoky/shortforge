'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, fmtDateTime, timeAgo } from './ui-helpers';
import { Calendar, Clock, Send, ExternalLink, Zap, Sun, Sunset } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/lib/shorts/store';

async function fetchScheduled() {
  const [schedR, readyR, postedR] = await Promise.all([
    fetch('/api/shorts/list?status=scheduled&limit=50').then((r) => r.json()),
    fetch('/api/shorts/list?status=ready&limit=50').then((r) => r.json()),
    fetch('/api/shorts/list?status=posted&limit=10').then((r) => r.json()),
  ]);
  return {
    scheduled: schedR.shorts || [],
    ready: readyR.shorts || [],
    posted: postedR.shorts || [],
  };
}

const SLOTS = [
  { hour: 9, label: '9:00 AM', icon: Sun, et: 'Morning' },
  { hour: 13, label: '1:00 PM', icon: Zap, et: 'Afternoon' },
  { hour: 19, label: '7:00 PM', icon: Sunset, et: 'Evening' },
];

export function ScheduleTab() {
  const qc = useQueryClient();
  const { bump, setActiveTab } = useApp();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['schedule-view'],
    queryFn: fetchScheduled,
    refetchInterval: 5000,
  });

  async function scheduleShort(id: string) {
    try {
      const r = await fetch(`/api/shorts/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success(`Scheduled for ${new Date(d.scheduledAt).toLocaleString()}`);
      qc.invalidateQueries({ queryKey: ['schedule-view'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function postNow(id: string) {
    try {
      const r = await fetch(`/api/shorts/${id}/post-now`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success('Posting to YouTube...');
      qc.invalidateQueries({ queryKey: ['schedule-view'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5">
      {/* Schedule info card */}
      <Card className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Auto-Schedule · 3 posts/day · USA Eastern Time</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every ready Short gets auto-assigned the next available slot. Posting happens automatically when the slot time hits (the dashboard ticks every 60s).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.hour} className="rounded-md border border-border bg-background/60 p-2.5 text-center">
                  <Icon className="w-4 h-4 mx-auto text-red-500 mb-1" />
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.et} ET</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Scheduled */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Scheduled ({data.scheduled.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.scheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No scheduled shorts.</p>
            ) : (
              data.scheduled.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-md border border-border">
                  <img
                    src={`/api/shorts/${s.id}/thumbnail`}
                    alt=""
                    className="w-9 h-16 object-cover rounded shrink-0 bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">{s.title}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{fmtDateTime(s.scheduledAt)}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => postNow(s.id)}>
                    <Send className="w-3 h-3 mr-1" /> Now
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ready - waiting to be scheduled */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" /> Ready · Not Scheduled ({data.ready.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.ready.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No ready shorts waiting.</p>
            ) : (
              data.ready.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-md border border-border">
                  <img
                    src={`/api/shorts/${s.id}/thumbnail`}
                    alt=""
                    className="w-9 h-16 object-cover rounded shrink-0 bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Created {timeAgo(s.createdAt)}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => scheduleShort(s.id)}>
                    <Calendar className="w-3 h-3 mr-1" /> Schedule
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recently posted */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-green-600" /> Recently Posted ({data.posted.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.posted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No posts yet. Connect YouTube in Settings to start posting.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.posted.map((s: any) => (
                <a
                  key={s.id}
                  href={`https://www.youtube.com/shorts/${s.youtubeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-md border border-border hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
                >
                  <img
                    src={`https://i.ytimg.com/vi/${s.youtubeVideoId}/default.jpg`}
                    alt=""
                    className="w-12 h-16 object-cover rounded shrink-0 bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-2 leading-tight">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(s.postedAt)}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
