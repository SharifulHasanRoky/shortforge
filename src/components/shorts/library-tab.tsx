'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, timeAgo, fmtDateTime, ProgressRing } from './ui-helpers';
import { RefreshCw, RotateCw, Trash2, Play, ExternalLink, Calendar, Send, Loader2, Film, AlertCircle, Zap, Download, Copy, Upload } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/lib/shorts/store';

async function fetchShorts(status: string) {
  const r = await fetch(`/api/shorts/list?status=${status}&limit=100`);
  return r.json();
}

export function LibraryTab() {
  const [filter, setFilter] = useState<string>('all');
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [uploadKit, setUploadKit] = useState<any | null>(null);
  const [uploadKitLoading, setUploadKitLoading] = useState<string | null>(null);
  const qc = useQueryClient();
  const { bump, setActiveTab } = useApp();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['shorts', filter],
    queryFn: () => fetchShorts(filter),
    refetchInterval: 3000,
  });

  const shorts = data?.shorts || [];

  async function deleteShort(id: string) {
    try {
      const r = await fetch(`/api/shorts/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed');
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['shorts'] });
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
      qc.invalidateQueries({ queryKey: ['shorts'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function scheduleNow(id: string) {
    try {
      const r = await fetch(`/api/shorts/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success(`Scheduled for ${new Date(d.scheduledAt).toLocaleString()}`);
      qc.invalidateQueries({ queryKey: ['shorts'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function retryShort(id: string) {
    try {
      const r = await fetch(`/api/shorts/${id}/retry`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success('Restarting generation...');
      qc.invalidateQueries({ queryKey: ['shorts'] });
      bump();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filters = ['all', 'generating', 'ready', 'scheduled', 'posted', 'failed'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-red-500/15 text-red-600 border border-red-500/30'
                  : 'bg-muted text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : shorts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No shorts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Head to the Create tab and drop a hint to make your first one.
            </p>
            <Button className="mt-4 bg-red-500 hover:bg-red-600 text-white" onClick={() => setActiveTab('create')}>
              Create a Short
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shorts.map((s: any) => (
            <Card key={s.id} className="overflow-hidden flex flex-col">
              {/* Thumbnail / preview */}
              <div className="aspect-[9/16] bg-muted relative overflow-hidden">
                {s.status === 'posted' && s.youtubeVideoId ? (
                  <a
                    href={`https://www.youtube.com/shorts/${s.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${s.youtubeVideoId}/hqdefault.jpg`}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40">
                      <ExternalLink className="w-8 h-8 text-white opacity-80" />
                    </div>
                  </a>
                ) : s.status === 'ready' || s.status === 'scheduled' || s.status === 'failed' ? (
                  <button
                    onClick={() => setActivePreview(activePreview === s.id ? null : s.id)}
                    className="w-full h-full"
                  >
                    <img
                      src={`/api/shorts/${s.id}/thumbnail`}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-black/40 transition-colors">
                      <Play className="w-10 h-10 text-white fill-white" />
                    </div>
                  </button>
                ) : s.status === 'generating' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-500/10 to-orange-500/10">
                    <ProgressRing progress={s.progress} size={56} />
                    <p className="text-xs text-muted-foreground mt-2 px-2 text-center line-clamp-2">{s.progressStep}</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Film className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}

                {activePreview === s.id && (s.status === 'ready' || s.status === 'scheduled' || s.status === 'failed') && (
                  <div
                    className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center p-2"
                    onClick={() => setActivePreview(null)}
                  >
                    <video
                      src={`/api/shorts/${s.id}/serve`}
                      controls
                      autoPlay
                      className="max-h-full max-w-full"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <CardContent className="p-3 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium line-clamp-2 leading-tight">{s.title}</h3>
                  <StatusBadge status={s.status} />
                </div>

                <p className="text-xs text-muted-foreground line-clamp-1">
                  Hint: <span className="text-foreground/80">{s.hint}</span>
                </p>

                {s.scheduledAt && (
                  <p className="text-xs text-blue-600">
                    Scheduled: {fmtDateTime(s.scheduledAt)}
                  </p>
                )}

                {s.error && (
                  <div className="flex items-start gap-1.5 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{s.error}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 mt-auto pt-2">
                  {s.status === 'ready' && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => scheduleNow(s.id)}>
                        <Calendar className="w-3 h-3 mr-1" /> Schedule
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => postNow(s.id)}>
                        <Send className="w-3 h-3 mr-1" /> Post
                      </Button>
                    </>
                  )}
                  {s.status === 'scheduled' && (
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => postNow(s.id)}>
                      <Send className="w-3 h-3 mr-1" /> Post now
                    </Button>
                  )}
                  {s.status === 'failed' && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => retryShort(s.id)}>
                        <Zap className="w-3 h-3 mr-1" /> Regenerate
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => postNow(s.id)} title="Try posting anyway (only works if video exists)">
                        <Send className="w-3 h-3 mr-1" /> Post
                      </Button>
                    </>
                  )}
                  {s.status === 'posted' && s.youtubeVideoId && (
                    <a
                      href={`https://www.youtube.com/shorts/${s.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" /> View on YT
                      </Button>
                    </a>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this Short?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the Short and all generated files (video, audio, images). This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteShort(s.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <p className="text-[10px] text-muted-foreground/70 text-center">{timeAgo(s.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
