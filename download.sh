#!/bin/bash

TRAILERS_DIR="$(cd "$(dirname "$0")" && pwd)/trailers"
mkdir -p "$TRAILERS_DIR"

if ! command -v yt-dlp &>/dev/null || ! command -v ffmpeg &>/dev/null; then
  echo "Installing yt-dlp and ffmpeg via Homebrew..."
  brew install yt-dlp ffmpeg
fi

if [ -z "$1" ]; then
  echo "Usage: ./download.sh <youtube-url> [youtube-url2] ..."
  exit 1
fi

for url in "$@"; do
  echo ""
  echo "Downloading: $url"
  yt-dlp \
    -f "bestvideo[height<=2160]+bestaudio" \
    --merge-output-format mp4 \
    -o "$TRAILERS_DIR/%(title)s.%(ext)s" \
    "$url"
done

echo ""
echo "Done! Your trailers are in: $TRAILERS_DIR"
