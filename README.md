# 🔥 GrindOs

GrindOs is a simple habit tracker and gym logger built for consistency. Log workouts, walks, reading, mood, and nutrition in one place with a local-first flow and optional cloud sync.

## ✨ Features

- **Daily Dashboard:** Fast checkboxes for your core habits and gym session.
- **Custom Workout Logger:** Build your own routine and track sets, reps, and notes without leaving the app.
- **Progress Insights:** Heatmaps, charts, and photo timelines to review consistency.
- **Weekly Wrapped:** Auto weekly summaries for momentum and reflection.
- **AI Coach:** Data-driven prompts and tips based on your actual logs.
- **Cloud Sync + Recovery:** Sync with Supabase and recover streaks from cloud logs.

## 🔒 Privacy

1. **You own your data:** local-first storage, with account-isolated cloud sync.
2. **Secure AI proxy:** Gemini key stays server-side.
3. **No ad-tech tracking:** no behavioral analytics or fingerprinting.

## 🚀 Use It

👉 **[https://iron-75.vercel.app](https://iron-75.vercel.app)**

## 💻 Development

### Stack

- Next.js 16 (React 19)
- Tailwind CSS v4 + Framer Motion
- Supabase (PostgreSQL + Auth + RLS)
- TypeScript + Vitest

### Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_INSTANCE].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_KEY]
GEMINI_API_KEY=[YOUR_AI_KEY] # optional
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for Supabase auth/cloud sync. If missing, Supabase calls fail fast with a descriptive config error instead of using placeholder credentials.

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
