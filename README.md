# Movie Night - Global'INSA

A simple "home cinema" web app for movie nights. It plays a fullscreen background
trailer reel with a built-in countdown timer, plus a dedicated **Showtime** page
that runs a curated pre-show sequence just like a real theater.

## Features

- **Homepage** (`index.html`) - fullscreen trailer player with a dropdown to switch
  trailers and an adjustable countdown timer overlay.
- **Showtime page** (`showtime.html`) - pick 4 trailers, then the app automatically
  plays them in sequence, followed by the Pathé "Bonne Séance" intro and the IMAX
  countdown, with a 5-second cinema-style blackout between each video. It ends on a
  "Now Showing: Project Hail Mary" title card.

## Project layout

```
.
├── index.html          # Homepage
├── showtime.html       # Showtime / pre-show page
├── app.js              # Homepage logic
├── showtime.js         # Showtime playlist + playback logic
├── style.css           # Shared styles
├── server.py           # HTTP server with video range-request support
├── download.sh         # Helper to download trailers from YouTube (up to 4K)
├── Dockerfile
├── .dockerignore
├── trailers/           # Videos for the homepage (you provide these)
└── showtime-trailers/  # Videos for the showtime page (you provide these)
```

The two video folders are intentionally **separate**: the homepage reads from
`trailers/` and the showtime page reads from `showtime-trailers/`.

In the showtime folder, any file whose name contains **"path"** is treated as the
Pathé intro and any file containing **"imax"** is treated as the IMAX countdown.
These are hidden from the selection grid and appended automatically to the playlist.

## Downloading trailers

`download.sh` uses `yt-dlp` + `ffmpeg` (auto-installed via Homebrew) to grab the
best quality up to 4K (2160p):

```bash
./download.sh "https://www.youtube.com/watch?v=VIDEO_ID"
```

You can pass multiple URLs at once. Files are saved to `trailers/`; move whichever
ones you want into `showtime-trailers/` for the pre-show.

## Running locally (without Docker)

```bash
python3 server.py
```

Then open http://localhost:8080.

## Running with Docker

The image ships with **no videos** - it's just the app. You mount your own video
folders at runtime.

### Build

```bash
docker build -t trailer-website .
```

### Run

```bash
docker run -p 8080:8080 \
  -v ./trailers:/app/trailers \
  -v ./showtime-trailers:/app/showtime-trailers \
  trailer-website
```

Then open http://localhost:8080.

> Run this from the project directory so `./trailers` and `./showtime-trailers`
> resolve correctly.

### Troubleshooting: `OSError: [Errno 35] Resource deadlock avoided`

On macOS, Docker Desktop's **VirtioFS** file-sharing layer can intermittently fail
when streaming large video files from a mounted volume, producing this error and a
"network connection was lost" message in the browser.

The server already retries these transient read failures, but the reliable fix is to
switch Docker Desktop's file-sharing implementation:

1. **Docker Desktop → Settings → Resources → File sharing** (or **General**,
   depending on version)
2. Find **"Choose file sharing implementation for your containers"**
3. Switch from **VirtioFS** to **gRPC FUSE** (or vice versa)
4. **Apply & Restart**, then re-run the container
