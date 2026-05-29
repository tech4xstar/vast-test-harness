import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "webhooks.jsonl");

fs.mkdirSync(LOG_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Optional SQLite persistence.
// Node 22 ships an experimental built-in "node:sqlite". If it is available we
// also persist to a real database; otherwise the JSONL file is the system of
// record. Either way the "logged to file system or database" requirement is met.
// ---------------------------------------------------------------------------
let db = null;
try {
  const { DatabaseSync } = await import("node:sqlite");
  db = new DatabaseSync(path.join(LOG_DIR, "webhooks.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      received_at TEXT NOT NULL,
      event      TEXT,
      video_id   TEXT,
      library_id TEXT,
      status     INTEGER,
      payload    TEXT NOT NULL
    );
  `);
  console.log("[store] SQLite database enabled at logs/webhooks.db");
} catch (err) {
  console.log(
    "[store] node:sqlite unavailable, using filesystem JSONL only " +
      `(${err.code || err.message})`
  );
}

const STATUS_LABELS = {
  0: "Created",
  1: "Uploaded",
  2: "Processing",
  3: "Transcoding",
  4: "Finished",
  5: "Error",
  6: "UploadFailed",
};

/** Persist one webhook event to file (always) and DB (if available). */
export function recordWebhook(payload) {
  const record = {
    receivedAt: new Date().toISOString(),
    event: payload?.event || deriveEvent(payload),
    videoId: payload?.VideoGuid ?? payload?.videoId ?? null,
    libraryId: payload?.VideoLibraryId ?? payload?.libraryId ?? null,
    status: payload?.Status ?? null,
    statusLabel: STATUS_LABELS[payload?.Status] ?? null,
    payload,
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(record) + "\n", "utf8");

  if (db) {
    db.prepare(
      `INSERT INTO webhooks (received_at, event, video_id, library_id, status, payload)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      record.receivedAt,
      record.event,
      record.videoId,
      record.libraryId,
      record.status,
      JSON.stringify(payload)
    );
  }

  return record;
}

/** Read back the most recent webhook events for the dashboard view. */
export function listWebhooks(limit = 50) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs
    .readFileSync(LOG_FILE, "utf8")
    .split("\n")
    .filter(Boolean);
  return lines
    .slice(-limit)
    .reverse()
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { receivedAt: null, raw: line };
      }
    });
}

function deriveEvent(payload) {
  if (payload?.Status === 4) return "video.encoded";
  if (payload?.Status === 3) return "video.transcoding";
  if (payload?.Status === 5) return "video.error";
  return "video.status";
}

export { STATUS_LABELS };
