#!/bin/bash

set -euo pipefail

# Usage: ./run_medium_scraper-local.sh <URL> [--quiet|-q]

if [ -z "$1" ]; then
  echo "Usage: $0 <URL> [--quiet|-q]"
  exit 1
fi

URL="$1"
QUIET=""
if [[ "$2" == "--quiet" || "$2" == "-q" ]]; then
  QUIET="$2"
fi

CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEBUG_HOST="127.0.0.1"
DEBUG_PORT="9223"
PROFILE_DIR="${CHROME_PROFILE_DIR:-$HOME/Documents/central-chrome-profile}"

if [ ! -x "$CHROME_BIN" ]; then
  echo "Error: Chrome binary not found at: $CHROME_BIN" >&2
  exit 1
fi

# Start Chrome with remote debugging (if not already running/responding)
if ! curl -fsS "http://${DEBUG_HOST}:${DEBUG_PORT}/json/version" >/dev/null 2>&1; then
  nohup "$CHROME_BIN" \
    --remote-debugging-address="$DEBUG_HOST" \
    --remote-debugging-port="$DEBUG_PORT" \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run \
    --no-default-browser-check \
    --disable-popup-blocking >/dev/null 2>&1 &
fi

# Wait for Chrome DevTools endpoint to be ready (up to 30 seconds)
for i in {1..30}; do
  if curl -fsS "http://${DEBUG_HOST}:${DEBUG_PORT}/json/version" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://${DEBUG_HOST}:${DEBUG_PORT}/json/version" >/dev/null 2>&1; then
  echo "Error: Chrome debug endpoint is not reachable at http://${DEBUG_HOST}:${DEBUG_PORT}/json/version" >&2
  echo "Close all Chrome instances using this profile and retry." >&2
  exit 1
fi

# Run the scraper with the provided URL and optional quiet flag
node scraper.js "$URL" $QUIET
