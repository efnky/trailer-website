const TRAILER_DIR = "trailers/";
const SUPPORTED_EXT = [".mp4", ".webm", ".mov"];
const STEP_SECONDS = 30;

const bgVideo = document.getElementById("bg-video");
bgVideo.loop = false;
const picker = document.getElementById("trailer-picker");
const hint = document.getElementById("controls-hint");
const emptyState = document.getElementById("empty-state");
const countdown = document.getElementById("countdown");

const cdHours = document.getElementById("cd-hours");
const cdMinutes = document.getElementById("cd-minutes");
const cdSeconds = document.getElementById("cd-seconds");
const btnUp = document.getElementById("cd-up");
const btnDown = document.getElementById("cd-down");
const btnStart = document.getElementById("cd-start");
const btnReset = document.getElementById("cd-reset");

let totalSeconds = 0;
let remaining = 0;
let timerInterval = null;
let running = false;

function pad(n) {
  return String(n).padStart(2, "0");
}

function renderTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  cdHours.textContent = pad(h);
  cdMinutes.textContent = pad(m);
  cdSeconds.textContent = pad(s);
}

function addTime(delta) {
  if (running) return;
  totalSeconds = Math.max(0, totalSeconds + delta);
  remaining = totalSeconds;
  renderTime(remaining);
}

function startPause() {
  if (running) {
    clearInterval(timerInterval);
    running = false;
    btnStart.textContent = "▶";
    return;
  }

  if (remaining <= 0) return;
  running = true;
  btnStart.textContent = "⏸";
  countdown.classList.remove("flash");

  timerInterval = setInterval(() => {
    remaining--;
    renderTime(remaining);

    if (remaining <= 0) {
      clearInterval(timerInterval);
      running = false;
      btnStart.textContent = "▶";
      countdown.classList.add("flash");
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  running = false;
  remaining = totalSeconds;
  btnStart.textContent = "▶";
  countdown.classList.remove("flash");
  renderTime(remaining);
}

btnUp.addEventListener("click", () => addTime(STEP_SECONDS));
btnDown.addEventListener("click", () => addTime(-STEP_SECONDS));
btnStart.addEventListener("click", startPause);
btnReset.addEventListener("click", resetTimer);

function prettyName(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function playTrailer(src) {
  bgVideo.src = src;
  bgVideo.muted = false;
  bgVideo.play();
  hint.classList.add("hidden");
}

document.body.addEventListener("click", (e) => {
  if (e.target.closest(".countdown") || e.target.closest(".top-bar")) return;
  if (bgVideo.muted && bgVideo.src) {
    bgVideo.muted = false;
    hint.classList.add("hidden");
  }
});

picker.addEventListener("change", () => {
  if (!picker.value) return;
  playTrailer(picker.value);
});

bgVideo.addEventListener("ended", () => {
  const options = [...picker.options].filter((o) => o.value);
  if (options.length === 0) return;
  const idx = options.findIndex((o) => o.value === picker.value);
  const next = options[(idx + 1) % options.length];
  picker.value = next.value;
  playTrailer(next.value);
});

async function loadTrailers() {
  try {
    const res = await fetch(TRAILER_DIR);
    if (!res.ok) throw new Error("Could not list trailers directory");

    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const links = [...doc.querySelectorAll("a")];
    const files = links
      .map((a) => decodeURIComponent(a.getAttribute("href")))
      .filter((href) => SUPPORTED_EXT.some((ext) => href.toLowerCase().endsWith(ext)));

    if (files.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }

    files.forEach((file) => {
      const opt = document.createElement("option");
      opt.value = TRAILER_DIR + file;
      opt.textContent = prettyName(file);
      picker.appendChild(opt);
    });

    const firstSrc = TRAILER_DIR + files[0];
    bgVideo.src = firstSrc;
    bgVideo.muted = true;
    bgVideo.play();
    picker.value = firstSrc;
  } catch {
    emptyState.classList.remove("hidden");
  }
}

renderTime(0);
loadTrailers();
