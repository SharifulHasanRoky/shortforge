# ShortForge — Faceless YouTube Shorts Automation

A fully autonomous system that creates and posts **faceless YouTube Shorts** for the USA market. Drop a hint or set up a campaign once — the system handles script writing, voiceover, AI images, captions, scheduling, and YouTube auto-posting on its own.

> Built with Next.js 16, TypeScript, Tailwind CSS, Prisma, z-ai-web-dev-sdk, ffmpeg, and the YouTube Data API.

---

## ✨ Features

### Autonomous Auto-Pilot Mode
- Set up a **Campaign** once (niche + posting times + image mode)
- System auto-generates a **pool of 30 topic ideas** via LLM
- At each scheduled time slot (e.g. 9 AM, 1 PM, 7 PM Eastern), system:
  - Picks the next unused topic
  - Generates the full video (script → voice → images → captions)
  - Posts to YouTube automatically
- When topic pool runs low, **auto-generates 20 more topics**
- No manual intervention needed per video

### Manual Create Mode
- Drop a hint → get a ready-to-post Short
- Live progress tracking through each pipeline step
- Schedule for next available slot or post immediately

### Pipeline (per Short)
1. **Script generation** — LLM writes title, hook, 110–150 word voiceover, 4 image prompts, hashtags (robust JSON parsing)
2. **Voiceover** — TTS with American male voice (`jam`), chunked for long scripts, word-level timings probed from audio duration
3. **Image generation** — 4 cinematic AI images at 768×1344, with 30s timeout per request + retry on 429/5xx + **gradient-slide fallback** when API is rate-limited
4. **Video composition** — ffmpeg combines:
   - Ken Burns zoom clips per image
   - Voiceover audio
   - **Hormozi-style ASS captions** (yellow bold text, word-by-word pop, thick black outline)
   - Big hook overlay at start

### YouTube Auto-Posting
- OAuth2 flow with refresh-token persistence
- Uploads scheduled Shorts automatically when their slot time hits
- 10,000 quota/day free tier = ~150 uploads/day (plenty for 3/day)

### Dashboard Tabs
- **Dashboard** — stats, upcoming posts, recent activity
- **Auto-Pilot** — create/manage campaigns, view topic pool + recent shorts
- **Create** — manual one-off Short generation with live progress
- **Library** — grid of all Shorts with preview, schedule/post/regenerate/delete
- **Schedule** — 3 slots/day visualization, ready/scheduled/posted lists
- **Settings** — YouTube OAuth credentials + 5-step setup guide

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- ffmpeg installed and in PATH
- A Google Cloud project with **YouTube Data API v3** enabled (free)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/shortforge.git
cd shortforge
bun install        # or npm install
```

### Set up environment

Create `.env`:

```env
DATABASE_URL=file:./db/custom.db
```

### Initialize database

```bash
bun run db:push
```

### Run the dev server

```bash
bun run dev
```

Open `http://localhost:3000`.

---

## 🔑 YouTube OAuth Setup (one-time, 5 minutes)

To enable auto-posting, you need to create Google Cloud OAuth credentials. **This is free.**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project
2. **APIs & Services → Library** → search and **enable** "YouTube Data API v3"
3. **APIs & Services → OAuth consent screen** → choose "External", fill app name + your email, add yourself as a Test User
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → choose "Web application"
5. Add the redirect URI shown in the app's **Settings** tab to "Authorized redirect URIs"
6. Copy the **Client ID** and **Client Secret**
7. In the app: **Settings** tab → paste credentials → **Save** → click **Connect YouTube**
8. Grant permission on Google's consent screen → done

After this, the system can post Shorts to your YouTube channel automatically.

---

## 🤖 Setting up an Autonomous Campaign

1. Open the app → go to **Auto-Pilot** tab
2. Click **New Campaign**
3. Fill in:
   - **Name** (e.g. "USA Motivational")
   - **Niche** — pick from motivational / fun facts / history / tech / psychology / custom
   - **Posting times** — pick 1–6 slots in USA Eastern Time (3/day is the sweet spot)
   - **Image style** — AI Images (cinematic, slower) or Gradient Fast (quick, no API rate limits)
   - **Custom instructions** (optional) — overrides default LLM behavior
4. Click **Create + Generate Topics** — system generates 30 topic ideas
5. Walk away. The system handles the rest.

### How autonomous mode works

