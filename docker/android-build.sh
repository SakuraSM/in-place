#!/usr/bin/env bash
set -euo pipefail

cd /workspace

npm install --workspace @inplace/mobile --legacy-peer-deps

npx expo prebuild --platform android

cd apps/mobile/android
./gradlew app:assembleDebug --stacktrace
