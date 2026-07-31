// Tests the "Last night / Tonight" night-habit attribution used on the Today tab.
// Run: node test/night.test.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const versionSrc = fs.readFileSync(path.join(root, "version.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const sandbox = {};
new Function("self", versionSrc + "\n" + appSrc)(sandbox);
const T = sandbox.__momentumTest;

let pass = 0, fail = 0;
function assert(c, m) { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ FAIL: " + m); } }

// Build proper habit objects through normalizeState.
const st = T.normalizeState({
  habits: [
    { id: "bed", name: "Bedtime", nightPrevDay: true, days: [0, 1, 2, 3, 4, 5, 6] },
    { id: "walk", name: "Morning walk", days: [0, 1, 2, 3, 4, 5, 6] },
    { id: "monNight", name: "Monday-only night", nightPrevDay: true, days: [1] },
  ],
});
const habits = st.habits;

console.log("Night-habit attribution");

// Jan 2025: 14th = Tue, 15th = Wed, 16th = Thu
{
  const now = new Date(2025, 0, 15, 8, 0, 0); // Wed morning
  const r = T.splitNightHabits(habits, now);
  assert(r.isPrev === true, "before noon → last night (previous day)");
  assert(T.dateKey(r.date) === T.dateKey(T.addDays(now, -1)), "logs against yesterday");
  assert(r.nightHabits.some((h) => h.id === "bed"), "daily night habit shows in the morning");
  assert(!r.scheduled.some((h) => h.nightPrevDay), "night habits are kept out of the regular list");
  assert(r.scheduled.some((h) => h.id === "walk"), "regular habit stays in the scheduled list");
}
{
  const now = new Date(2025, 0, 15, 22, 0, 0); // Wed evening
  const r = T.splitNightHabits(habits, now);
  assert(r.isPrev === false, "from noon on → tonight (today)");
  assert(T.dateKey(r.date) === T.dateKey(now), "logs against today");
}
{
  const now = new Date(2025, 0, 15, 1, 0, 0); // Wed 1am (after midnight)
  const r = T.splitNightHabits(habits, now);
  assert(r.isPrev === true && T.dateKey(r.date) === T.dateKey(T.addDays(now, -1)), "1am counts for the night that just ended (yesterday)");
}
{
  // Tue morning → nightDate = Mon → the Monday-only night habit applies
  const now = new Date(2025, 0, 14, 8, 0, 0);
  const r = T.splitNightHabits(habits, now);
  assert(r.nightHabits.some((h) => h.id === "monNight"), "Monday-only night habit shows Tue morning (yesterday = Mon)");
}
{
  // Thu morning → nightDate = Wed → the Monday-only night habit does NOT apply
  const now = new Date(2025, 0, 16, 8, 0, 0);
  const r = T.splitNightHabits(habits, now);
  assert(!r.nightHabits.some((h) => h.id === "monNight"), "Monday-only night habit hidden Thu morning (yesterday = Wed)");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
