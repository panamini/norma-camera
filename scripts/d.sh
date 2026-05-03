#!/usr/bin/env bash
set -euo pipefail

# Use this in Terminal 2.
# Starts the installed dev-client build with the Metro URL expected by USB reverse.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if command -v adb >/dev/null 2>&1; then
  ADB=adb
elif [ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]; then
  ADB="$HOME/Library/Android/sdk/platform-tools/adb"
else
  echo "Error: adb not found in PATH or in ~/Library/Android/sdk/platform-tools." >&2
  exit 1
fi

devices=$("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}')

if [ -z "$devices" ]; then
  echo "Error: no Android device found in adb devices." >&2
  "$ADB" devices
  exit 1
fi

DEVICE_SERIAL=$(printf '%s\n' "$devices" | head -n1)
if [ -n "$(printf '%s\n' "$devices" | tail -n +2)" ]; then
  echo "Warning: multiple devices detected. Using first one: $DEVICE_SERIAL" >&2
fi

ADB_OPTS=( "-s" "$DEVICE_SERIAL" )
echo "Using device: $DEVICE_SERIAL"

"$ADB" "${ADB_OPTS[@]}" shell am force-stop com.anonymous.normacamera
"$ADB" "${ADB_OPTS[@]}" shell am start -a android.intent.action.VIEW -d "exp+norma-camera://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
