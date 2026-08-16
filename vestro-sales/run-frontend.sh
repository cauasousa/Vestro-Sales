#!/usr/bin/env bash
# Runs the Next.js frontend (vestro-sales) in dev mode.
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "Starting Next.js dev server on http://localhost:3000 ..."
npm run dev
