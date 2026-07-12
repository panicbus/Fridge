#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env.build"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
else
  echo "Missing .env.build — create it with APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID."
  exit 1
fi

if [[ -z "${APPLE_ID:-}" || -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" || -z "${APPLE_TEAM_ID:-}" ]]; then
  echo "Notarization credentials incomplete in .env.build."
  echo "Required: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID"
  exit 1
fi

export APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID

echo "Checking notarization credentials with Apple..."
if ! NOTARY_CHECK="$(xcrun notarytool history \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" 2>&1)"; then
  echo "$NOTARY_CHECK"
  echo ""
  echo "Notarization credentials failed before packaging."
  echo "Fix .env.build in the project root, then rerun npm run dist:mac."
  echo ""
  echo "Common fixes:"
  echo "  • Regenerate an app-specific password at https://appleid.apple.com (Sign-In and Security → App-Specific Passwords)"
  echo "  • Use the Apple ID email for the developer account that owns team KB8N3Q3ZAF"
  echo "  • No quotes around values in .env.build (APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-... not \"...\")"
  echo "  • Paste the password exactly — 16 characters, often shown as xxxx-xxxx-xxxx-xxxx"
  exit 1
fi
echo "Notarization credentials OK."

# A mounted Fridge.dmg (title: Fridge) blocks hdiutil from creating a new DMG.
if [[ -d /Volumes/Fridge ]]; then
  echo "Unmounting /Volumes/Fridge (old Fridge.dmg is still mounted)..."
  hdiutil detach "/Volumes/Fridge" -force || {
    echo "Could not unmount /Volumes/Fridge. Eject it in Finder, then rerun npm run dist:mac."
    exit 1
  }
fi

echo "Clearing extended attributes on build assets..."
xattr -cr build/dmg-background.png build/icon.icns build/ 2>/dev/null || true

if [[ ! -d node_modules/electron/dist ]]; then
  echo "node_modules/electron/dist not found — run npm install first."
  exit 1
fi

echo "Clearing extended attributes on node_modules/electron/dist..."
xattr -cr node_modules/electron/dist

TMP_RELEASE="/var/tmp/fridge-app-release"
rm -rf "$TMP_RELEASE"
mkdir -p "$TMP_RELEASE"

echo "Packaging to $TMP_RELEASE (avoids iCloud codesign issues)..."
set +e
npx electron-builder --mac --config.directories.output="$TMP_RELEASE"
BUILD_EXIT=$?
set -e

if [[ $BUILD_EXIT -ne 0 ]]; then
  if [[ -f "$TMP_RELEASE/Fridge.zip" || -d "$TMP_RELEASE/mac-universal/Fridge.app" ]]; then
    echo ""
    echo "electron-builder exited with errors, but some artifacts were produced in $TMP_RELEASE."
    echo "Copying partial output to ./release/ so you can use the .zip or .app while fixing DMG issues."
    mkdir -p release
    rsync -a "$TMP_RELEASE/" release/
    echo "Partial artifacts copied to ./release/"
  fi
  exit "$BUILD_EXIT"
fi

APP_PATH="$TMP_RELEASE/mac-universal/Fridge.app"
if [[ -d "$APP_PATH" ]]; then
  echo "Building Fridge.dmg (custom script — large app needs explicit DMG size)..."
  bash "$ROOT_DIR/scripts/create-dmg.sh" "$APP_PATH" "$TMP_RELEASE"
else
  echo "Warning: $APP_PATH not found; skipping DMG creation."
fi

echo "Copying release artifacts to ./release/..."
mkdir -p release
rsync -a --delete "$TMP_RELEASE/" release/

echo "Done. Signed release artifacts are in ./release/"
