// Tests trash / undo-delete + tombstone interplay and merge.
// Run: node test/trash.test.js
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

console.log("Delete → trash → restore");
{
  const today = T.dateKey(new Date());
  const st = T.normalizeState({
    habits: [{ id: "h", name: "H", target: 1, days: [0, 1, 2, 3, 4, 5, 6] }],
    completions: { [today]: { h: 1 } },
  });
  T.setState(st);
  assert(T.deleteHabitById("h", { confirm: false }) === true, "delete moves habit to trash");
  assert(T.getState().habits.length === 0, "habit removed from active list");
  assert(T.getState().trash.length === 1, "one entry in trash");
  assert(!T.getState().completions[today] || !T.getState().completions[today].h, "live completion stripped");
  assert(T.restoreFromTrash("h") === true, "restore succeeds");
  assert(T.getState().habits.some((x) => x.id === "h"), "habit back in active list");
  assert(T.getState().completions[today] && T.getState().completions[today].h === 1, "completion restored");
  assert(T.getState().trash.length === 0, "trash emptied");
}

console.log("Restore outlives an existing tombstone");
{
  const st = T.normalizeState({
    habits: [{ id: "h", name: "H", target: 1 }],
    deletions: { habits: { h: Date.now() + 1000000 } }, // stale future tombstone
  });
  T.setState(st);
  T.deleteHabitById("h", { confirm: false });
  T.restoreFromTrash("h");
  const h = T.getState().habits.find((x) => x.id === "h");
  const tomb = T.getState().deletions.habits["h"] || 0;
  assert(h && h.updatedAt > tomb, "restored habit updatedAt beats any prior tombstone");
}

console.log("Permanent delete writes tombstone; purge after retention");
{
  const st = T.normalizeState({ habits: [{ id: "h", name: "H" }] });
  T.setState(st);
  T.deleteHabitById("h", { confirm: false });
  T.permanentDeleteFromTrash("h");
  assert(T.getState().trash.length === 0, "removed from trash");
  assert((T.getState().deletions.habits["h"] || 0) > 0, "tombstone written on permanent delete");
}
{
  const eightDays = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const st = T.normalizeState({ habits: [], trash: [{ habit: { id: "old" }, completions: {}, trashedAt: eightDays }] });
  T.setState(st);
  const purged = T.purgeTrash();
  assert(purged === 1 && T.getState().trash.length === 0, "8-day-old trash purged");
  assert((T.getState().deletions.habits["old"] || 0) > 0, "purge writes tombstone");
}

console.log("mergeStates: trash union + tombstone-wins");
{
  const A = T.normalizeState({ trash: [{ habit: { id: "t1", name: "T1" }, completions: {}, trashedAt: 1000 }] });
  const B = T.normalizeState({ habits: [], deletions: { habits: { t1: 5000 } } }); // later tombstone
  const m = T.mergeStates(A, B);
  assert(!m.trash.some((e) => e.habit.id === "t1"), "trash entry dropped when a newer tombstone exists");
}
{
  const A = T.normalizeState({ trash: [{ habit: { id: "t2", name: "T2" }, completions: {}, trashedAt: 9000 }] });
  const B = T.normalizeState({ habits: [] });
  const m = T.mergeStates(A, B);
  assert(m.trash.some((e) => e.habit.id === "t2"), "trash entry retained when no tombstone/active habit");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
