// Tests vacation / pause mode: inVacation, isFrozen-during-vacation,
// adherence/streak neutrality, and normalize + merge.
// Run: node test/vacation.test.js
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

const habit = () => T.getState().habits[0];

console.log("inVacation range");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", days: [0,1,2,3,4,5,6] }] });
  const y = T.dateKey(T.addDays(new Date(), -1));
  const t = T.dateKey(new Date());
  const tm = T.dateKey(T.addDays(new Date(), 1));
  st.vacation = { start: y, end: tm, updatedAt: 1 };
  T.setState(st); T.resetRenderCaches();
  assert(T.inVacation(new Date()) === true, "today inside range → true");
  assert(T.vacationActiveNow() === true, "vacationActiveNow true when today in range");
  assert(T.inVacation(T.addDays(new Date(), 5)) === false, "date outside range → false");
}
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H" }] });
  st.vacation = { start: null, end: null, updatedAt: 0 };
  T.setState(st); T.resetRenderCaches();
  assert(T.inVacation(new Date()) === false, "no range set → false");
}

console.log("vacation days are frozen (neutral)");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", days: [0,1,2,3,4,5,6] }] });
  const d = T.addDays(new Date(), -1);
  st.vacation = { start: T.dateKey(d), end: T.dateKey(d), updatedAt: 1 };
  T.setState(st); T.resetRenderCaches();
  assert(T.isFrozen("h", d) === true, "vacation day reports frozen");
  assert(T.countsForAdherence(habit(), d) === false, "vacation day excluded from adherence");
}

console.log("streak survives a vacation gap");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H", days: [0,1,2,3,4,5,6] }] });
  T.setState(st);
  // done today + 3 days ago; days 1 and 2 ago are vacation (skipped, not broken)
  for (const off of [0, 3]) {
    const k = T.dateKey(T.addDays(new Date(), -off));
    (st.completions[k] = st.completions[k] || {})["h"] = 1;
  }
  st.vacation = { start: T.dateKey(T.addDays(new Date(), -2)), end: T.dateKey(T.addDays(new Date(), -1)), updatedAt: 1 };
  T.resetRenderCaches();
  assert(T.currentStreak(habit()) === 2, "vacation gap doesn't break the streak → 2");
}

console.log("normalize");
{
  const st = T.normalizeState({ habits: [], vacation: { start: "2025-06-01", end: "2025-06-10", note: "Trip", updatedAt: 5 } });
  assert(st.vacation.start === "2025-06-01" && st.vacation.end === "2025-06-10", "valid range kept");
  assert(st.vacation.note === "Trip", "note kept");
}
{
  const st = T.normalizeState({ habits: [], vacation: { start: "bad", end: "2025-06-10" } });
  assert(st.vacation.start === null, "invalid date rejected");
}

console.log("merge (newest updatedAt wins)");
{
  const local = T.normalizeState({ habits: [], vacation: { start: "2025-01-01", end: "2025-01-05", updatedAt: 100 } });
  const remote = T.normalizeState({ habits: [], vacation: { start: "2025-02-01", end: "2025-02-05", updatedAt: 200 } });
  const merged = T.mergeStates(local, remote);
  assert(merged.vacation.start === "2025-02-01", "newer vacation wins");
  const merged2 = T.mergeStates(remote, local);
  assert(merged2.vacation.start === "2025-02-01", "merge order-independent");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
