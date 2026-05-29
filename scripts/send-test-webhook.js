// Simulate a Bunny Stream webhook locally so you can demo the webhook log
// without waiting for a real encode. Usage:
//   node scripts/send-test-webhook.js [status]
// status: 3=Transcoding, 4=Finished/encoded (default), 5=Error
const status = Number(process.argv[2] || 4);
const port = process.env.PORT || 3000;

const payload = {
  VideoLibraryId: Number(process.env.BUNNY_LIBRARY_ID || 759),
  VideoGuid:
    process.env.BUNNY_VIDEO_ID,
  Status: status,
};

const base = `https://vast-test-harness-seven.vercel.app`;
const res = await fetch(`${base}/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

console.log(`POST /webhook -> ${res.status}`, await res.json());
console.log("Sent:", payload);
