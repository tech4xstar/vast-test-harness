import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSignedEmbedUrl } from "./bunny.js";
import { recordWebhook, listWebhooks } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  BUNNY_LIBRARY_ID,
  BUNNY_VIDEO_ID,
  BUNNY_TOKEN_SECURITY_KEY,
  TOKEN_TTL_SECONDS = "120",
  WEBHOOK_SHARED_SECRET = "",
  PORT = "3000",
} = process.env;

const app = express();

// Capture the raw body so we can both parse JSON and (optionally) verify a
// signature/shared secret on incoming webhooks.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));

// ---------------------------------------------------------------------------
// Config probe for the frontend: tells the page which library/video to embed
// WITHOUT ever exposing the secret token key.
// ---------------------------------------------------------------------------
// Paths are NOT under /api/* — Vercel reserves that prefix for serverless files.
app.get("/config", (_req, res) => {
  res.json({
    libraryId: BUNNY_LIBRARY_ID || null,
    videoId: BUNNY_VIDEO_ID || null,
    ttlSeconds: Number(TOKEN_TTL_SECONDS),
    configured: Boolean(
      BUNNY_LIBRARY_ID && BUNNY_VIDEO_ID && BUNNY_TOKEN_SECURITY_KEY
    ),
  });
});

// ---------------------------------------------------------------------------
// SIGNED ACCESS: the "Request Video to Play" button calls this. The signed,
// time-limited iframe URL is built server-side so the secret key never leaks.
// ---------------------------------------------------------------------------
app.get("/play-token", (req, res) => {
  if (!BUNNY_LIBRARY_ID || !BUNNY_TOKEN_SECURITY_KEY) {
    return res.status(500).json({
      error:
        "Server not configured. Set BUNNY_LIBRARY_ID and BUNNY_TOKEN_SECURITY_KEY in .env",
    });
  }

  const videoId = req.query.videoId || BUNNY_VIDEO_ID;
  if (!videoId) {
    return res
      .status(400)
      .json({ error: "No videoId provided and BUNNY_VIDEO_ID not set." });
  }

  const signed = buildSignedEmbedUrl({
    libraryId: BUNNY_LIBRARY_ID,
    videoId,
    securityKey: BUNNY_TOKEN_SECURITY_KEY,
    ttlSeconds: Number(TOKEN_TTL_SECONDS),
    playerParams: { autoplay: "true", preload: "true" },
  });

  res.json({
    libraryId: BUNNY_LIBRARY_ID,
    videoId,
    embedUrl: signed.url,
    token: signed.token,
    expires: signed.expires,
    expiresInSeconds: signed.expires - Math.floor(Date.now() / 1000),
  });
});

// ---------------------------------------------------------------------------
// WEBHOOK RECEIVER: subscribe Bunny's "video.encoded" (and other) events to
// {PUBLIC_URL}/webhook. Every event is logged to the filesystem (+ DB).
// ---------------------------------------------------------------------------
app.post("/webhook", (req, res) => {
  if (WEBHOOK_SHARED_SECRET) {
    const provided =
      req.query.secret || req.get("x-webhook-secret") || "";
    if (provided !== WEBHOOK_SHARED_SECRET) {
      console.warn("[webhook] rejected: bad/missing shared secret");
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const record = recordWebhook(req.body || {});
  console.log(
    `[webhook] ${record.event} video=${record.videoId} ` +
      `status=${record.status} (${record.statusLabel || "?"})`
  );

  // Bunny only needs a 2xx to consider the delivery successful.
  res.status(200).json({ ok: true });
});

// Read back recent events (used by the demo page's "Webhook log" panel).
app.get("/webhooks", (_req, res) => {
  res.json(listWebhooks(50));
});

// Vercel runs this file as a serverless handler (see api/index.js).
// Locally we start a normal HTTP server.
export default app;

if (!process.env.VERCEL) {
  app.listen(Number(PORT), () => {
    console.log(`\nBunny Stream POC running: http://localhost:${PORT}`);
    console.log(`  Demo page     : http://localhost:${PORT}/`);
    console.log(`  Webhook URL   : http://localhost:${PORT}/webhook  (POST)`);
    console.log(`  Webhook log   : http://localhost:${PORT}/webhooks`);
    if (!BUNNY_TOKEN_SECURITY_KEY) {
      console.log(
        "\n  WARNING: BUNNY_TOKEN_SECURITY_KEY is not set — signed playback will fail."
      );
    }
  });
}
