# Implementation Plan — habit-management-enhancements

- [ ] 1. Data model foundation (state, normalize, merge, KEYS)
  - Add `archived`, `reminderMsg` to habit normalization; add `trash`, `freezes` to `defaultState`/`normalizeState`; add `KEYS.timeFormat`, `onboardSeen`, `lastBackup`
  - Extend `mergeStates`: trash (union by id, tombstone-wins), freezes (newest-wins)
  - Auto-purge trash >7 days on load (writes tombstones)
  - _Requirements: 1.10, 2.9, 2.10, 3.7, 8.7, 9.5_

- [ ] 2. Streak freeze logic + tests
  - `isFrozen(habitId, date)`, freeze/unfreeze setters; update `currentStreak` (skip frozen); exclude freeze days from adherence denominators; `longestStreak`
  - `test/streak.test.js`
  - _Requirements: 3.1–3.8_

- [ ] 3. Archive/pause
  - `isActiveHabit`; exclude archived from Today, reminders, `buildPushSchedule`, adherence; Habits_Tab Active/Archived filter; Archive/Unarchive controls
  - _Requirements: 1.1–1.9_

- [ ] 4. Trash/undo-delete + tests
  - Rework delete → move to `state.trash` (+completions snapshot); Trash view (restore / delete forever / remaining days); restore bumps `updatedAt`; permanent delete + purge write tombstones
  - `test/trash.test.js`
  - _Requirements: 2.1–2.8_

- [ ] 5. Per-habit custom reminder message
  - `reminderMsg` field + modal input (≤120); use in `fireGroupReminder` and `buildPushSchedule`; rebuild push on save
  - _Requirements: 8.1–8.6_

- [ ] 6. 12h/24h time preference + tests
  - `KEYS.timeFormat`, `timeFmt()`, route formatting through `fmtClockLabel`; Appearance setting; live re-render
  - `test/format.test.js`
  - _Requirements: 9.1–9.7_

- [ ] 7. Per-habit detail view
  - `openHabitDetail`: current/longest streak, completion rate, best/worst weekday, mini history, actions; archived reachable; insufficient-data state; freeze toggle per day
  - _Requirements: 5.1–5.7, 3.6_

- [ ] 8. Adherence trend chart
  - `renderAdherenceTrend` SVG line chart in Report; weekly/monthly toggle; gaps; excludes archived/trashed/freeze
  - _Requirements: 4.1–4.7_

- [ ] 9. First-run onboarding
  - `maybeOnboard`: starter templates + optional reminder time; skip; `onboardSeen` flag
  - _Requirements: 6.1–6.8_

- [ ] 10. Full backup & restore + tests
  - `exportBackup` (JSON w/ schemaVersion), `importBackup` (validate → normalize → replace/merge), backup reminder banner, `lastBackup`
  - `test/backup.test.js` (round-trip)
  - _Requirements: 7.1–7.9_

- [ ] 11. Verify + ship
  - Full static bug-check (parse, dup ids, refs, CSS braces), all test suites, bump version, commit/push per batch
