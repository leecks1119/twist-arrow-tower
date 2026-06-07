# Arrow Escape Web AdMob Test Setup

This is a fresh Capacitor + React test app for quickly checking Android AdMob behavior.

## Current Test IDs

The project intentionally uses Google demo ad units for safe development testing.

- Android app ID: `ca-app-pub-3940256099942544~3347511713`
- Banner ad unit: `ca-app-pub-3940256099942544/6300978111`
- Interstitial ad unit: `ca-app-pub-3940256099942544/1033173712`

Replace these before publishing.

## Important Files

- Web app: `src/App.tsx`
- AdMob wrapper: `src/admob.ts`
- Capacitor config: `capacitor.config.ts`
- Android AdMob app ID: `android/app/src/main/res/values/strings.xml`
- Android manifest metadata: `android/app/src/main/AndroidManifest.xml`

## Build

```bash
npm run android:build:debug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Install On Connected Android Device

Enable USB debugging on the phone, connect it, then run:

```bash
npm run android:install:debug
```

If no device appears, check:

```bash
adb devices
```

## Real AdMob Swap

When you create the real AdMob app and units:

1. Replace `admob_app_id` in `android/app/src/main/res/values/strings.xml`.
2. Replace `ADMOB_TEST_IDS.banner` and `ADMOB_TEST_IDS.interstitial` in `src/admob.ts`.
3. Change `isTesting: true` to `false` in `src/admob.ts`.
4. Keep using test ads or configured test devices until release verification is done.
