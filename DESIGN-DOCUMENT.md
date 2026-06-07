# Twist Arrow Tower - Game Design Document

## One-Line Pitch

Rotate a colorful 3D arrow tower, find the open escape path, and launch every block before the tower runs out of time or stability.

## Design Thesis

This game should not feel like a 2D puzzle wearing a 3D skin. Rotation is the main mechanic. The player succeeds by turning the tower, reading hidden faces, predicting escape paths, and choosing the safest removal order.

The player fantasy is simple:

> "I am holding a toy-like puzzle tower in my hand, twisting it until I spot the perfect block to release."

## Target Player

- Casual puzzle players who like short levels, satisfying removal chains, and clear goals.
- Mobile-first users playing one-handed in short sessions.
- Puzzle-motivated "thinker" players who enjoy spatial reasoning, but do not want heavy rules or long tutorials.

## Design Principles

1. One primary action beats many systems.
   - The core verbs are rotate and tap.
   - Every added feature must strengthen rotate-and-release.

2. Teach by doing.
   - No long tutorial panels.
   - Level 1 starts with one obvious block and a ghost swipe.
   - Every new mechanic appears first in a safe level.

3. Rotation must reveal value.
   - The best move should often be hidden from the starting angle.
   - Rotating should expose new arrows, gaps, blocked paths, and combo chances.

4. Feedback must be instant.
   - Valid tap: block launches, sound pop, trail, coin sparkle.
   - Invalid tap: path flashes red, blocker pulses, small stability shake.
   - Hint: tower rotates toward a valid move and previews the path.

5. Short levels, strong finish.
   - Target level length: 45-90 seconds.
   - Every level ends with a visible cleared tower moment before the reward popup.

6. Monetization must not interrupt thinking.
   - Interstitial ads only at level breaks.
   - Rewarded ads only when the player chooses a reward.
   - Never show an ad after a failed tap or during active puzzle reading.

## Core Loop

1. Tower appears with several visible arrow blocks.
2. Player swipes to rotate the tower.
3. Player taps or holds a block.
4. The game previews or evaluates the block's escape path.
5. If clear, the block launches out and creates a new gap.
6. If blocked, the blocker and path are shown clearly.
7. Player chains removals, manages stability, and clears the tower.
8. Reward popup appears, then the next level starts.

## Core Mechanic

The tower is built from stacked layers. Each layer has four faces: front, right, back, left. Each face has slots that may contain arrow blocks.

Each arrow block has one escape direction:

- Out: flies directly away from its current face.
- Left: slides around the layer toward the left face.
- Right: slides around the layer toward the right face.
- Up: exits vertically if the column above is open.
- Down: exits vertically if the column below is open.

A block can launch only if every slot on its escape path is empty. This keeps the original Arrow Escape clarity while making 3D rotation meaningful.

## Camera And Controls

The game is portrait-first and one-thumb friendly.

- Swipe left/right anywhere on the tower: rotate 90 degrees with soft easing.
- Tap visible block: attempt launch.
- Hold visible block: preview path.
- Double tap tower: snap to nearest face.
- Undo, Hint, Skip: bottom thumb zone.
- Back/Escape: close popup, then pause, then exit intent.

The player should never need a virtual joystick, tiny buttons, or two-handed precision.

## Level Design

### World 1: Learn The Toy

- Levels 1-5.
- Only Out arrows.
- No timer fail.
- No stability fail.
- Goal: rotate once, tap obvious blocks, understand the tower.

### World 2: Path Reading

- Levels 6-15.
- Add Left and Right arrows.
- Introduce blocked path preview.
- Start scoring fewer mistakes.

### World 3: Vertical Thinking

- Levels 16-30.
- Add Up and Down arrows.
- Add simple dependency chains.
- Hint teaches vertical path logic.

### World 4: Pressure

- Levels 31+.
- Add timer, stability loss, locked blocks, and combo goals.
- Keep individual levels short.

## Difficulty Curve

Difficulty should increase through readable puzzle complexity, not by making controls harder.

