#!/usr/bin/env bash
set -euo pipefail

health_url="${HIDDENTIFY_HEALTH_URL:-https://staging.hiddentify.space/api/health}"
health="$(curl --fail --silent --show-error --max-time 10 "$health_url")"
disk_used="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
memory_available_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
load_1m="$(awk '{print $1}' /proc/loadavg)"

logger -t hiddentify-health -- "health=$health disk_used_percent=$disk_used memory_available_kb=$memory_available_kb load_1m=$load_1m"

if (( disk_used >= 85 )); then
  logger -p user.warning -t hiddentify-health -- "disk threshold exceeded: ${disk_used}%"
  exit 1
fi
