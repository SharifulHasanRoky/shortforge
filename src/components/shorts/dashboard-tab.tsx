'use client';
import { useApp } from '@/lib/shorts/store';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, timeAgo, fmtDateTime } from './ui-helpers';
import { Film, Clock, CheckCircle2, Zap, Calendar as CalIcon, Activity, Sparkles, ArrowRight, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

async function fetchStats() {
  const r = await fetch('/api/stats');
  return r.json();
}

export function DashboardTab() {
  const { setActiveTab } = useApp();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  if (isLoading || !data) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  const c = data.counts;
  const stats = [
    { label: 'Total', value: c.total, icon: Film, color: 'text-foreground' },
    { label: 'Ready', value: c.ready, icon: Zap, color: 'text-emerald-600' },
    { label: 'Scheduled', value: c.scheduled, icon: CalIcon, color: 'text-blue-600' },
    { label: 'Posted', value: c.posted, icon: CheckCircle2, color: 'text-green-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Auto-pilot banner */}
      <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Auto-Pilot Mode</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set up campaigns once. The system picks topics, makes videos, and posts to YouTube on schedule — fully hands-off.
              </p>
            </div>
          </div>
          <Button onClick={() => setActiveTab('campaigns')} className="bg-red-500 hover:bg-red-600 text-white shrink-0">
            <Bot className="w-4 h-4 mr-1.5" /> Set up Campaigns
          </Button>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</span>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-3xl font-bold mt-1.5">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick action */}
      <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Create a new Short from a hint</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Drop a topic, get a ready-to-post YouTube Short with voiceover, AI images, and Hormozi-style captions.
              </p>
            </div>
          </div>
          <Button onClick={() => setActiveTab('create')} className="bg-red-500 hover:bg-red-600 text-white">
            <Sparkles className="w-4 h-4 mr-1.5" /> New Short
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" /> Upcoming Posts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('schedule')}>
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No scheduled posts yet.</p>
            ) : (
              data.upcoming.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.title}</p>
                    <p className="text-xs text-muted-foreground truncate">Hint: {u.hint}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(u.scheduledAt)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
            ) : (
              data.recentActivity.map((a: any) => (
                <div key={a.id} className="flex items-start gap-2 text-sm py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{a.message}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)} · {a.action}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
