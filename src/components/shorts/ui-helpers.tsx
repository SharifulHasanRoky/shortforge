'use client';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-gray-500/15 text-gray-500 border-gray-500/30' },
    generating: { label: 'Generating', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse' },
    ready: { label: 'Ready', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
    scheduled: { label: 'Scheduled', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
    posting: { label: 'Posting', cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30 animate-pulse' },
    posted: { label: 'Posted', cls: 'bg-green-600/15 text-green-700 border-green-600/30' },
    failed: { label: 'Failed', cls: 'bg-red-500/15 text-red-600 border-red-500/30' },
  };
  const cfg = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function ProgressRing({ progress, size = 36 }: { progress: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, progress)) / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-red-500 transition-all duration-500"
      />
    </svg>
  );
}

export function timeAgo(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString();
}

export function fmtDateTime(d: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
