#!/bin/bash

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

# Start Chrome with remote debugging (if not already running)
if ! lsof -i:9224 >/dev/null; then
  nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --remote-debugging-port=9224 \
    --user-data-dir="./chrome-profiles/automation" \
    --no-first-run \
    --no-default-browser-check \
    --disable-popup-blocking > /dev/null 2>&1 &
  # Wait for Chrome to start (up to 30 seconds)
  for i in {1..30}; do
    if lsof -i:9224 >/dev/null; then
      break
    fi
    sleep 1
  done
fi

# Run the scraper with the provided URL and optional quiet flag
node scraper.js "$URL" $QUIET