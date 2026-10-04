#!/usr/bin/env bash
# try.sh — one-command trial of render.md.
#
# Launches Brave with an isolated throwaway profile, loads this extension,
# and opens a demo Markdown page served over loopback (so no file-access
# toggle is needed for the demo). Your real Brave profile is untouched.
#
# Usage: bash scripts/try.sh
#
# For a permanent install: use the Chrome Web Store listing (STORE_LISTING.md),
# or brave://extensions -> Developer mode -> Load unpacked -> this folder.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAMPLE="$ROOT/tmp/sample.md"
test -f "$SAMPLE" || { echo "error: missing tmp/sample.md"; exit 1; }

find_browser() {
  case "$(uname -s)" in
    Darwin)
      for c in "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
               "$HOME/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"; do
        test -x "$c" && { printf '%s' "$c"; return 0; }
      done ;;
    Linux)
      for c in brave-browser brave brave-browser-stable google-chrome chromium; do
        command -v "$c" >/dev/null 2>&1 && { printf '%s' "$c"; return 0; }
      done ;;
    *) echo "error: unsupported OS $(uname -s)" >&2; return 1 ;;
  esac
  return 1
}
BRAVE="$(find_browser)" || { echo "error: Brave/Chromium binary not found"; exit 1; }

PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"

# Serve .md as text/plain so the browser displays (not downloads) it.
python3 -c "
import os, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
os.chdir(sys.argv[1])
class H(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.md': 'text/plain; charset=utf-8'}
    def log_message(self, *a):
        pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), H).serve_forever()
" "$ROOT" "$PORT" &
SERVER=$!

PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/renderdotmd-profile.XXXXXX")"
cleanup() {
  kill "$SERVER" 2>/dev/null || true
  rm -rf "$PROFILE"
}
trap cleanup EXIT

echo "demo: http://127.0.0.1:$PORT/tmp/sample.md (throwaway profile, closes with the window)"
"$BRAVE" --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check \
  --load-extension="$ROOT" "http://127.0.0.1:$PORT/tmp/sample.md" >/dev/null 2>&1
