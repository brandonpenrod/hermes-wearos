#!/usr/bin/env bash
# Legacy setup is intentionally fail-closed. Use reviewed manual steps from the parent project docs.
set -euo pipefail
case "${1:-}" in
  --dry-run)
    printf '%s\n' 'DRY RUN: no build, device install, token discovery, profile writes, or device settings changes.'
    printf '%s\n' 'Manual setup only: configure a loopback watchkit with an explicit random bearer; provision app settings manually.'
    exit 0
    ;;
  -h|--help)
    printf '%s\n' 'setup.sh is disabled: automatic provisioning is unsafe. --dry-run prints the no-op plan.'
    exit 0
    ;;
  *)
    printf '%s\n' 'setup.sh disabled (fail closed); use --dry-run or follow the safe manual setup documentation.' >&2
    exit 2
    ;;
esac
