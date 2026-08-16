#!/usr/bin/env bash
# Runs the FastAPI backend (api-vestro) in dev mode with auto-reload.
set -e
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
    echo "No .venv found. Create one first:"
    echo "  python -m venv .venv"
    echo "  .venv/Scripts/pip install -r requirements.txt"
    exit 1
fi

source .venv/Scripts/activate

echo "Starting FastAPI on http://localhost:8000 ..."
uvicorn app.main:app --reload --port 8000
