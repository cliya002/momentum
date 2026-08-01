# Implementation Plan — habit-management-enhancements

- [x] 1. Data model foundation (state, normalize, merge, KEYS) — _Req 1.10, 2.9, 2.10, 3.7, 8.7, 9.5_
- [x] 2. Streak freeze logic + tests (`test/streak.test.js`) — _Req 3.1–3.8_
- [x] 3. Archive/pause (exclusions + Habits Active/Archived filter + controls) — _Req 1.1–1.9_
- [x] 4. Trash/undo-delete + tests (`test/trash.test.js`) + Trash view — _Req 2.1–2.8_
- [x] 5. Per-habit custom reminder message (modal + reminders + push) — _Req 8.1–8.6_
- [x] 6. 12h/24h time preference + tests (`test/format.test.js`) — _Req 9.1–9.7_
- [x] 7. Per-habit detail view (streak/longest/rate/best-worst + freeze toggle) — _Req 5.1–5.7, 3.6_
- [x] 8. Adherence trend chart (weekly/monthly SVG line) — _Req 4.1–4.7_
- [x] 9. First-run onboarding (starter packs + default reminder) — _Req 6.1–6.8_
- [x] 10. Full backup & restore + tests (`test/backup.test.js`) + reminder — _Req 7.1–7.9_
- [x] 11. Verify + ship (static checks, 71 tests across 7 suites, versions bumped, pushed)

All shipped across v4.18.0 (batch 1), v4.19.0 (batch 2), v4.20.0 (batch 3).
