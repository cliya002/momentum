// Tests achievements: evaluation, unlocking/persistence, and merge.
// Run: node test/achievements.test.js
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

function fresh(habits) {
  const st = T.normalizeState({ habits });
  T.setState(st); T.resetRenderCaches();
  return st;
}
function markBack(id, days) {
  const st = T.getState();
  for (let i = 1; i <= days; i++) {
    const k = T.dateKey(T.addDays(new Date(), -i));
    (st.completions[k] = st.completions[k] || {})[id] = 1;
  }
}
function find(list, id) { return list.find((a) => a.def.id === id); }

console.log("evaluateAchievements — locked at start");
{
  fresh([{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }]);
  const list = T.evaluateAchievements();
  assert(find(list, "first_checkin").unlocked === false, "first_checkin locked with no check-ins");
  assert(list.length >= 10, "full achievement catalog present");
}

console.log("unlock by check-ins");
{
  const st = fresh([{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }]);
  markBack("a", 12);
  T.resetRenderCaches();
  const list = T.evaluateAchievements();
  assert(find(list, "first_checkin").unlocked, "first_checkin unlocks");
  assert(find(list, "ten_checkins").unlocked, "ten_checkins unlocks at 12");
  assert(find(list, "hundred_checkins").unlocked === false, "hundred still locked");
}

console.log("checkAchievements persists + returns fresh");
{
  const st = fresh([{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }]);
  markBack("a", 3);
  T.resetRenderCaches();
  const fresh1 = T.checkAchievements();
  assert(fresh1.some((a) => a.id === "first_checkin"), "returns newly-earned on first call");
  assert(st.achievements.first_checkin > 0, "earnedAt persisted to state");
  const fresh2 = T.checkAchievements();
  assert(fresh2.length === 0, "second call reports nothing new");
}

console.log("streak achievement");
{
  const st = fresh([{ id: "a", name: "A", days: [0,1,2,3,4,5,6] }]);
  markBack("a", 8); // 8 straight prior days → longest streak >= 7
  T.resetRenderCaches();
  const list = T.evaluateAchievements();
  assert(find(list, "streak_7").unlocked, "7-day streak unlocks week warrior");
  assert(T.maxLongestStreak() >= 7, "maxLongestStreak reflects history");
}

console.log("achievements merge (earliest earnedAt, union)");
{
  const local = T.normalizeState({ habits: [], achievements: { a: 100, b: 500 } });
  const remote = T.normalizeState({ habits: [], achievements: { a: 50, c: 900 } });
  const merged = T.mergeStates(local, remote);
  assert(merged.achievements.a === 50, "earliest earnedAt wins for shared id");
  assert(merged.achievements.b === 500 && merged.achievements.c === 900, "union of all unlocked ids");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
