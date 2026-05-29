# Bunny Stream POC — Secure Playback + Webhooks

A proof-of-concept that demonstrates **Bunny Stream's native** secure-video
features end to end. The repo contains the only pieces that genuinely require
code:

1. A **hostable web page** with a **"Request Video to Play"** button that
   performs **token-authenticated (signed-URL) playback** using Bunny's
   out-of-the-box iframe player.
2. A **server** that mints short-lived **Signed URLs / embed tokens**
   server-side (the secret key never reaches the browser).
3. A **webhook receiver** that subscribes to Bunny events (e.g.
   `video.encoded`) and **logs every event to the file system *and* a
   database**.

Everything else in the brief (transcoding profiles, watermark, captions, DRM,
domain restrictions, brand colors, heatmap, resumable playback, enabling Token
Auth) is **native Bunny dashboard configuration** — there is no code for it.
Those steps are documented in [Dashboard configuration](#dashboard-configuration-no-code)
below so you can flip each toggle and record the demo.

---

## 1. Quick start (the code)

```bash
npm install
cp .env.example .env      # then fill in the values from your Bunny dashboard
npm start
```

Open http://localhost:3000 and click **Request Video to Play**.

### Required `.env` values

| Variable                   | Where to find it in Bunny                                              |
| -------------------------- | ---------------------------------------------------------------------- |
| `BUNNY_LIBRARY_ID`         | Stream → your library → **Library ID** (a number).                     |
| `BUNNY_VIDEO_ID`           | Stream → Manage Videos → a video's **GUID**.                           |
| `BUNNY_TOKEN_SECURITY_KEY` | Stream → library → API → Security → **Token Authentication Key**.      |
| `TOKEN_TTL_SECONDS`        | How long each signed URL is valid (60–300s recommended).               |
| `WEBHOOK_SHARED_SECRET`    | Optional secret appended to the webhook URL to reject spoofed calls.   |
| `PORT`                     | Local port (default `3000`).                                           |

> The `Token Authentication Key` is **not** the regular API key. It lives in the
> library's security settings and is the secret used to sign embed tokens.

---

## 2. How signed playback works

```
Browser                         This server                     Bunny iframe
   │  click "Request Video"        │                                 │
   ├──────  GET /play-token ───────>│                                 │
   │                               │ token = SHA256_HEX(             │
   │                               │   securityKey + videoId + exp)  │
   │ <── { embedUrl, expires } ────┤                                 │
   │  inject <iframe src=embedUrl> │                                 │
   ├───────────────────────────────────────  GET /embed/..?token ──>│
   │                                          (Bunny validates token)│
   │ <──────────────  player streams the video  ───────────────────┤
```

The token algorithm is Bunny's documented one
(<https://docs.bunny.net/stream/token-authentication>):

```
token   = SHA256_HEX(token_security_key + video_id + expiration)
embedUrl= https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token=...&expires=...
```

Implemented in [`src/bunny.js`](src/bunny.js); served by `GET /play-token`
in [`src/server.js`](src/server.js). If you disable Token Authentication in the
dashboard the page still works; once you **enable** it, only the signed URL
loads and a raw embed URL returns `403`.

---

## 3. Webhooks (logged to file system + database)

- **Endpoint:** `POST /webhook`
- **Storage:** every event is appended to `logs/webhooks.jsonl` (file system)
  **and** inserted into `logs/webhooks.db` (SQLite, via Node's built-in
  `node:sqlite` when available). See [`src/store.js`](src/store.js).
- **Viewer:** the demo page shows a live feed; raw JSON at `GET /webhooks`.

Bunny sends a JSON body like `{ "VideoLibraryId": 759, "VideoGuid": "...",
"Status": 4 }`. Status `4` = **Finished / encoded**, `3` = transcoding, `5` =
error — these are mapped to friendly event names (`video.encoded`, etc.).

### Test it locally without a real encode

```bash
node scripts/send-test-webhook.js 4    # simulate "video.encoded"
```

### Point Bunny at your endpoint

Bunny must reach your server over HTTPS. For the POC, expose `localhost:3000`
with a tunnel, e.g.:

```bash
npx localtunnel --port 3000
# or: cloudflared tunnel --url http://localhost:3000
# or: ngrok http 3000
```

Then in **Stream → library → API → Webhook**, paste
`https://<your-tunnel>/webhook` (append `?secret=<WEBHOOK_SHARED_SECRET>` if you
set one). Re-upload or re-encode a video to fire `video.encoded`.

---

## 4. Hosting the page for the signed-access demo

The "URL where I click a button to request the video" can be:

- **Local + tunnel** (fastest): `npm start`, then
  `npx localtunnel --port 3000` and share the HTTPS URL.
- **Vercel** (included): push to GitHub and import the repo. The app is wired
  for Vercel serverless via `api/index.js` + `vercel.json` (do **not** rely on
  `npm start` on Vercel).
- **Any Node host** (Render, Railway, Fly.io, a VPS): deploy this repo, set the
  same env vars, and run `npm start`.

Whichever domain you host on, add it to Bunny's **HTTP referrer whitelist**
(see below) so playback is allowed there.

### Deploy on Vercel

1. Import the GitHub repo in the [Vercel dashboard](https://vercel.com/new).
2. **Project → Settings → Environment Variables** — add every variable from
   `.env.example` (`.env` is not deployed; without these, `/play-token`
   returns 500 and the config banner stays visible):
   - `BUNNY_LIBRARY_ID`
   - `BUNNY_VIDEO_ID`
   - `BUNNY_TOKEN_SECURITY_KEY`
   - `TOKEN_TTL_SECONDS` (optional, default `120`)
   - `WEBHOOK_SHARED_SECRET` (optional)
3. Redeploy after saving env vars.
4. Set Bunny **Allowed Referrers** to your `*.vercel.app` URL (and custom domain
   if you add one).
5. Bunny webhook URL: `https://<your-app>.vercel.app/webhook`

Webhook logs on Vercel use `/tmp` (ephemeral per instance); for durable logs use
Railway/Render or an external store.

---

## Dashboard configuration (no code)

These are the native Bunny Stream settings to flip for each phase of the brief.
Do them in your own account, then capture them in the demo video.

### Phase 1 — Media ingestion
- **Native uploader (use this for now):** Stream → library → **Upload Videos** →
  drag-and-drop the asset. (The brief's S3 pull-zone step is optional and can be
  added later under Stream → library → **API/Upload** ingestion settings.)

### Phase 2 — Processing & security
- **Transcoding profiles:** library → **Encoding** → enable the resolution
  toggles (e.g. 1080p / 720p / 480p).
- **Watermark:** library → **Player** settings → upload the watermark image and
  set its position + opacity.
- **Captions:** Manage Videos → the video → **Captions/Subtitles** → upload the
  English and Chinese `.vtt`/`.srt` files and set their language labels.
- **DRM (MediaCage):** library → **Security** → enable **DRM** (single toggle).
- **Domain restrictions:** library → **Security** → **Allowed Referrers** → add
  your production/staging domains to the HTTP referrer whitelist.
- **Webhooks:** library → **API → Webhook** → paste `https://<host>/webhook` and
  subscribe to processing/encoding events (`video.encoded`). Handled by this app.

### Phase 3 — Player & UI
- **Player embed:** use Bunny's built-in iframe embed — this app already embeds
  `iframe.mediadelivery.net/embed/{library}/{video}`.
- **Token Authentication & Signed URLs:** library → **Security** → enable
  **Token Authentication**. Copy the **Token Authentication Key** into
  `BUNNY_TOKEN_SECURITY_KEY`. This app then generates the native signed URL.
- **Brand integration:** library → **Player** → set custom **hex colors**,
  **font/typography**, and upload a **clickable logo** overlay. (Tip: mirror the
  hex into `--accent` in `public/styles.css` so the demo page matches.)
- **Watchtime heatmap:** library → **Player** → enable the **heatmap** so
  engagement markers show on the timeline.
- **Resumable playback:** library → **Player** → set **resume playback** to
  **On** so the player remembers positions across sessions.

---

## Demo recording checklist

1. Show the Bunny dashboard with each Phase 1–3 toggle configured.
2. Show **Token Authentication ON** and the Token Authentication Key.
3. Open the hosted page → click **Request Video to Play** → video streams via
   the signed URL; show the issued `token`/`expires` and the countdown.
4. Show that the player has brand colors, logo overlay, captions (EN/中文),
   watermark, heatmap and resumes from last position.
5. Re-encode a video (or run `node scripts/send-test-webhook.js 4`) and show the
   `video.encoded` event appearing in the page's webhook feed, plus the entries
   in `logs/webhooks.jsonl` / `logs/webhooks.db`.

---

## Project layout

```
src/
  server.js   Express app: /play-token, /webhook, /webhooks, static site
  bunny.js    Signed embed-URL / token generation
  store.js    Webhook persistence (file system JSONL + SQLite)
public/
  index.html  Demo page with "Request Video to Play" button
  styles.css  Brandable styling (edit hex vars to match company colors)
  app.js      Signed-access flow + live webhook feed
scripts/
  send-test-webhook.js  Fire a fake webhook for the demo
```
