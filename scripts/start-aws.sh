#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec npm run start -- --hostname 0.0.0.0 --port "${PORT:-3000}"
