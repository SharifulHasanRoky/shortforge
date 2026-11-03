'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/shorts/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProgressRing, StatusBadge } from './ui-helpers';
import { Sparkles, Send, Loader2, CheckCircle2, AlertCircle, RotateCw, Play, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const HINT_IDEAS = [
  '5 AM routine of millionaires',
  'Why discipline beats motivation',
  'The 1% rule that changes everything',
  'Stop chasing, start attracting',
  'How rejection made me unstoppable',
  'Three habits that rewired my brain',
];

export function CreateTab() {
  const { bump, setActiveTab } = useApp();
  const [hint, setHint] = useState('');
  const [imageMode, setImageMode] = useState<'ai' | 'gradient'>('ai');
  const [submitting, setSubmitting] = useState(false);
  const [activeShortId, setActiveShortId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [status, setStatus] = useState<string>('');
  const pollRef = useRef<any>(null);

  async function startGeneration() {
    if (!hint.trim()) {
      toast.error('Type a hint first');
      return;
    }
    setSubmitting(true);
    setProgress(0);
    setStep('Creating record...');
    setStatus('generating');
    try {
      const r = await fetch('/api/shorts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: hint.trim(), imageMode }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setActiveShortId(d.id);
      toast.success('Generation started');
      bump();
      // Start polling
      pollStatus(d.id);
    } catch (err: any) {
      toast.error(err.message);
      setStatus('failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function pollStatus(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/shorts/${id}`);
        const d = await r.json();
        setProgress(d.progress || 0);
        setStep(d.progressStep || '');
        setStatus(d.status);
        if (d.status === 'ready' || d.status === 'failed' || d.status === 'posted') {
          if (pollRef.current) clearInterval(pollRef.current);
          bump();
          if (d.status === 'ready') toast.success('Short ready!');
          if (d.status === 'failed') toast.error('Generation failed: ' + (d.error || ''));
        }
      } catch {}
    }, 2000);
  }

  // auto-schedule when ready (so it gets next slot)
  async function autoSchedule(id: string) {
    try {
      const r = await fetch(`/api/shorts/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(`Scheduled for ${new Date(d.scheduledAt).toLocaleString()}`);
        bump();
        setActiveTab('schedule');
      } else {
        toast.error(d.error || 'Schedule failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isDone = status === 'ready';
  const isFailed = status === 'failed';

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Hint input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-500" /> Drop a Hint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hint" className="text-xs">
              Topic, idea, or angle for your motivational Short
            </Label>
            <Textarea
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. 5 AM routine of millionaires, why discipline beats motivation..."
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{hint.length}/500</span>
              <span className="hidden sm:inline">Press Cmd/Ctrl+Enter to generate</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Need ideas? Try:</p>
            <div className="flex flex-wrap gap-1.5">
              {HINT_IDEAS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHint(h)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted hover:border-red-500/30 transition-colors"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Image style</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setImageMode('ai')}
                className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                  imageMode === 'ai'
                    ? 'border-red-500/40 bg-red-500/10 text-red-600'
                    : 'border-border bg-muted/40 hover:bg-muted'
                }`}
              >
                <div className="font-medium">AI Images</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Cinematic, more time</div>
              </button>
              <button
                onClick={() => setImageMode('gradient')}
                className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                  imageMode === 'gradient'
                    ? 'border-red-500/40 bg-red-500/10 text-red-600'
                    : 'border-border bg-muted/40 hover:bg-muted'
                }`}
              >
                <div className="font-medium">Gradient Fast</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Quick test, ~30s</div>
              </button>
            </div>
          </div>

          <Button
            onClick={startGeneration}
            disabled={submitting || !hint.trim()}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startGeneration();
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Starting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" /> Generate Short
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
            <p className="font-medium text-foreground">What gets created:</p>
            <p>• AI-written script (110-150 words, 30-45 sec)</p>
            <p>• 4-6 cinematic AI images with Ken Burns zoom</p>
            <p>• American male voiceover (TTS)</p>
            <p>• Word-by-word Hormozi-style captions</p>
            <p>• Auto-scheduled for next available USA slot</p>
          </div>
        </CardContent>
      </Card>

      {/* Progress / result */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Loader2 className={`w-4 h-4 ${status === 'generating' ? 'text-amber-500 animate-spin' : isDone ? 'text-emerald-500' : isFailed ? 'text-red-500' : 'text-muted-foreground'}`} />
            Generation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activeShortId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No active generation</p>
              <p className="text-xs text-muted-foreground mt-1">Drop a hint and click Generate to start</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ProgressRing progress={progress} size={64} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={status} />
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{step || 'Idle'}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <StepLine done={progress >= 15} active={progress < 15 && status === 'generating'} label="AI script generation" />
                <StepLine done={progress >= 40} active={progress >= 15 && progress < 40} label="Voiceover synthesis (TTS)" />
                <StepLine done={progress >= 75} active={progress >= 40 && progress < 75} label="AI image generation" />
                <StepLine done={progress >= 100} active={progress >= 75 && progress < 100} label="Video composition + captions" />
              </div>

              {isDone && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Button
                    onClick={() => autoSchedule(activeShortId)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Calendar className="w-4 h-4 mr-1.5" /> Schedule for next slot
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setActiveTab('library')}>
                      <Play className="w-3.5 h-3.5 mr-1.5" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setActiveTab('schedule')}>
                      View schedule
                    </Button>
                  </div>
                </div>
              )}

              {isFailed && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/5 border border-red-500/30 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-600">Generation failed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Check Library tab for details, or try again.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepLine({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      ) : active ? (
        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />
      )}
      <span className={done ? 'text-foreground' : active ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  );
}
