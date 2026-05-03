#!/usr/bin/env bash
set -euo pipefail

# Use this in Terminal 1.
# 1) stop old Metro on 8081
# 2) clean/reconfigure adb reverse to phone
# 3) start Expo dev server for local USB dev-client

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if command -v adb >/dev/null 2>&1; then
  ADB=adb
elif [ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]; then
  ADB="$HOME/Library/Android/sdk/platform-tools/adb"
else
  echo "Error: adb not found in PATH or in ~/Library/Android/sdk/platform-tools." >&2
  echo "Install/configure Android SDK platform-tools before continuing." >&2
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

kill -9 $(lsof -ti tcp:8081) 2>/dev/null || true

"$ADB" "${ADB_OPTS[@]}" devices
"$ADB" "${ADB_OPTS[@]}" reverse --remove-all || true
"$ADB" "${ADB_OPTS[@]}" reverse tcp:8081 tcp:8081
"$ADB" "${ADB_OPTS[@]}" reverse --list

npx expo start --dev-client --host localhost -c
