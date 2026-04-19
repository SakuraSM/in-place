#!/bin/sh
set -eu

echo "Applying database migrations..."
node packages/db/dist/scripts/migrate.js

echo "Starting API server..."
exec node apps/server/dist/index.js
