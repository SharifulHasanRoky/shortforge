'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Youtube, Save, ExternalLink, CheckCircle2, AlertCircle, Loader2, Link2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/lib/shorts/store';

export function SettingsTab() {
  const { setYtConnected } = useApp();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.youtube) {
          setClientId(d.youtube.clientId || '');
          setRedirectUri(d.youtube.redirectUri || '');
          setConfigured(!!d.youtube.configured);
          setConnected(!!d.youtube.connected);
          setYtConnected(!!d.youtube.connected);
        }
      })
      .finally(() => setLoading(false));
  }, [setYtConnected]);

  async function save() {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Client ID and Secret required');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          redirectUri: redirectUri.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success('OAuth credentials saved');
      setConfigured(true);
      // refresh to get the canonical redirect URI
      fetch('/api/settings').then((r) => r.json()).then((d) => {
        if (d.youtube?.redirectUri) setRedirectUri(d.youtube.redirectUri);
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function connect() {
    try {
      const r = await fetch('/api/youtube/connect');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      // Open OAuth URL in new tab
      window.open(d.url, '_blank');
      toast.success('Opening Google consent screen in a new tab...');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function checkStatus() {
    const r = await fetch('/api/youtube/status');
    const d = await r.json();
    setConnected(!!d.connected);
    setYtConnected(!!d.connected);
    if (d.connected) {
      toast.success('YouTube is connected!');
    } else {
      toast.error('YouTube not connected yet');
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Status banner */}
      <Card className={connected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
        <CardContent className="p-4 flex items-center gap-3">
          {connected ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-emerald-700">YouTube connected</p>
                <p className="text-xs text-muted-foreground">Auto-posting is active. Scheduled shorts will be uploaded automatically.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-amber-700">YouTube not connected</p>
                <p className="text-xs text-muted-foreground">
                  Save your OAuth credentials below, then click "Connect YouTube" to grant upload permission.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* OAuth credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500" /> YouTube OAuth Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId" className="text-xs">Google OAuth Client ID</Label>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientSecret" className="text-xs">Google OAuth Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-xxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirectUri" className="text-xs">
              Redirect URI <span className="text-muted-foreground">(leave blank to auto-use this app's URL)</span>
            </Label>
            <Input
              id="redirectUri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="/api/youtube/callback"
              className="font-mono text-xs"
            />
            {configured && (
              <p className="text-xs text-muted-foreground">
                Make sure this exact URL is added to "Authorized redirect URIs" in your Google Cloud Console.
              </p>
            )}
          </div>

          <Button onClick={save} disabled={saving} className="bg-red-500 hover:bg-red-600 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save credentials
          </Button>
        </CardContent>
      </Card>

      {/* Connect button */}
      {configured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Grant YouTube Upload Permission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Click the button below to open Google's consent screen and grant this app permission to upload videos to your YouTube channel.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={connect} disabled={connected} className="bg-red-500 hover:bg-red-600 text-white">
                <Youtube className="w-4 h-4 mr-1.5" /> Connect YouTube
              </Button>
              <Button onClick={checkStatus} variant="outline">
                <RefreshCw /> Re-check status
              </Button>
            </div>
            {connected && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Already connected. You can post shorts to YouTube.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Guide · 5 minutes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step n={1}>
            Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3" /></a> and create or select a project.
          </Step>
          <Step n={2}>
            In <strong>APIs &amp; Services → Library</strong>, search for and <strong>enable</strong> "YouTube Data API v3".
          </Step>
          <Step n={3}>
            In <strong>APIs &amp; Services → OAuth consent screen</strong>, choose "External", fill app name (e.g. "ShortForge"), your email, and add yourself as a Test User.
          </Step>
          <Step n={4}>
            In <strong>APIs &amp; Services → Credentials → Create credentials → OAuth client ID</strong>, choose "Web application". Add the redirect URI shown above to "Authorized redirect URIs". Copy the Client ID and Client Secret.
          </Step>
          <Step n={5}>
            Paste them above, click <strong>Save credentials</strong>, then click <strong>Connect YouTube</strong>. Grant permission on Google's consent screen. Done!
          </Step>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-red-500/15 text-red-600 font-semibold text-xs flex items-center justify-center shrink-0">
        {n}
      </div>
      <div className="text-sm leading-relaxed pt-0.5">{children}</div>
    </div>
  );
}
