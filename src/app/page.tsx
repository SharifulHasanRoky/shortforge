'use client';

import { useApp } from '@/lib/shorts/store';
import { Header } from '@/components/shorts/header';
import { DashboardTab } from '@/components/shorts/dashboard-tab';
import { CampaignsTab } from '@/components/shorts/campaigns-tab';
import { CreateTab } from '@/components/shorts/create-tab';
import { LibraryTab } from '@/components/shorts/library-tab';
import { ScheduleTab } from '@/components/shorts/schedule-tab';
import { SettingsTab } from '@/components/shorts/settings-tab';
import { SchedulerTick } from '@/components/shorts/scheduler-tick';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { Heart } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

export default function Home() {
  const { activeTab } = useApp();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <SchedulerTick />
        <SonnerToaster position="top-right" richColors closeButton />

        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'campaigns' && <CampaignsTab />}
          {activeTab === 'create' && <CreateTab />}
          {activeTab === 'library' && <LibraryTab />}
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>

        <footer className="border-t border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>ShortForge</span>
              <span>·</span>
              <span>Faceless USA YouTube Shorts automation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Built with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span>· AI script + voice + images + captions + auto-post</span>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
