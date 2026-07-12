#!/usr/bin/env bash
# Build Fridge.dmg from a signed .app. electron-builder's default hdiutil create
# under-allocates space for our large universal bundle (~650MB+ with recipe images).
set -euo pipefail

APP_PATH="${1:?Usage: create-dmg.sh <path/to/Fridge.app> <output-dir>}"
OUT_DIR="${2:?Usage: create-dmg.sh <path/to/Fridge.app> <output-dir>}"

VOL_NAME="Fridge"
DMG_PATH="$OUT_DIR/Fridge.dmg"
TEMP_DMG="$(mktemp /var/tmp/fridge-dmg-XXXXXX.dmg)"

cleanup() {
  if [[ -n "${MOUNT_DIR:-}" && -d "$MOUNT_DIR" ]]; then
    hdiutil detach "$MOUNT_DIR" -force 2>/dev/null || true
  fi
  rm -f "$TEMP_DMG"
}
trap cleanup EXIT

if [[ -d "/Volumes/$VOL_NAME" ]]; then
  echo "Unmounting /Volumes/$VOL_NAME..."
  hdiutil detach "/Volumes/$VOL_NAME" -force
fi

APP_SIZE_KB="$(du -sk "$APP_PATH" | awk '{print $1}')"
DMG_SIZE_MB="$(( APP_SIZE_KB / 1024 + 600 ))"
if [[ "$DMG_SIZE_MB" -lt 1500 ]]; then
  DMG_SIZE_MB=1500
fi

echo "Creating DMG (${DMG_SIZE_MB}MB volume for $(du -sh "$APP_PATH" | cut -f1) app)..."
rm -f "$DMG_PATH" "$TEMP_DMG"

# hdiutil occasionally reports "Resource busy" right after heavy disk I/O
# (e.g. the preceding zip write) while diskarbitrationd settles. Retry a few times.
CREATE_ATTEMPTS=5
for attempt in $(seq 1 "$CREATE_ATTEMPTS"); do
  rm -f "$TEMP_DMG"
  if hdiutil create \
    -size "${DMG_SIZE_MB}m" \
    -srcfolder "$APP_PATH" \
    -volname "$VOL_NAME" \
    -fs APFS \
    -format UDRW \
    -anyowners -nospotlight \
    "$TEMP_DMG"; then
    break
  fi
  if [[ "$attempt" -eq "$CREATE_ATTEMPTS" ]]; then
    echo "hdiutil create failed after $CREATE_ATTEMPTS attempts."
    exit 1
  fi
  echo "hdiutil create failed (attempt $attempt/$CREATE_ATTEMPTS) — retrying in 5s..."
  sleep 5
done

MOUNT_DIR="$(hdiutil attach -readwrite -noverify -noautoopen "$TEMP_DMG" | awk '/\/Volumes\/'"$VOL_NAME"'/ {print $3; exit}')"
if [[ -z "$MOUNT_DIR" || ! -d "$MOUNT_DIR" ]]; then
  echo "Failed to mount temporary DMG at /Volumes/$VOL_NAME"
  exit 1
fi

ln -sf /Applications "$MOUNT_DIR/Applications"

hdiutil detach "$MOUNT_DIR" -force
MOUNT_DIR=""

echo "Compressing DMG..."
hdiutil convert "$TEMP_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_PATH"
rm -f "$TEMP_DMG"
trap - EXIT

echo "DMG ready: $DMG_PATH ($(du -sh "$DMG_PATH" | cut -f1))"
