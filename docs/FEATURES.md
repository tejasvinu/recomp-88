# Recomp 88 — Feature checklist

The behaviours a UI change must not lose. Walk this list on a phone after any
redesign work. If an item is unchecked, the change is not done.

## Tracker (Workout tab)

Tracker actions come from `useWorkoutActions()` (implemented in `App.tsx`).
Layout components never mutate workout state directly.

Ergonomics floor: primary controls ≥ 44px tall, inputs use 16px text (stops
iOS zoom on focus), no text below 9px. Check at 320px and 375px widths.

### Header
- [ ] Day pills D1…D7 scroll horizontally; active pill is filled with the accent
- [ ] Prev / next chevrons change day; disabled at the ends
- [ ] Swiping left / right on the workout body changes day and scrolls to top
- [ ] Progress bar and % reflect completed sets / total sets (extra sets count)
- [ ] Workout timer pill appears once the first set is ticked; tap pauses (turns amber), reset button clears it
- [ ] Timer stays visible when leaving the Tracker mid-session
- [ ] Off the Tracker, an "Active workout" card shows day name + % with an Open button

### Exercise card
- [ ] Number badge, name, info (ⓘ) only when a wiki entry exists
- [ ] Notes button toggles a textarea; dot indicator when a note exists; saves as you type
- [ ] History button (only when a previous session exists) loads last session weight + reps into planned sets
- [ ] Strength / Hypertrophy chip; `details` chip when present
- [ ] BW chip (in the column header, beside the unit) toggles every set to bodyweight and back; header switches "kg"/"lbs" ↔ "load"
- [ ] "other"-type exercises show a single "Mark complete" row, no weight/reps

### Set row
- [ ] Set number badge; tap it to open the set-type picker (Working / Warmup / Drop / Failure); badge shows W/WU/D/F colours
- [ ] −/+ adjust weight by 2.5 kg or 5 lbs; never below 0
- [ ] In BW mode a "BW" badge sits above the input, which shows only the offset ("10"), stored as `BW+10` / `BW-10`; −/+ adjust the offset
- [ ] Placeholders show last session's weight/reps, falling back to target reps
- [ ] Focusing an input selects its contents
- [ ] PR badge + gold border when typed weight beats the all-time best (not in BW mode)
- [ ] Tick button completes the set: vibrate, starts workout timer, starts rest timer (strength vs hypertrophy duration; none for "other")
- [ ] Completed row tints accent; warmup completed row tints grey
- [ ] RPE row (6–10) appears after completion; tap again to clear; colour by intensity

### Extra sets & supersets
- [ ] "Add extra set" disabled until planned sets are complete; extra set copies last load and type
- [ ] Extra sets labelled E1, E2… with a "Remove extra" button
- [ ] Linked exercises render inside a Superset (accent) or Circuit (info) block with slot numbers

### End of workout
- [ ] Primer / pre-workout / finisher / post-workout buttons appear only when the day defines them and jump to Recovery
- [ ] "Just Show Up — 15 min" opens the low-pressure session modal
- [ ] Save Workout → confirm modal → session saved, checkmarks/RPE cleared, weights kept, extra sets removed, timers reset, toast with Undo
- [ ] Undo restores progress and removes the saved session
- [ ] Clear Unsaved Checkmarks resets ticks without saving
- [ ] Reaching 100% shows the "Day Done" overlay for 3 s with a vibrate

### Rest timer toast
- [ ] Counts down with a progress ring/bar; ±15 s; pause/resume; dismiss; beep at end when sound is on
- [ ] Survives reload (persisted state)

## Home (Dashboard)
- [ ] 12-week consistency grid + day streak
- [ ] Just Show Up card
- [ ] Next up card → Start Workout switches to Tracker
- [ ] This week volume / weight stats

## Recovery
- [ ] Primer / finisher / routine lists with search and empty states
- [ ] Guided stretching session: per-stretch timer, side switching, completion screen

## Wiki
- [ ] Search + filters (category / free-weight)
- [ ] Exercise detail modal: cues, mistakes, setup, swaps (navigate to swap, back button), video

## Progress
- [ ] Progression / Personal Records segmented switch
- [ ] Est. 1RM chart per exercise, week-vs-week, tonnage trend, exercise volume, muscle recovery heatmap, recent sessions (delete)
- [ ] Log body weight
- [ ] Records table: max weight, session volume, opens exercise info

## Profile
- [ ] Guest mode vs account; sign in / sign out
- [ ] Cloud backup status, last synced, manual sync, merge note dismiss
- [ ] Stats: total training time, favourite day

## Global
- [ ] Settings: rest durations, sound, weight unit, **theme**, export JSON / CSV / config, import, edit workout, add past session, free-weight swaps, reset template, clear data
- [ ] Plate calculator
- [ ] Workout editor: days, exercises, reorder, link superset/circuit, duplicate/delete day, library, custom exercises
- [ ] Add past session
- [ ] Toasts with undo; install prompt; splash screen
- [ ] Cloud sync: pull on login/focus, push on change, flush on background
