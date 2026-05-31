# Dr. Sumaya Clinic — AI Smile Preview

The **"شوف ابتسامتك الجديدة"** section now uses **Google Gemini** to redesign the
teeth in an uploaded photo (real AI), instead of the old in-browser whitening filter.

## How it works

```
Browser (index.html + smile.js)
   │  uploads the photo (downscaled to ≤1024px, JPEG)
   ▼
/api/smile.js   ← Vercel serverless function
   │  sends photo + "edit teeth only" prompt to Gemini (gemini-2.5-flash-image)
   ▼
Gemini returns the edited image → shown with a قبل / بعد toggle
```

Only the teeth are changed (color, alignment, shape, spacing); the face, lips, skin,
eyes, hair and expression are preserved by the prompt in
[`api/smile.js`](api/smile.js).

## 1. Add your Gemini API key

Get a free key from **Google AI Studio** → https://aistudio.google.com/apikey

Then create a `.env` file in this folder (copy from `.env.example`):

```
GEMINI_API_KEY=AIza...your-real-key...
```

`.env` is git-ignored — your key stays private and is never sent to the browser.

## 2. Run locally

```bash
npm install     # installs @google/genai (one-time)
npm start       # serves the site + the /api/smile function on :3000
```

Open **http://localhost:3000** and try the smile section. `npm start` runs a tiny
zero-dependency dev server (`dev-server.mjs`) that loads `GEMINI_API_KEY` from `.env`
and serves both the static site and the API — no Vercel login required.

> Opening `index.html` directly (file://) shows the UI but the **Generate** button
> won't work — it needs the `/api/smile` endpoint, so use `npm start` (or a deploy).

Prefer the real Vercel runtime locally? `npm run dev:vercel` (needs the Vercel CLI).

## 3. Deploy

```bash
npm run deploy       # = "vercel --prod"
```

After deploying, add the key in the Vercel dashboard:
**Project → Settings → Environment Variables → `GEMINI_API_KEY`**, then redeploy.

## Notes

- **Cost:** each generation is one Gemini image call. Watch usage in Google AI Studio.
- **Privacy:** the photo is sent to Google's Gemini API for processing. Our function
  does not store it. The disclaimer text in the section reflects this.
- **Model:** `gemini-2.5-flash-image` (a.k.a. "Nano Banana"). If your account only has
  the preview, change `MODEL` in [`api/smile.js`](api/smile.js) to
  `gemini-2.5-flash-image-preview`.
- **Styles:** the three chips (طبيعي / مشرق / هوليوود) change the prompt sent to Gemini —
  see `STYLE_PROMPTS` in [`api/smile.js`](api/smile.js).
- `Dr Sumaya Clinic.html` is a separate single-file offline build and is **not** wired to
  the API. The live site is `index.html`.
