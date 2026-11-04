# Render.com Deployment Guide — ShortForge (FREE, no credit card)

This guide walks you through deploying ShortForge **completely free** using:
- **Render.com** — free web service hosting (Docker, ffmpeg support)
- **Supabase** — free PostgreSQL database (500MB, persistent)
- **cron-job.org** — free cron service to keep Render awake

**Total cost: $0/month** ✨

---

## Why not Vercel/Netlify?

Both Vercel and Netlify use serverless functions with:
- Read-only filesystem (SQLite + video files can't persist)
- No ffmpeg pre-installed (video composition fails)
- 10s function timeout (our pipeline takes 2-5 minutes)

**Render.com solves all of these** because it runs a real Docker container with:
- Writable filesystem (for video/audio/image storage)
- We can install ffmpeg in the Dockerfile
- No timeout (long-running processes work)
- Free tier: 750 hours/month, 512MB RAM

---

## Step 1: Create Supabase Database (5 minutes, free)

Supabase hosts a free PostgreSQL database that's perfect for our app.

1. Go to https://supabase.com
2. Click **Start your project** → sign in with GitHub
3. Click **New Project**:
   - Name: `shortforge`
   - Database password: generate a strong password (save it!)
   - Region: choose closest to USA (for the YouTube audience)
   - Plan: **Free**
4. Wait ~2 minutes for the project to provision
5. Once ready, go to **Project Settings** (gear icon bottom left) → **Database**
6. Find **Connection string** → **URI**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
7. **Copy this URL** and replace `[YOUR-PASSWORD]` with your actual password
8. Save this URL somewhere safe — you'll paste it into Render next

---

## Step 2: Deploy to Render.com (5 minutes, free)

1. Go to https://render.com
2. Click **Get Started** → sign in with GitHub
3. Click **New +** → **Blueprint**
4. Find and select your `SharifulHasanRoky/shortforge` repo
5. Render will detect `render.yaml` and configure everything automatically
6. You'll see one service: `shortforge` (web service, free plan)
7. **Before clicking Create**, expand the **Environment** section for the service
8. Find `DATABASE_URL` and paste your Supabase connection string from Step 1
9. Click **Apply** to start the deployment

The build will take ~5-8 minutes (installing ffmpeg + Node deps + building Next.js).

---

## Step 3: Get your public URL

1. Once deployed, click on the **shortforge** service
2. At the top, you'll see a URL like:
   ```
   https://shortforge-xyz.onrender.com
   ```
3. **Copy this URL** — you'll need it for YouTube OAuth and cron setup

---

## Step 4: Verify the deployment

Open these URLs in your browser:

1. **Health check**: `https://your-url.onrender.com/api/health`
   - Should return: `{"status":"ok","service":"shortforge",...}`

2. **Dashboard**: `https://your-url.onrender.com/`
   - Should show the ShortForge dashboard with the Auto-Pilot banner

If either fails, check Render logs:
- Click your service → **Logs** tab (top right)
- Look for errors in red

---

## Step 5: Keep Render awake (free cron service)

Render's free tier **sleeps after 15 minutes of inactivity**. When asleep:
- The autonomous scheduler doesn't run
- New requests take ~30s to wake the service

Solution: use a free cron service to ping every 10 minutes.

### Using cron-job.org (free, no credit card):

1. Go to https://cron-job.org
2. Sign up (free)
3. Click **CREATE CRONJOB**
4. Configure:
   - **Title**: `ShortForge keep-alive`
   - **URL**: `https://your-url.onrender.com/api/health`
   - **Execution schedule**: Every 10 minutes
   - **Schedule**: `0/10 * * * *` (every 10 min)
5. Click **CREATE**

This pings your app every 10 minutes, preventing sleep. **24/7 autonomous operation** ✅

### Alternative: GitHub Actions (free, runs every 5 min minimum)

Create `.github/workflows/keep-alive.yml` in your repo:

```yaml
name: Keep Render Awake
on:
  schedule:
    - cron: '*/5 * * * *'  # every 5 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -s https://your-url.onrender.com/api/health
```

---

## Step 6: Set up YouTube OAuth (one-time)

Now that you have a stable public URL, set up auto-posting:

### 6a. Create Google Cloud OAuth credentials

1. Go to https://console.cloud.google.com/
2. Create or select a project
3. **APIs & Services → Library** → search and **enable** "YouTube Data API v3"
4. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: `ShortForge`
   - User support email: your email
   - Developer contact: your email
   - Save → Add scope: `.../auth/youtube.upload`
   - Add yourself as a **Test User**
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: add `https://your-url.onrender.com/api/youtube/callback`
   - Click **Create**
6. Copy the **Client ID** and **Client Secret**

### 6b. Connect YouTube in the app

1. Open your Render URL: `https://your-url.onrender.com/`
2. Go to **Settings** tab
3. Paste the **Client ID** and **Client Secret**
4. Click **Save credentials**
5. Click **Connect YouTube** → Google consent screen opens
6. Grant permission
7. You'll be redirected back to the app — YouTube should now show "Connected" ✅

---

## Step 7: Set up an autonomous campaign

1. Go to **Auto-Pilot** tab
2. Click **New Campaign**
3. Configure:
   - Name: `USA Motivational`
   - Niche: `Motivational` (or your choice)
   - Posting times: pick 3 slots (e.g. 9 AM, 1 PM, 7 PM ET)
   - Image style: `Gradient Fast` (recommended — no API rate limit issues) or `AI Images` (cinematic but slower)
4. Click **Create + Generate Topics**
5. The system auto-generates 30 topic ideas

---

## Step 8: Walk away. The system handles the rest.

Now your ShortForge is fully autonomous:

- ✅ Cron-job.org keeps Render awake (every 10 min ping)
- ✅ At each scheduled time, scheduler picks next topic from pool
- ✅ Generates full video (script → voice → images → captions)
- ✅ Posts to YouTube automatically
- ✅ When topic pool runs low, generates 20 more
- ✅ All activity shows in dashboard activity log

---

## Troubleshooting

### Build fails on Render
- Check Render **Logs** tab during build
- Common issue: `bun.lock` corrupt → we now use `npm install` in Dockerfile
- If still fails, try: clear Render cache (Settings → Manual Deploy → Clear build cache)

### `/api/health` returns 500 or "Internal Server Error"
- Most likely cause: `DATABASE_URL` not set or wrong format
- Verify in Render dashboard: Environment → DATABASE_URL should be your Supabase URL
- Verify Supabase project isn't paused (free tier pauses after 7 days of inactivity — just visit the Supabase dashboard to wake it)

### Database connection errors
- Supabase free tier pauses databases after 7 days of no activity
- Solution: just visit your Supabase dashboard once a week (or set up a cron to ping Supabase too)
- The `cron-job.org` ping from Step 5 also keeps your app active, which keeps DB active

### App works but videos don't generate (429 errors)
- The z-ai image API has rate limits
- Switch the campaign's image mode to **Gradient Fast** (edit campaign in Auto-Pilot tab)
- Or wait a few hours and retry — daily rate limits reset

### YouTube OAuth callback fails
- Make sure the redirect URI in Google Cloud Console EXACTLY matches:
  `https://your-url.onrender.com/api/youtube/callback`
- No trailing slash, no extra path
- If you changed your Render URL, update Google Cloud and re-click "Connect YouTube"

### Render service goes to sleep despite cron
- Verify your cron-job.org job is running (check its dashboard logs)
- Verify the URL is correct: `https://your-url.onrender.com/api/health`
- Should return `{"status":"ok"...}` — if it errors, your app is broken

### Storage runs out (Render free: 1GB ephemeral)
- Each video = ~2-5MB
- After ~200 videos, disk fills up
- Solution: YouTube upload + delete local file (currently we don't auto-delete)
- Workaround: Render redeploys give you fresh disk (just push any commit to GitHub)

---

## Cost summary

| Service | Free tier | Our usage |
|---------|-----------|-----------|
| GitHub | unlimited public repos | 1 repo |
| Render.com | 750 hrs/month, 512MB RAM | 1 web service |
| Supabase | 500MB DB, 7-day pause | 1 database |
| cron-job.org | unlimited cron jobs | 1 job |
| Google Cloud (YouTube API) | 10,000 units/day | ~3 uploads/day |
| **Total monthly cost** | | **$0** |

---

## Need help?

- **Full README**: https://github.com/SharifulHasanRoky/shortforge#readme
- **Issues**: https://github.com/SharifulHasanRoky/shortforge/issues
- **Render docs**: https://render.com/docs
- **Supabase docs**: https://supabase.com/docs

---

## Quick reference: What you need to do

1. ✅ Create Supabase project → get DATABASE_URL
2. ✅ Deploy to Render.com → use render.yaml blueprint → set DATABASE_URL env var
3. ✅ Get your Render public URL
4. ✅ Set up cron-job.org → ping `https://your-url.onrender.com/api/health` every 10 min
5. ✅ Set up Google Cloud YouTube OAuth → add `https://your-url.onrender.com/api/youtube/callback` as redirect URI
6. ✅ Open app → Settings tab → paste OAuth creds → Connect YouTube
7. ✅ Auto-Pilot tab → New Campaign → walk away

**Total setup time: ~30 minutes. Then it runs forever for free.** 🚀
