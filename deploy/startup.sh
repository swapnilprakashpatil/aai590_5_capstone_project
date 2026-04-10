#!/bin/bash
set -e

VENV="/home/site/wwwroot/antenv"
REQ="/home/site/wwwroot/requirements.txt"
STAMP="$VENV/.installed"

# Create venv + pip install only when requirements change
REQ_HASH=$(md5sum "$REQ" | cut -d' ' -f1)
if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$REQ_HASH" ]; then
    echo "=== Installing Python packages ==="
    python3 -m venv "$VENV"
    source "$VENV/bin/activate"
    pip install --upgrade pip --quiet
    pip install -r "$REQ" --quiet
    echo "$REQ_HASH" > "$STAMP"
    echo "=== Packages installed ==="
else
    echo "=== Packages already installed (cache hit) ==="
    source "$VENV/bin/activate"
fi

cd /home/site/wwwroot
exec python3 -m gunicorn backend.main:app -c gunicorn.conf.py
