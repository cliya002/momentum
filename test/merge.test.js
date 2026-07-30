// Automated test of the REAL mergeStates logic from app.js.
// Simulates two devices syncing through a shared cloud copy.
// Run: node test/merge.test.js
const fs = require("fs");
const path = require("path");

// Load version.js + app.js into a Node context with a minimal `self` shim.
const root = path.join(__dirname, "..");
const versionSrc = fs.readFileSync(path.join(root, "version.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const sandboxSelf = {};
// version.js sets self.APP_VERSION; app.js sets self.__momentumTest and reads nothing at load.
new Function("self", versionSrc + "\n" + appSrc)(sandboxSelf);
const T = sandboxSelf.__momentumTest;
if (!T || !T.mergeStates) { console.error("Could not load mergeStates"); process.exit(1); }

const { mergeStates, normalizeState, defaultState, dateKey, addDays } = T;

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log("  ✓ " + msg); }
  else { fail++; console.log("  ✗ FAIL: " + msg); }
}

function habit(id, name, extra = {}) {
  return normalizeState({ habits: [{ id, name, updatedAt: Date.now(), ...extra }] }).habits[0];
}

const today = dateKey(new Date());
const yesterday = dateKey(addDays(new Date(), -1));

// ---------------------------------------------------------------
console.log("Scenario 1: distinct check-ins on two devices both survive");
{
  const A = defaultState();
  const B = defaultState();
  const h = habit("h1", "Water");
  A.habits = [h]; B.habits = [h];
  // Device A checks it off today; Device B checked it off yesterday.
  A.completions[today] = { h1: 1 };  A.completionsUpdatedAt[today] = 2000;
  B.completions[yesterday] = { h1: 1 }; B.completionsUpdatedAt[yesterday] = 1000;
  const m = mergeStates(A, B);
  assert(m.completions[today] && m.completions[today].h1 === 1, "today's check-in kept");
  assert(m.completions[yesterday] && m.completions[yesterday].h1 === 1, "yesterday's check-in kept");
}

// ---------------------------------------------------------------
console.log("Scenario 2: same-day conflicting value → newer timestamp wins");
{
  const A = defaultState(); const B = defaultState();
  const h = habit("h1", "Steps");
  A.habits = [h]; B.habits = [h];
  A.completions[today] = { h1: 1 }; A.completionsUpdatedAt[today] = 5000; // newer
  B.completions[today] = { h1: -1 }; B.completionsUpdatedAt[today] = 3000; // older (not done)
  const m = mergeStates(A, B);
  assert(m.completions[today].h1 === 1, "newer 'done' wins over older 'not done'");
  const m2 = mergeStates(B, A); // order shouldn't matter
  assert(m2.completions[today].h1 === 1, "result is order-independent");
}

// ---------------------------------------------------------------
console.log("Scenario 3: a delete (tombstone) on one device wins over an edit");
{
  const A = defaultState(); const B = defaultState();
  // A deleted the habit at t=5000; B still has it (older updatedAt).
  A.habits = []; A.deletions.habits = { h1: 5000 };
  const h = habit("h1", "Old habit"); h.updatedAt = 3000;
  B.habits = [h];
  const m = mergeStates(A, B);
  assert(!m.habits.find((x) => x.id === "h1"), "deleted habit stays deleted");
}

// ---------------------------------------------------------------
console.log("Scenario 4: edit newer than a delete → habit resurrected");
{
  const A = defaultState(); const B = defaultState();
  A.habits = []; A.deletions.habits = { h1: 3000 }; // deleted earlier
  const h = habit("h1", "Renamed"); h.updatedAt = 6000; // edited later
  B.habits = [h];
  const m = mergeStates(A, B);
  assert(!!m.habits.find((x) => x.id === "h1"), "later edit wins over earlier delete");
}

// ---------------------------------------------------------------
console.log("Scenario 5: habit edited on both → newer name wins");
{
  const A = defaultState(); const B = defaultState();
  const ha = habit("h1", "Name A"); ha.updatedAt = 2000;
  const hb = habit("h1", "Name B"); hb.updatedAt = 9000;
  A.habits = [ha]; B.habits = [hb];
  const m = mergeStates(A, B);
  assert(m.habits[0].name === "Name B", "newer edit (Name B) wins");
}

// ---------------------------------------------------------------
console.log("Scenario 6: completions for a deleted habit are dropped");
{
  const A = defaultState(); const B = defaultState();
  A.habits = []; A.deletions.habits = { h1: 5000 };
  const h = habit("h1", "Gone"); h.updatedAt = 3000;
  B.habits = [h];
  B.completions[today] = { h1: 1 }; B.completionsUpdatedAt[today] = 4000;
  const m = mergeStates(A, B);
  const stray = m.completions[today] && m.completions[today].h1;
  assert(!stray, "check-ins for a deleted habit are not resurrected");
}

// ---------------------------------------------------------------
console.log("Scenario 7: measurements + journal merge by newest updatedAt");
{
  const A = defaultState(); const B = defaultState();
  A.measurements["2026-07-27"] = { weight: 240, updatedAt: 2000 };
  B.measurements["2026-07-27"] = { weight: 238, updatedAt: 8000 };
  A.journal[today] = { text: "old", updatedAt: 1000 };
  B.journal[today] = { text: "new", updatedAt: 5000 };
  const m = mergeStates(A, B);
  assert(m.measurements["2026-07-27"].weight === 238, "newer weight wins");
  assert(m.journal[today].text === "new", "newer journal wins");
}

// ---------------------------------------------------------------
console.log("Scenario 8: categories merge by newest categoriesUpdatedAt");
{
  const A = defaultState(); const B = defaultState();
  A.categories = ["Fitness", "Custom"]; A.categoriesUpdatedAt = 2000;
  B.categories = ["Fitness", "Nutrition", "Custom"]; B.categoriesUpdatedAt = 9000;
  const m = mergeStates(A, B);
  assert(m.categories.length === 3 && m.categories.includes("Nutrition"), "newer category list wins");
}

// ---------------------------------------------------------------
console.log("Scenario 9: devices merge — union by id, newest lastSync wins");
{
  const A = defaultState(); const B = defaultState();
  A.devices = { phone: { name: "iPhone", lastSync: 3000 }, laptop: { name: "Laptop", lastSync: 1000 } };
  B.devices = { phone: { name: "iPhone", lastSync: 9000 }, tablet: { name: "iPad", lastSync: 2000 } };
  const m = mergeStates(A, B);
  assert(Object.keys(m.devices).length === 3, "all three devices present");
  assert(m.devices.phone.lastSync === 9000, "newer phone lastSync wins");
  assert(!!m.devices.laptop && !!m.devices.tablet, "unique devices from both sides kept");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
