const TRAILER_DIR = "showtime-trailers/";
const SUPPORTED_EXT = [".mp4", ".webm", ".mov"];
const DELAY_BETWEEN = 5000;

const AUTO_KEYWORDS = [
  { keyword: "path", order: 0 },
  { keyword: "imax", order: 1 },
];

function isAutoFile(filename) {
  const lower = filename.toLowerCase();
  return AUTO_KEYWORDS.some((a) => lower.includes(a.keyword));
}

function getAutoOrder(filename) {
  const lower = filename.toLowerCase();
  const match = AUTO_KEYWORDS.find((a) => lower.includes(a.keyword));
  return match ? match.order : 999;
}

const selectionScreen = document.getElementById("selection-screen");
const playbackScreen = document.getElementById("playback-screen");
const nowShowingScreen = document.getElementById("now-showing-screen");

const trailerGrid = document.getElementById("trailer-grid");
const trailerCount = document.getElementById("trailer-count");
const btnStart = document.getElementById("btn-start-showtime");
const btnRestart = document.getElementById("btn-restart");

const video = document.getElementById("showtime-video");
const npTitle = document.getElementById("np-title");
const npProgress = document.getElementById("np-progress");
const nowPlaying = document.getElementById("now-playing");

const MAX_TRAILERS = 4;
let selectedTrailers = [];
let allFiles = [];

let playlist = [];
let currentIndex = 0;
let npTimeout = null;

function prettyName(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function updateCount() {
  trailerCount.textContent = `${selectedTrailers.length} / ${MAX_TRAILERS}`;
  trailerCount.classList.toggle("badge-full", selectedTrailers.length === MAX_TRAILERS);
  validateForm();
}

function validateForm() {
  btnStart.disabled = selectedTrailers.length !== MAX_TRAILERS;
}

function toggleTrailer(file, card) {
  const idx = selectedTrailers.indexOf(file);
  if (idx > -1) {
    selectedTrailers.splice(idx, 1);
    card.classList.remove("selected");
    card.querySelector(".card-number").textContent = "";
  } else {
    if (selectedTrailers.length >= MAX_TRAILERS) return;
    selectedTrailers.push(file);
    card.classList.add("selected");
    card.querySelector(".card-number").textContent = selectedTrailers.length;
  }
  refreshNumbers();
  updateCount();
}

function refreshNumbers() {
  const cards = trailerGrid.querySelectorAll(".trailer-card");
  cards.forEach((card) => {
    const file = card.dataset.file;
    const pos = selectedTrailers.indexOf(file);
    card.querySelector(".card-number").textContent = pos > -1 ? pos + 1 : "";
  });
}

function buildGrid(files) {
  files.forEach((file) => {
    const card = document.createElement("div");
    card.className = "trailer-card";
    card.dataset.file = file;

    const number = document.createElement("span");
    number.className = "card-number";

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = prettyName(file);

    card.appendChild(number);
    card.appendChild(title);
    card.addEventListener("click", () => toggleTrailer(file, card));
    trailerGrid.appendChild(card);
  });
}

function showNowPlaying(title, progress) {
  npTitle.textContent = title;
  npProgress.textContent = progress;
  nowPlaying.classList.add("visible");
  clearTimeout(npTimeout);
  npTimeout = setTimeout(() => nowPlaying.classList.remove("visible"), 4000);
}

function playCurrentIndex() {
  if (currentIndex >= playlist.length) {
    hideBlackout();
    playbackScreen.classList.add("hidden");
    nowShowingScreen.classList.remove("hidden");
    return;
  }

  const file = playlist[currentIndex];
  const isTrailer = currentIndex < selectedTrailers.length;
  const label = isTrailer
    ? `Trailer ${currentIndex + 1} of ${selectedTrailers.length}`
    : "";

  hideBlackout();
  video.src = TRAILER_DIR + file;
  video.play();
  if (isTrailer) showNowPlaying(prettyName(file), label);
}

function showBlackout() {
  document.getElementById("blackout").classList.remove("hidden");
}

function hideBlackout() {
  document.getElementById("blackout").classList.add("hidden");
}

function startShowtime() {
  const autoFiles = allFiles
    .filter((f) => isAutoFile(f))
    .sort((a, b) => getAutoOrder(a) - getAutoOrder(b));
  playlist = [...selectedTrailers, ...autoFiles];
  currentIndex = 0;

  selectionScreen.classList.add("hidden");
  playbackScreen.classList.remove("hidden");

  playCurrentIndex();
}

video.addEventListener("ended", () => {
  currentIndex++;

  if (currentIndex < playlist.length) {
    showBlackout();
    setTimeout(() => playCurrentIndex(), DELAY_BETWEEN);
  } else {
    playCurrentIndex();
  }
});

video.addEventListener("click", () => {
  if (video.paused) video.play();
  else video.pause();
});

btnStart.addEventListener("click", startShowtime);

btnRestart.addEventListener("click", () => {
  nowShowingScreen.classList.add("hidden");
  selectionScreen.classList.remove("hidden");
  selectedTrailers = [];
  trailerGrid.querySelectorAll(".trailer-card").forEach((c) => {
    c.classList.remove("selected");
    c.querySelector(".card-number").textContent = "";
  });
  updateCount();
});

async function loadTrailers() {
  try {
    const res = await fetch(TRAILER_DIR);
    if (!res.ok) throw new Error("Could not list trailers");

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = [...doc.querySelectorAll("a")];
    allFiles = links
      .map((a) => decodeURIComponent(a.getAttribute("href")))
      .filter((href) => SUPPORTED_EXT.some((ext) => href.toLowerCase().endsWith(ext)));

    const selectableFiles = allFiles.filter((f) => !isAutoFile(f));
    if (selectableFiles.length === 0) return;

    buildGrid(selectableFiles);
  } catch (e) {
    console.error("Failed to load trailers:", e);
  }
}

loadTrailers();