- More faces involved.
- More dependency chains.
- Fewer immediately valid blocks.
- Slightly tighter timer.
- More stability risk from wrong taps.
- Optional challenge objectives: clear with 3 or fewer mistakes, clear under 60 seconds, clear with a 5x combo.

## Reward And Retention

Reward should reinforce mastery, not random gambling.

- Coins for level clear.
- Bonus coins for no mistakes, low rotations, and combo streaks.
- Stars from performance: time, mistakes, rotation efficiency.
- Daily puzzle: one handcrafted tower per day.
- Streak chest: complete levels on consecutive days.
- Cosmetic tower skins: wood, candy, glass, neon, toy blocks.

## UX/UI Direction

The screen hierarchy:

1. Tower.
2. Valid path feedback.
3. Timer and stability.
4. Bottom actions.
5. Coins and meta.

Persistent UI should be small. The tower must occupy the visual center.

Top HUD:

- Level number.
- Timer.
- Stability.
- Coins.

Bottom HUD:

- Undo.
- Hint.
- Skip.

Momentary UI:

- Green path preview for valid launch.
- Red path preview for blocked launch.
- Floating combo text near the launched block.
- Clear popup after the tower has visibly emptied.

## Monetization Plan

- Banner ads: only if they do not cover the bottom controls. Prefer hide during gameplay if layout suffers.
- Interstitial ads: every 10 completed levels, shown before the Next Level button or at a clear transition.
- Rewarded ads:
  - Double clear reward.
  - Add time after time-out.
  - Free hint when stuck.
- Remove Ads IAP:
  - Removes banners and interstitials.
  - Rewarded ads remain optional only for bonus rewards.

## MVP Scope

The next prototype should prove only these things:

1. A 4-face tower can be rotated with a swipe.
2. Only the visible/front-facing blocks are tappable.
3. Blocks have path previews.
4. A valid block launches out with satisfying animation.
5. Removing one block can unlock a move on another face.
6. The first five levels teach the game without text-heavy instructions.

## Technical Direction

- React + TypeScript + Vite.
- React Three Fiber for tower rendering.
- DOM overlay for HUD, menus, popups, and accessibility.
- Simulation state is separate from renderer objects.
- Tower state should be serializable:
  - level
  - face
  - layer
  - slot
  - block type
  - direction
  - removed state
  - timer
  - stability
  - moves
  - mistakes
- Keep AdMob isolated in `src/admob.ts`.
- Expose `window.render_game_to_text()` for automated inspection.
- Expose `window.advanceTime(ms)` for deterministic tests.

## Success Metrics For Prototype

- A first-time player understands rotate + tap within 10 seconds.
- Level 1 can be completed in under 30 seconds.
- A blocked tap visibly explains why it failed.
- The player has at least one "aha" moment by level 3 where rotating reveals the answer.
- No important control is outside the comfortable thumb zone.
- Ads never appear during active gameplay.

## Research References

- Google AdMob recommends interstitials at natural breaks between levels or stages, not during active actions: https://support.google.com/admob/answer/6201350
- Google AdMob describes rewarded ads as opt-in rewards rather than forced interruptions: https://admob.google.com/home/resources/rewarded-ads-playbook/
- Apple recommends game onboarding that teaches the core loop through tutorials players can revisit: https://developer.apple.com/app-store/onboarding-for-games/
- Mobile onboarding guidance consistently favors progressive disclosure over front-loaded explanation: https://www.appcues.com/blog/essential-guide-mobile-user-onboarding-ui-ux
- Casual game design fundamentals emphasize a basic core loop, accessibility to non-gamers, F2P constraints, and difficulty tuning from user data: https://gamedesignskills.com/game-design/casual/
- King/Candy Crush design interviews emphasize continuous testing, balancing, and appealing to a spectrum of casual playstyles: https://www.pocketgamer.biz/competitive-or-casual-designing-candy-crush-with-a-spectrum-of-flavours/
- Puzzle/casual retention benchmarks show why early clarity and repeatable short-session value matter: https://www.gameinsights.ai/tools/retention-benchmarks
