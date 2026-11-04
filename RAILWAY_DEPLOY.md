# Railway Deployment Guide — ShortForge

This guide walks you through deploying ShortForge to Railway.app. Railway is the recommended host because it provides:
- Persistent filesystem (SQLite + storage work out of the box)
- ffmpeg available via Dockerfile
- Long-running processes (no 10s timeout like Vercel)
- Free $5/month credit (enough for ~500 hours of running)

---

## Step 1: Sign up for Railway (1 minute)

1. Go to https://railway.app
2. Click **Login** → **Login with GitHub**
3. Authorize Railway to access your GitHub (you can choose only the `shortforge` repo)

---

## Step 2: Create a new project from GitHub (30 seconds)

1. Click **New Project** (top right)
2. Choose **Deploy from GitHub repo**
3. Select **`SharifulHasanRoky/shortforge`**
4. Railway will detect the `Dockerfile` and start building automatically

The build will take ~3-5 minutes (installing ffmpeg + Node + Bun + building Next.js).

---

## Step 3: Add a custom domain (so you get a stable URL)

By default Railway gives you a URL like `shortforge-production.up.railway.app`. To get a stable one:

1. Click on your **shortforge** service in the Railway dashboard
2. Go to **Settings** tab
3. Scroll to **Networking** → **Generate Domain**
4. You'll get a URL like `shortforge-production-abc123.up.railway.app`
5. **Copy this URL** — you'll need it for YouTube OAuth setup

---

## Step 4: Verify the deployment

Once the build finishes, Railway will show a green "Active" badge. Test your deployment:

1. Visit `https://your-railway-url.up.railway.app/api/health`
2. You should see: `{"status":"ok","service":"shortforge",...}`
3. Visit `https://your-railway-url.up.railway.app/` — the dashboard should load

---

## Step 5: Set up YouTube OAuth (one-time)

Now that you have a public URL, set up YouTube auto-posting:

### 5a. Create Google Cloud OAuth credentials

1. Go to https://console.cloud.google.com/
2. Create or select a project
3. **APIs & Services → Library** → enable **YouTube Data API v3**
4. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: `ShortForge`
   - User support email: your email
   - Developer contact: your email
   - Save → Add scope: `.../auth/youtube.upload`
   - Add yourself as a **Test User**
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: add `https://your-railway-url.up.railway.app/api/youtube/callback`
   - Click **Create**
6. Copy the **Client ID** and **Client Secret**

### 5b. Connect YouTube in the app

1. Open your Railway deployment URL in a browser
2. Go to **Settings** tab
3. Paste the **Client ID** and **Client Secret**
4. Click **Save credentials**
5. Click **Connect YouTube** → Google consent screen opens
6. Grant permission
7. You'll be redirected back to the app — YouTube should now show "Connected"

---

## Step 6: Set up an autonomous campaign

1. Go to **Auto-Pilot** tab
2. Click **New Campaign**
3. Configure:
   - Name: `USA Motivational`
   - Niche: `Motivational` (or your choice)
   - Posting times: pick 3 slots (e.g. 9 AM, 1 PM, 7 PM ET)
   - Image style: `Gradient Fast` (recommended — works without hitting image API rate limits) or `AI Images` (cinematic but slower)
4. Click **Create + Generate Topics**
5. The system auto-generates 30 topic ideas

---

## Step 7: Keep the autonomous scheduler running 24/7

By default, the autonomous scheduler only runs while someone has the dashboard open in a browser. For true 24/7 autonomous operation, you need a cron service that pings your `/api/scheduler/tick` endpoint every minute.

### Option A: Use Railway's cron (recommended)

Railway doesn't have built-in cron, but you can add a second service that runs a simple cron loop:

1. In your Railway project, click **New → GitHub Repo** → select `SharifulHasanRoky/shortforge` again
2. Name it `shortforge-cron`
3. Set the **Start command** to:
   ```
   sh -c 'while true; do curl -s -X POST https://your-railway-url.up.railway.app/api/scheduler/tick > /dev/null; sleep 60; done'
   ```
4. This service just pings your main app every 60 seconds forever

### Option B: Use a free external cron service

1. Sign up for https://cron-job.org (free)
2. Create a cron job:
   - URL: `https://your-railway-url.up.railway.app/api/scheduler/tick`
   - Method: `POST`
   - Schedule: every minute (`* * * * *`)
3. Save — the service will ping your app every minute forever

### Option C: Use GitHub Actions (free, runs every 5 min minimum)

Create `.github/workflows/tick.yml` in the repo:

```yaml
name: Scheduler Tick
on:
  schedule:
    - cron: '*/5 * * * *'  # every 5 minutes (GitHub Actions minimum)
jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://your-railway-url.up.railway.app/api/scheduler/tick
```

GitHub Actions free tier gives 2000 minutes/month — way more than enough.

---

## Step 8: Walk away. The system handles the rest.

Now your ShortForge is fully autonomous:

- At each scheduled time (9 AM, 1 PM, 7 PM ET), the scheduler picks the next topic from the pool
- Generates the full video (script → voice → images → captions)
- Posts to YouTube automatically
- When topic pool runs low, generates 20 more topics
- All activity shows in the dashboard activity log

---

## Troubleshooting

### Build fails with "bun install" error
- Check Railway build logs
- The Dockerfile tries `--frozen-lockfile` first, then falls back to `bun install`
- If both fail, the `bun.lock` file might be corrupt — try deleting it and re-running locally

### App starts but `/api/health` returns 500
- Check Railway logs (the "Deployments" tab → click on latest deployment → "Logs")
- Likely a Prisma error — make sure `DATABASE_URL=file:/app/db/custom.db` is set
- The `db/custom.db` directory is auto-created by the Dockerfile

### YouTube OAuth callback fails
- Make sure the redirect URI in Google Cloud Console EXACTLY matches `https://your-railway-url.up.railway.app/api/youtube/callback`
- No trailing slash, no extra path
- If you changed your Railway URL, update both Google Cloud and re-click "Connect YouTube"

### Videos not generating (429 errors)
- The z-ai image API has rate limits
- Switch the campaign's image mode to **Gradient Fast** in the Auto-Pilot tab (edit the campaign)
- Or wait a few hours and retry — the rate limit resets daily

### Scheduler not running automatically
- Make sure you set up Step 7 (cron service)
- Check Railway logs for `/api/scheduler/tick` requests
- The dashboard's frontend also pings every 30s while open — but you can't keep a browser open 24/7

### Railway free credit runs out
- $5/month gives you ~500 hours of running
- 24/7 = ~720 hours/month — slightly over free tier
- Solutions:
  - Upgrade to Railway Hobby plan ($5/month, includes 500 hours + $5 credit)
  - Or use the GitHub Actions tick (Step 7 Option C) and let Railway sleep between ticks

---

## Cost summary

- **GitHub**: free (public repo)
- **Railway**: $5 free credit on signup (covers ~500 hours)
- **Google Cloud (YouTube API)**: free (10,000 quota/day = ~150 uploads/day)
- **Domain**: not required (use Railway's free `*.up.railway.app` URL)
- **z-ai-web-dev-sdk**: included in the Z.ai platform

**Total monthly cost: $0** (within free tiers) or **$5/month** (Railway Hobby for 24/7)

---

## Need help?

- Check the **README.md** in the repo for full documentation
- Issues tab: https://github.com/SharifulHasanRoky/shortforge/issues
