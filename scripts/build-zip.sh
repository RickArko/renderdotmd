#!/usr/bin/env bash
# build-zip.sh — produce the Chrome Web Store upload zip reproducibly.
# Usage: bash scripts/build-zip.sh
# Output: dist/renderdotmd-<version>.zip (contains manifest.json at root)
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
mkdir -p dist

# Pre-flight: manifest parses, scripts syntax-check, icons present.
python3 -c "import json; json.load(open('manifest.json')); print('manifest OK')"
node --check src/markdown.js && node --check src/content.js && node --check src/popup.js
for s in 16 32 48 128; do
  test -f "icons/icon${s}.png" || { echo "missing icons/icon${s}.png"; exit 1; }
done

ZIP="dist/renderdotmd-${VERSION}.zip"
rm -f "$ZIP"
zip -r -X "$ZIP" manifest.json README.md LICENSE PRIVACY.md icons src \
  -x '*/.DS_Store' >/dev/null
unzip -l "$ZIP" | head -20
echo "built $ZIP"
