#!/usr/bin/env bash
set -euo pipefail
exec node "$(dirname "$0")/release-finalize-stable.mjs" "$@"
