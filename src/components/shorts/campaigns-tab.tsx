'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Bot, Plus, RefreshCw, Trash2, Power, Loader2, Sparkles, Zap, Film, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/lib/shorts/store';
import { StatusBadge, timeAgo, fmtDateTime } from './ui-helpers';

const NICHE_PRESETS = [
  { value: 'motivational', label: 'Motivational', desc: 'Mindset, discipline, success habits' },
  { value: 'fun facts', label: 'Fun Facts', desc: 'Surprising did-you-know facts' },
  { value: 'history', label: 'History/Mystery', desc: 'Untold stories, mysteries' },
  { value: 'tech', label: 'Tech/AI', desc: 'Future predictions, AI tools' },
  { value: 'mindset', label: 'Psychology', desc: 'Cognitive biases, mental models' },
];

async function fetchCampaigns() {
  const r = await fetch('/api/campaigns');
  return r.json();
}

export function CampaignsTab() {
  const qc = useQueryClient();
  const { bump, setActiveTab, ytConnected } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [viewCampaign, setViewCampaign] = useState<any | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
    refetchInterval: 5000,
  });

  const campaigns = data?.campaigns || [];

  async function toggleActive(c: any) {
    try {
      const r = await fetch(`/api/campaigns/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active }),
      });
      if (!r.ok) throw new Error('Failed');
      toast.success(c.active ? 'Campaign paused' : 'Campaign activated');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function deleteCampaign(c: any) {
    try {
      const r = await fetch(`/api/campaigns/${c.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed');
      toast.success('Campaign deleted');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function generateTopics(c: any) {
    try {
      toast.success('Generating fresh topic ideas...');
      const r = await fetch(`/api/campaigns/${c.id}/generate-topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 20, replace: false }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success(`Added ${d.added} new topics (${d.unused} unused total)`);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Header / status banner */}
      <Card className={ytConnected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
        <CardContent className="p-4 flex items-start gap-3">
          <Bot className={`w-5 h-5 shrink-0 mt-0.5 ${ytConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {ytConnected ? 'Auto-Pilot is fully active' : 'Auto-Pilot is generating but not posting'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ytConnected
                ? 'Campaigns will autonomously generate shorts and post them at the scheduled USA times. No manual action needed.'
                : 'Connect YouTube in Settings so the system can auto-post. Until then, videos will be generated and scheduled, but you\'ll need to post them manually.'}
            </p>
          </div>
          {!ytConnected && (
            <Button size="sm" variant="outline" onClick={() => setActiveTab('settings')}>
              Connect YouTube
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <p className="text-xs text-muted-foreground">Set once, runs forever. The system picks topics, makes videos, and posts on schedule.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-red-500 hover:bg-red-600 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> New Campaign
        </Button>
      </div>

      {/* Campaign cards */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Create your first campaign to start auto-generating and auto-posting YouTube Shorts. Set the niche, schedule, and the system handles the rest.
            </p>
            <Button className="mt-4 bg-red-500 hover:bg-red-600 text-white" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {campaigns.map((c: any) => (
            <Card key={c.id} className={!c.active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                      {c.active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Paused</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{c.niche} · {c.imageMode === 'ai' ? 'AI Images' : 'Gradient'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleActive(c)}
                    title={c.active ? 'Pause' : 'Activate'}
                  >
                    <Power className={`w-3.5 h-3.5 ${c.active ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </Button>
                </div>

                {/* Slots display */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {c.slotTimesEt.map((h: number) => (
                    <span key={h} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`} ET
                    </span>
                  ))}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {c.slotsPerDay}/day
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-1 mb-3 text-center">
                  <div className="rounded bg-muted/50 p-1.5">
                    <p className="text-base font-bold leading-none">{c.unusedTopics}</p>
                    <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Topics left</p>
                  </div>
                  <div className="rounded bg-muted/50 p-1.5">
                    <p className="text-base font-bold leading-none text-blue-600">{c.todayCount}</p>
                    <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Today</p>
                  </div>
                  <div className="rounded bg-muted/50 p-1.5">
                    <p className="text-base font-bold leading-none text-emerald-600">{c.postedTotal}</p>
                    <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Posted</p>
                  </div>
                </div>

                {c.unusedTopics < 5 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 mb-2">
                    <AlertCircle className="w-3 h-3" /> Topic pool running low
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-1 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setViewCampaign(c)}>
                    <Film className="w-3 h-3 mr-1" /> View
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => generateTopics(c)}>
                    <Sparkles className="w-3 h-3 mr-1" /> +Topics
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The campaign and its topic pool will be removed. Existing shorts will remain in your Library but become unlinked. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCampaign(c)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateCampaignDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => {
        setShowCreate(false);
        qc.invalidateQueries({ queryKey: ['campaigns'] });
        bump();
      }} />

      {viewCampaign && (
        <CampaignDetailDialog
          campaign={viewCampaign}
          onOpenChange={(o) => !o && setViewCampaign(null)}
          onRefresh={() => {
            qc.invalidateQueries({ queryKey: ['campaigns'] });
            bump();
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('motivational');
  const [customNiche, setCustomNiche] = useState('');
  const [imageMode, setImageMode] = useState<'ai' | 'gradient'>('ai');
  const [slotTimes, setSlotTimes] = useState<number[]>([9, 13, 19]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const finalNiche = niche === 'custom' ? customNiche.trim() : niche;
    if (!name.trim()) return toast.error('Name required');
    if (!finalNiche) return toast.error('Niche required');
    if (slotTimes.length === 0) return toast.error('Pick at least 1 time slot');

    setSubmitting(true);
    try {
      const r = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          niche: finalNiche,
          systemPrompt: systemPrompt.trim() || undefined,
          imageMode,
          slotsPerDay: slotTimes.length,
          slotTimesEt: slotTimes,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success('Campaign created + topic pool generated');
      // reset
      setName(''); setNiche('motivational'); setCustomNiche(''); setImageMode('ai');
      setSlotTimes([9, 13, 19]); setSystemPrompt('');
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const HOURS = [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  function toggleHour(h: number) {
    setSlotTimes((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Autonomous Campaign</DialogTitle>
          <DialogDescription>
            Set up once. The system will auto-generate YouTube Shorts and post them at the scheduled times - no manual work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs">Campaign name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. USA Motivational Channel" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Niche</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {NICHE_PRESETS.map((n) => (
                <button
                  key={n.value}
                  onClick={() => { setNiche(n.value); setCustomNiche(''); }}
                  className={`text-left p-2 rounded-md border text-xs transition-colors ${
                    niche === n.value
                      ? 'border-red-500/40 bg-red-500/10 text-red-600'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{n.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{n.desc}</div>
                </button>
              ))}
              <button
                onClick={() => setNiche('custom')}
                className={`text-left p-2 rounded-md border text-xs transition-colors ${
                  niche === 'custom'
                    ? 'border-red-500/40 bg-red-500/10 text-red-600'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="font-medium">Custom</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Define your own niche</div>
              </button>
            </div>
            {niche === 'custom' && (
              <Input value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} placeholder="e.g. productivity, stoicism, money tips" className="mt-1.5" />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Posting times · USA Eastern</Label>
            <p className="text-[10px] text-muted-foreground">Pick 1-6 slots. 3/day is the sweet spot for growth without burning out.</p>
            <div className="grid grid-cols-6 gap-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleHour(h)}
                  className={`text-[10px] px-1 py-1.5 rounded border font-medium transition-colors ${
                    slotTimes.includes(h)
                      ? 'border-red-500/40 bg-red-500/15 text-red-600'
                      : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {h === 0 ? '12A' : h === 12 ? '12P' : h > 12 ? `${h - 12}P` : `${h}A`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Selected: {slotTimes.length} slots · {slotTimes.length}/day</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Image style</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setImageMode('ai')}
                className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                  imageMode === 'ai' ? 'border-red-500/40 bg-red-500/10 text-red-600' : 'border-border bg-muted/40 hover:bg-muted'
                }`}
              >
                <div className="font-medium">AI Images</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Cinematic, more time</div>
              </button>
              <button
                onClick={() => setImageMode('gradient')}
                className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                  imageMode === 'gradient' ? 'border-red-500/40 bg-red-500/10 text-red-600' : 'border-border bg-muted/40 hover:bg-muted'
                }`}
              >
                <div className="font-medium">Gradient Fast</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Quick, ~30s each</div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Custom instructions (optional)</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. Focus on young entrepreneurs aged 18-30. Avoid generic advice like 'wake up early'. Be controversial."
              className="min-h-[60px] resize-none text-xs"
            />
            <p className="text-[10px] text-muted-foreground">Overrides default niche instructions for the LLM.</p>
          </div>

          <div className="rounded-md bg-red-500/5 border border-red-500/20 p-2.5 text-xs">
            <p className="font-medium text-foreground mb-1">What happens next:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>1. System auto-generates 30 topic ideas for "{niche === 'custom' ? customNiche || 'your niche' : niche}"</li>
              <li>2. At each scheduled time, picks the next topic and builds the full video</li>
              <li>3. When the slot hits, posts to YouTube automatically</li>
              <li>4. When topic pool runs low, auto-generates more</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-red-500 hover:bg-red-600 text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            Create + Generate Topics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignDetailDialog({ campaign, onOpenChange, onRefresh }: { campaign: any; onOpenChange: (o: boolean) => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<any>(null);

  async function loadDetail() {
    const r = await fetch(`/api/campaigns/${campaign.id}`);
    const d = await r.json();
    setDetail(d);
  }

  // Load on mount
  useState(() => { loadDetail(); });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-red-500" /> {campaign.name}
          </DialogTitle>
          <DialogDescription>
            Niche: <span className="capitalize">{campaign.niche}</span> · {campaign.imageMode === 'ai' ? 'AI Images' : 'Gradient'} · {campaign.slotsPerDay}/day
          </DialogDescription>
        </DialogHeader>

        {!detail ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> Loading...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Topic pool */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Topic Pool ({detail.topicPool.length})</h4>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={async () => {
                  const r = await fetch(`/api/campaigns/${campaign.id}/generate-topics`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: 20, replace: false }),
                  });
                  if (r.ok) { toast.success('Added 20 topics'); loadDetail(); onRefresh(); }
                  else toast.error('Failed');
                }}>
                  <Sparkles className="w-3 h-3 mr-1" /> +20 Topics
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto rounded border border-border divide-y divide-border">
                {detail.topicPool.slice(0, 30).map((t: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-1 text-xs ${t.used ? 'opacity-50' : ''}`}>
                    {t.used ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <Clock className="w-3 h-3 text-muted-foreground shrink-0" />}
                    <span className={t.used ? 'line-through' : ''}>{t.topic}</span>
                  </div>
                ))}
                {detail.topicPool.length > 30 && (
                  <div className="px-2 py-1 text-[10px] text-muted-foreground text-center">+ {detail.topicPool.length - 30} more...</div>
                )}
              </div>
            </div>

            {/* Recent shorts */}
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Shorts ({detail.recentShorts.length})</h4>
              {detail.recentShorts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No shorts yet. The system will start generating at the next scheduled time.</p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {detail.recentShorts.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border text-xs">
                      <StatusBadge status={s.status} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{s.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.scheduledAt ? `Scheduled: ${fmtDateTime(s.scheduledAt)}` : s.progressStep || timeAgo(s.createdAt)}
                        </p>
                      </div>
                      {s.youtubeVideoId && (
                        <a href={`https://www.youtube.com/shorts/${s.youtubeVideoId}`} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
