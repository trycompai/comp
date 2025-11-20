#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIRS=(
  "$ROOT_DIR/src"
)

echo "Cleaning generated .js, .js.map, and .d.ts files in apps/api"

for dir in "${TARGET_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    echo "Processing $dir"
    find "$dir" \( -name '*.js' -o -name '*.js.map' -o -name '*.d.ts' \) -type f -print -delete
  fi
done

echo "Done."

