# Android release commands

Use the existing private command for local testing. Use the production command only after the local signing configuration passes its check.

## Quick path

1. For a private APK, run `npm run apk:release`. It keeps the existing debug signing behavior.
2. Before a production build, align the local `credentials.json` keystore path with the selected local production keystore. Keep both files untracked.
3. Check production configuration with `npm run apk:production:check -- 3`.
4. Build only an approved version with `npm run apk:production -- <versionCode>`.

The number `3` above is a configuration-only example. Choose the next production `versionCode` with the team after checking EAS remote versioning and the store state.

## Validated private build

`npm run apk:release` completed successfully at 2026-09-21 07:02:53 +02:00. The resulting debug-signed APK was copied to `C:\Users\erhtu\Downloads\appJorge-audit-2026-09-21.apk` without upload.

| Field | Value |
|---|---|
| Size | 111,757,132 bytes |
| SHA-256 | `28670915E4F7720800747D031535C5CBD94C93113D47F439104465E47AD3212C` |
| Signature check | `apksigner` v2 verified; public subject `CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US` |

This private artifact is not a production build. A smoke check on emulator-5554 (Medium_Phone, Android 17/API 37) verified the APK hash, installed it with `adb install -r` without uninstalling or clearing data, and cold-launched it in 520 ms. Home, Calendar (September 2026), and Annual Summary (2026) rendered and their read-only navigation worked. Log inspection found no `FATAL EXCEPTION`, `AndroidRuntime`, or `ReactNativeJS` errors; the only observed warning was benign `HWUI EGL_SUCCESS`. The installed app was version 0.1.0/code 1. Evidence is under `C:\Users\erhtu\AppData\Local\Temp\appJorge-smoke-20260921`. No production APK or upload occurred.

## What the production command checks

| Check | Result |
|---|---|
| `versionCode` | One positive decimal integer from 1 through 2100000000. |
| Credentials | Local file, required fields, selected keystore readability, and matching keystore path. |
| Release configuration | The final `release` variant uses the production signing config and requested `versionCode`. |
| Signing password | Not proven by the configuration-only check. |

The wrapper never supplies signing secrets on its command line and never falls back to debug signing. It invokes Gradle with a static init-script path and a validated numeric version only.

## Limits before publication

The credentials and keystore are ignored and removed from Git tracking, but their historical exposure has not been assessed. Do not rotate keys or rewrite history without a recovery plan. iOS builds and App Store distribution remain unverified.

The Android maximum `versionCode` is documented by [Android versioning](https://developer.android.com/studio/publish/versioning).
