# Recomp 88 — Improvements Tracker

> All planned features, polish, and fixes. Updated as work progresses.

---

## Status Legend
- [ ] Pending
- [~] In progress
- [x] Done

---

## 1. Critical Gaps

### [x] Session History & PR Tracker
**Problem:** `WorkoutProgress` has no timestamps. "Finish & Reset" destroys completion data. Charts only show the current live session.  
**Fix:** On "Finish & Reset", snapshot the current progress into a date-stamped `WorkoutSession` array saved in its own localStorage key (`recomp88-sessions`). Use that history to drive a PR Tracker line chart in the Progress tab.  
**Files:** `types.ts`, `App.tsx`, `ChartsView.tsx`  
**Status:** ✅ Done

### [x] Export / Import JSON
**Problem:** All data lives in `localStorage`. One browser wipe = data gone. No backup path.  
**Fix:** Settings modal (gear icon in header) with one-click JSON export (download file) and JSON import (file picker).  
**Files:** `App.tsx`  
**Status:** ✅ Done

---

## 2. New Features

### [x] Wiki Deep-link from Charts
**Problem:** You can see an exercise name in the Charts tab but can't tap it to get form cues.  
**Fix:** Pass `onOpenExercise` callback from `App` → `ChartsView`; each 1RM entry gets an info button.  
**Files:** `App.tsx`, `ChartsView.tsx`  
**Status:** ✅ Done

### [x] PWA Manifest
**Problem:** App is mobile-first but can't be installed to home screen; no offline support.  
**Fix:** Add `public/manifest.json` with correct icons/colors; link it from `index.html`. Add `theme-color` meta tag.  
**Files:** `index.html`, `public/manifest.json`  
**Status:** ✅ Done

---

## 3. Polish & UX

### [x] Day Completion Celebration
**Problem:** No acknowledgement when you finish all sets in a day.  
**Fix:** When `progressPercent` reaches 100, auto-show a brief full-screen overlay with a large ✓ and message.  
**Files:** `App.tsx`  
**Status:** ✅ Done

### [x] Haptic Feedback on Set Complete
**Problem:** No tactile confirmation on mobile when you tap a set done.  
**Fix:** Call `navigator.vibrate(50)` when toggling a set from incomplete → complete.  
**Files:** `App.tsx`  
**Status:** ✅ Done

### [x] Input Auto-Select on Focus
**Problem:** Tapping a weight/reps input on mobile requires backspacing before typing new value.  
**Fix:** Add `onFocus={(e) => e.target.select()}` to all number inputs in the tracker.  
**Files:** `App.tsx`  
**Status:** ✅ Done

### [x] TypeScript Fix: `makeSets()` return type
**Problem:** `makeSets()` in `data.ts` returns `any[]` instead of `SetData[]`.  
**Fix:** Change return type to `SetData[]`.  
**Files:** `data.ts`  
**Status:** ✅ Done

---

## 4. Sprint 2

### [x] Swipe Gesture Between Days
**Fix:** Touch handlers on workout content area — horizontal swipe (threshold 60px, must exceed vertical delta) advances/retreats day.  
**Files:** `App.tsx`  
**Status:** ✅ Done

### [x] Rest Timer Customization
**Fix:** Two +/- controls in Settings modal for Strength (default 120s) and Hypertrophy (default 90s) rest durations. Persisted to localStorage. Range 30–300s, step 15s.  
**Files:** `App.tsx`  
**Status:** ✅ Done

### [x] Plate Calculator
**Fix:** New `PlateCalculator.tsx` modal, launched via ⊞ icon in workout header. Enter target weight + choose bar (20/15/10kg) → shows plates-per-side list + barbell visualization with color-coded plates.  
**Files:** `src/components/PlateCalculator.tsx`, `App.tsx`  
**Status:** ✅ Done

### [x] Notes per Exercise
**Fix:** Collapsible textarea at the bottom of each exercise card, toggled by a note icon. Persisted in `recomp88-notes` localStorage. Green dot indicator when a note exists.  
**Files:** `App.tsx`  
**Status:** ✅ Done

### [x] Bodyweight Quick-Fill
**Fix:** "BW" button in each exercise header. One tap fills all weight fields with "BW" (toggle: second tap clears them). Volume charts skip BW entries (parseFloat → NaN → 0).  
**Files:** `App.tsx`  
**Status:** ✅ Done

### [x] Week-over-Week Tonnage Comparison
**Fix:** New card in Progress tab comparing total tonnage from the last 7 days vs the prior 7 days, with session counts and percentage change indicator.  
**Files:** `ChartsView.tsx`  
**Status:** ✅ Done

---

## 5. Future Ideas (backlog)

- [ ] Cloud sync / account system
- [ ] Detailed per-day week comparison chart
- [ ] Body-part muscle fatigue heatmap
