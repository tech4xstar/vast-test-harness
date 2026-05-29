const requestBtn = document.getElementById("request-btn");
const resetBtn = document.getElementById("reset-btn");
const stage = document.getElementById("player-stage");
const lockedState = document.getElementById("locked-state");
const tokenInfo = document.getElementById("token-info");
const tokenExpiry = document.getElementById("token-expiry");
const embedUrlEl = document.getElementById("embed-url");
const requestStatus = document.getElementById("request-status");
const configBanner = document.getElementById("config-banner");

let countdownTimer = null;

async function init() {
  try {
    const res = await fetch("/config");
    const cfg = await res.json();
    if (!cfg.configured) configBanner.classList.remove("hidden");
  } catch {
    /* ignore */
  }
}

// --- Signed access flow -----------------------------------------------------
async function requestPlayback() {
  requestBtn.disabled = true;
  setStatus("Requesting signed URL from server…", false);

  try {
    const res = await fetch("/play-token");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned ${res.status}`);
    }
    const data = await res.json();
    mountPlayer(data);
  } catch (err) {
    setStatus(err.message, true);
    requestBtn.disabled = false;
  }
}

function mountPlayer(data) {
  const iframe = document.createElement("iframe");
  iframe.src = data.embedUrl;
  iframe.loading = "lazy";
  iframe.allow =
    "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;";
  iframe.allowFullscreen = true;

  lockedState.classList.add("hidden");
  stage.appendChild(iframe);

  embedUrlEl.textContent = data.embedUrl;
  tokenInfo.classList.remove("hidden");
  startCountdown(data.expires);
  setStatus("", false);
}

function startCountdown(expires) {
  clearInterval(countdownTimer);
  const tick = () => {
    const remaining = expires - Math.floor(Date.now() / 1000);
    if (remaining > 0) {
      tokenExpiry.textContent = `valid for ${remaining}s`;
      tokenExpiry.classList.remove("expired");
    } else {
      tokenExpiry.textContent = "token expired — re-request to keep playing";
      tokenExpiry.classList.add("expired");
      clearInterval(countdownTimer);
    }
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function resetPlayer() {
  clearInterval(countdownTimer);
  const iframe = stage.querySelector("iframe");
  if (iframe) iframe.remove();
  lockedState.classList.remove("hidden");
  tokenInfo.classList.add("hidden");
  requestBtn.disabled = false;
  setStatus("", false);
}

function setStatus(msg, isError) {
  requestStatus.textContent = msg;
  requestStatus.classList.toggle("error", Boolean(isError));
}

requestBtn.addEventListener("click", requestPlayback);
resetBtn.addEventListener("click", resetPlayer);

init();
