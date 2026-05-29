import crypto from "node:crypto";

/**
 * Bunny Stream "Embed View" token authentication.
 *
 * Per https://docs.bunny.net/stream/token-authentication the token is:
 *   token = SHA256_HEX(token_security_key + video_id + expiration)
 * and the secure iframe URL is:
 *   https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token=...&expires=...
 *
 * The token security key is the "Token Authentication Key" from the Stream
 * library security settings and must stay server-side.
 */
export function generateEmbedToken({ securityKey, videoId, expires }) {
  const data = `${securityKey}${videoId}${expires}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Build a fully signed, time-limited iframe embed URL for a given video.
 * Extra player query params (autoplay, etc.) are appended after signing —
 * the iframe token only covers libraryId/videoId/expires.
 */
export function buildSignedEmbedUrl({
  libraryId,
  videoId,
  securityKey,
  ttlSeconds = 120,
  playerParams = {},
}) {
  const expires = Math.floor(Date.now() / 1000) + Number(ttlSeconds);
  const token = generateEmbedToken({ securityKey, videoId, expires });

  const url = new URL(
    `https://player.mediadelivery.net/play/${libraryId}/${videoId}`
  );
  url.searchParams.set("token", token);
  url.searchParams.set("expires", String(expires));
  for (const [key, value] of Object.entries(playerParams)) {
    url.searchParams.set(key, String(value));
  }

  return { url: url.toString(), token, expires };
}
