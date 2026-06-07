# Evaluation Checklist

## Gameplay

- Board renders clearly on desktop and mobile viewport sizes.
- Tapping a clearable arrow removes it.
- Tapping a blocked arrow does not remove it and updates status.
- Clearing all arrows opens the level clear popup.
- Next level resets the board and increments the level.

## Utility Actions

- Undo restores the previous board.
- Hint highlights a valid removable arrow.
- Skip advances level.
- Timer counts down.
- Time up popup appears when timer reaches zero.

## AdMob Test

- Web preview states that AdMob runs only in Android.
- Android app initializes AdMob test mode.
- Show Banner button calls test banner.
- Interstitial button calls test interstitial.
- Auto interstitial attempts every 10 successful clears.

## Automation

- `window.render_game_to_text()` returns current state JSON.
- `window.advanceTime(ms)` advances deterministic time and redraws.
- Playwright screenshots show the board, HUD, and controls.
- Console has no new runtime errors.

## Android

- `npm run android:build:debug` succeeds.
- APK exists at `android/app/build/outputs/apk/debug/app-debug.apk`.
- App has a launcher activity and icon appears after install.
