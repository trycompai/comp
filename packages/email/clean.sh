#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIRS=(
  "$ROOT_DIR/components"
  "$ROOT_DIR/emails"
)

echo "Cleaning generated .d.ts and .jsx files in packages/email"

for dir in "${TARGET_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    echo "Processing $dir"
    find "$dir" \( -name '*.d.ts' -o -name '*.jsx' \) -type f -print -delete
  fi
done

echo "Done."

