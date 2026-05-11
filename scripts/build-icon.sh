#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Generate PNG from SVG (requires sharp-cli or rsvg-convert)
if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w 1024 -h 1024 build/icon-source.svg -o build/icon.png
else
  npx --yes sharp-cli -i build/icon-source.svg -o build/icon.png resize 1024 1024
fi

# Build iconset
mkdir -p build/icon.iconset
sips -z 16 16     build/icon.png --out build/icon.iconset/icon_16x16.png >/dev/null
sips -z 32 32     build/icon.png --out build/icon.iconset/icon_16x16@2x.png >/dev/null
sips -z 32 32     build/icon.png --out build/icon.iconset/icon_32x32.png >/dev/null
sips -z 64 64     build/icon.png --out build/icon.iconset/icon_32x32@2x.png >/dev/null
sips -z 128 128   build/icon.png --out build/icon.iconset/icon_128x128.png >/dev/null
sips -z 256 256   build/icon.png --out build/icon.iconset/icon_128x128@2x.png >/dev/null
sips -z 256 256   build/icon.png --out build/icon.iconset/icon_256x256.png >/dev/null
sips -z 512 512   build/icon.png --out build/icon.iconset/icon_256x256@2x.png >/dev/null
sips -z 512 512   build/icon.png --out build/icon.iconset/icon_512x512.png >/dev/null
cp build/icon.png build/icon.iconset/icon_512x512@2x.png

iconutil -c icns build/icon.iconset -o build/icon.icns
rm -rf build/icon.iconset

echo "✓ build/icon.png and build/icon.icns generated"