The scheduler tick (fires every 30s while dashboard is open) does two things:
1. **Autonomous mode** — for each active campaign, checks today's slots. For any unfilled slot, picks the next unused topic from the pool, creates a Short with `scheduledAt` set to the slot time, and fires the generation pipeline in the background.
2. **Posting mode** — when a scheduled Short's slot time hits, uploads it to YouTube.

When the topic pool drops below 5 unused, the system auto-generates 20 more via LLM. So a campaign runs forever.

### 24/7 operation

By default the scheduler only ticks while the dashboard is open in a browser tab. For 24/7 operation, deploy with a cron service that pings `POST /api/scheduler/tick` every minute:

**Vercel Cron** (`vercel.json`):
```json
{
  "crons": [
    { "path": "/api/scheduler/tick", "schedule": "* * * * *" }
  ]
}
```

**Railway Cron / cron-job.org** — set a job to POST to `https://your-app.com/api/scheduler/tick` every minute.

---

## 📂 Project Structure

```
shortforge/
├── prisma/
│   └── schema.prisma              # Short, Campaign, Setting, ActivityLog models
├── src/
│   ├── app/
│   │   ├── page.tsx               # Single-page app with 6 tabs
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── shorts/
│   │       │   ├── generate/      # POST - start manual generation
│   │       │   ├── list/          # GET - list all shorts
│   │       │   ├── [id]/          # GET/DELETE - single short
│   │       │   │   ├── schedule/  # POST - assign to time slot
│   │       │   │   ├── post-now/  # POST - upload to YouTube now
│   │       │   │   ├── retry/     # POST - regenerate failed short
│   │       │   │   ├── serve/     # GET - stream video file
│   │       │   │   └── thumbnail/ # GET - get thumbnail image
│   │       ├── campaigns/         # CRUD + generate-topics
│   │       ├── youtube/           # connect, callback, status
│   │       ├── settings/          # YouTube OAuth config
│   │       ├── scheduler/tick/    # autonomous + posting tick
│   │       └── stats/             # dashboard summary
│   ├── lib/
│   │   └── shorts/
│   │       ├── pipeline.ts                # orchestrator
│   │       ├── script-generator.ts        # LLM script + JSON parser
│   │       ├── image-generator.ts         # AI images + gradient fallback
│   │       ├── voice-generator.ts         # TTS voiceover
│   │       ├── video-composer.ts          # ffmpeg composition
│   │       ├── ass-generator.ts           # Hormozi-style captions
│   │       ├── youtube-uploader.ts        # OAuth + upload
│   │       ├── scheduler.ts               # posting logic
│   │       ├── autonomous-scheduler.ts    # campaign logic
│   │       ├── topic-pool-generator.ts    # LLM topic brainstormer
│   │       └── store.ts                   # Zustand state
│   └── components/
│       └── shorts/
│           ├── header.tsx
│           ├── dashboard-tab.tsx
│           ├── campaigns-tab.tsx
│           ├── create-tab.tsx
│           ├── library-tab.tsx
│           ├── schedule-tab.tsx
│           ├── settings-tab.tsx
│           ├── scheduler-tick.tsx
│           └── ui-helpers.tsx
├── package.json
├── .gitignore
└── README.md
```

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite
- **AI**: z-ai-web-dev-sdk (LLM, TTS, image generation)
- **Video**: ffmpeg (Ken Burns zoom, ASS subtitles, muxing)
- **YouTube**: googleapis (OAuth2 + Data API v3)
- **State**: Zustand + TanStack Query
- **Icons**: lucide-react

---

## 📝 Notes

- **Image API rate limits**: If the z-ai image API is rate-limited (429) or unavailable, the system automatically falls back to gradient slides with text overlays so the pipeline never gets stuck.
- **Voice**: Uses the `jam` voice (English gentleman) which works well for USA motivational content. Adjust in `voice-generator.ts` if you want a different voice.
- **Captions**: Default style is Hormozi-style — yellow bold text, word-by-word pop, black outline, bottom-center. Adjust colors/fonts/position in `ass-generator.ts`.
- **Time zone**: All scheduling uses USA Eastern Time (UTC-5 EST). For EDT or other zones, adjust `ET_OFFSET_HOURS` in `autonomous-scheduler.ts`.

---

## 📄 License

MIT — do whatever you want with this. Build a faceless empire.

---

## 🙌 Acknowledgements

Built with the [Z.ai](https://z.ai) platform and SDK.
