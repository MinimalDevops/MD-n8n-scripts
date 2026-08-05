#!/bin/sh
set -eu

DOCKER_COMPOSE_BIN="${DOCKER_COMPOSE_BIN:-$(command -v docker-compose || true)}"
if [ -z "$DOCKER_COMPOSE_BIN" ] && [ -x /opt/homebrew/bin/docker-compose ]; then
  DOCKER_COMPOSE_BIN="/opt/homebrew/bin/docker-compose"
fi

if [ -z "$DOCKER_COMPOSE_BIN" ]; then
  echo "docker-compose was not found in PATH or /opt/homebrew/bin" >&2
  exit 1
fi

exec "$DOCKER_COMPOSE_BIN" up
