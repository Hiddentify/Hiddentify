#!/usr/bin/env bash
set -euo pipefail

PACKAGE=space.hiddentify.app
APK=android/app/build/outputs/apk/debug/app-debug.apk
adb install -r "$APK"
adb logcat -c
adb shell am start -W -n "$PACKAGE/.LauncherActivity"
sleep 25
adb logcat -d -v brief > /tmp/hiddentify-smoke.log
if ! adb shell pidof "$PACKAGE" >/dev/null; then
  tail -n 100 /tmp/hiddentify-smoke.log
  echo "Hiddentify process exited after launch" >&2
  exit 1
fi
if grep -A 16 -E 'FATAL EXCEPTION|WebView startup failed|WebView renderer gone' /tmp/hiddentify-smoke.log | grep -E 'space.hiddentify.app|HiddentifyAndroid' ; then
  echo "Android startup failure in emulator" >&2
  exit 1
fi
grep 'HiddentifyAndroid.*Page finished on hiddentify.space' /tmp/hiddentify-smoke.log || {
  grep 'HiddentifyAndroid' /tmp/hiddentify-smoke.log || true
  echo "The homepage did not finish loading in the emulator" >&2
  exit 1
}
echo "Android emulator launch and homepage load passed"
