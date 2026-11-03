#!/usr/bin/env bash
# Safe watchkit helper runner. setup only describes a local, loopback-only manual configuration.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WK="$ROOT/server/watchkit"
CONFIG="${WATCHKIT_CONFIG:-$WK/config.json}"
case "${1:-}" in
  setup|--dry-run)
    printf '%s\n' 'DRY RUN: no config creation, dependency downloads, model downloads, or service start.'
    printf '%s\n' 'Copy config.example.json manually, use host 127.0.0.1, and generate token with openssl rand -hex 32.'
    ;;
  run)
    [ -f "$CONFIG" ] || { printf 'missing %s\n' "$CONFIG" >&2; exit 2; }
    exec node "$WK/watchkit.mjs"
    ;;
  start|stop|status|logs)
    printf '%s\n' 'service management disabled in the test-only hardened pilot; run manually in foreground.' >&2
    exit 2
    ;;
  *) printf '%s\n' 'usage: watchkit.sh setup|--dry-run|run' >&2; exit 2 ;;
esac
