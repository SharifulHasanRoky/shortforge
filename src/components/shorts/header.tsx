'use client';
import { useApp, TabKey } from '@/lib/shorts/store';
import { Sparkles, LayoutDashboard, PlusCircle, Library, Calendar, Settings, Youtube, Bot } from 'lucide-react';
import { useEffect, useState } from 'react';

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'campaigns', label: 'Auto-Pilot', icon: Bot },
  { key: 'create', label: 'Create', icon: PlusCircle },
  { key: 'library', label: 'Library', icon: Library },
  { key: 'schedule', label: 'Schedule', icon: Calendar },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const { activeTab, setActiveTab, ytConnected, setYtConnected } = useApp();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/youtube/status')
      .then((r) => r.json())
      .then((d) => setYtConnected(!!d.connected))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [setYtConnected]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">ShortForge</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Faceless YT Shorts · USA Motivation</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-red-500/15 text-red-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
              ytConnected
                ? 'bg-red-500/10 text-red-600 border-red-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}
            title={ytConnected ? 'YouTube connected' : 'YouTube not connected'}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{checking ? '...' : ytConnected ? 'Connected' : 'Not connected'}</span>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav className="md:hidden flex items-center justify-around border-t border-border bg-background">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium ${
                active ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
