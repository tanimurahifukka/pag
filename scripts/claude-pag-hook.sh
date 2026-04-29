#!/bin/bash
# Claude Code hook script — POSTs the event JSON from stdin to pag dev server
set -euo pipefail
PAG_URL="${PAG_URL:-http://localhost:5173/__pag/event}"
input="$(cat)"
# Add hook_event_name from env if not in payload (some hook types pass it via $1)
if [[ -n "${1:-}" ]]; then
  payload=$(printf '%s' "$input" | jq -c --arg name "$1" '. + {hook_event_name: $name}' 2>/dev/null || printf '%s' "$input")
else
  payload="$input"
fi
curl -s -X POST -H 'Content-Type: application/json' -d "$payload" "$PAG_URL" >/dev/null 2>&1 || true
