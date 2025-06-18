#!/bin/bash

# Usage: ./scripts/update-dep.sh <package-name> <version>
# Example: ./scripts/update-dep.sh next 15.4.0-canary.85

PACKAGE=$1
VERSION=$2

if [ -z "$PACKAGE" ] || [ -z "$VERSION" ]; then
    echo "Usage: $0 <package-name> <version>"
    echo "Example: $0 next 15.4.0-canary.85"
    exit 1
fi

echo "Updating $PACKAGE to $VERSION across all package.json files..."

# Find all package.json files and update the dependency
find . -name "package.json" -not -path "./node_modules/*" -not -path "./.git/*" | while read -r file; do
    if grep -q "\"$PACKAGE\":" "$file"; then
        echo "Updating $file"
        # Use sed to update the version (works on macOS and Linux)
        sed -i '' "s/\"$PACKAGE\": \"[^\"]*\"/\"$PACKAGE\": \"$VERSION\"/g" "$file" 2>/dev/null || \
        sed -i "s/\"$PACKAGE\": \"[^\"]*\"/\"$PACKAGE\": \"$VERSION\"/g" "$file"
    fi
done

echo "Running syncpack to ensure consistency..."
bun run deps:fix

echo "Done! Don't forget to run 'bun install' to update your lock file." 