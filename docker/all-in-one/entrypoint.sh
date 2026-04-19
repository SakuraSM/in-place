#!/bin/sh
set -eu

export POSTGRES_DB="${POSTGRES_DB:-inplace}"
export POSTGRES_USER="${POSTGRES_USER:-inplace}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

export DATABASE_URL="${DATABASE_URL:-postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}}"
export PORT="${PORT:-4000}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:8080,http://127.0.0.1:8080}"

mkdir -p /app/storage/uploads /var/lib/postgresql/data
chown -R postgres:postgres /var/lib/postgresql /app/storage/uploads

cleanup() {
  for pid in "${nginx_pid:-}" "${server_pid:-}" "${postgres_pid:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait || true
}

trap cleanup INT TERM EXIT

echo "Starting bundled PostgreSQL..."
/usr/local/bin/docker-entrypoint.sh postgres &
postgres_pid=$!

ready=0
for _ in $(seq 1 60); do
  if pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "PostgreSQL did not become ready in time" >&2
  exit 1
fi

echo "Applying database migrations..."
node packages/db/dist/scripts/migrate.js

echo "Starting API server..."
node apps/server/dist/index.js &
server_pid=$!

echo "Starting Nginx..."
nginx -g 'daemon off;' &
nginx_pid=$!

while :; do
  for process in "postgres:$postgres_pid" "server:$server_pid" "nginx:$nginx_pid"; do
    name=${process%%:*}
    pid=${process##*:}
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$name exited unexpectedly" >&2
      exit 1
    fi
  done
  sleep 2
done
