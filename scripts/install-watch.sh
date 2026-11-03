#!/usr/bin/env bash
# Device installation is disabled in this hardened test-only fork.
set -euo pipefail
if [ "${1:-}" = "--dry-run" ]; then
  printf '%s\n' 'DRY RUN: no build, adb connection, or device installation.'
  exit 0
fi
printf '%s\n' 'install-watch.sh disabled in this test-only fork; follow the parent project safe manual setup documentation.' >&2
exit 2
