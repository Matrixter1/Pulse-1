# Pulse by Matrixter

A public opinion platform with identity-verified voting. The core feature is the **Truth Gap™** — the measurable divergence between what everyone says and what KYC-verified humans actually believe.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full contents of `supabase/schema.sql`
3. This creates the tables, RLS policies, and seeds the 6 sample questions

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these in your Supabase project under **Settings → API**.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## User Tiers

| Tier | Access |
|------|--------|
| **Guest** | Browse questions, see unverified public results only |
| **Registered** | Vote, see combined (all) sentiment data |
| **Verified** | Full access — votes enter the Truth Layer, can see the split between verified vs. unverified sentiment and the Truth Gap % |

---

## Pages

| Route | Description |
|-------|-------------|
| `/splash` | Landing page with animated star field, pulse rings, and tier-entry cards |
| `/feed` | Question feed with category filter pills and ratio bars |
| `/vote/:id` | Draggable spectrum slider (0–100), reason chips, submit |
| `/results/:id` | Truth Gap card, split sentiment panels (All vs Verified) |
| `/verify` | KYC onboarding placeholder (integration coming soon) |

---

## Database Schema

```
questions   id, text, category, created_at
votes       id, question_id, user_id, spectrum_value, reason, is_verified, created_at
users       id, email, tier, created_at
```

**Spectrum bucketing:**
- 0–33 → Disagree
- 34–66 → Neutral  
- 67–100 → Agree

**Truth Gap** = absolute difference between the top-bucket % in All votes vs Verified-only votes.

---

## Deploy to Netlify

1. Push to a GitHub repo
2. Connect the repo in Netlify
3. Set build command: `npm run build`, publish directory: `dist`
4. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Netlify → Site settings → Environment variables
5. The `netlify.toml` handles SPA routing redirects automatically

---

## Promoting a user to Verified (manual, until KYC integration)

In the Supabase dashboard, go to **Table Editor → users**, find the user's row, and change their `tier` field from `registered` to `verified`.

---

## Tech Stack

- **Frontend:** React 18 + Vite + React Router v6
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Styling:** CSS custom properties (no build-time CSS framework)
- **Fonts:** Cormorant Garamond (display) + Syne (UI) via Google Fonts
- **Deploy:** Netlify
