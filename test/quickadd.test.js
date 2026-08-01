// Tests natural-language quick-add parser (parseQuickAdd).
// Run: node test/quickadd.test.js
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

console.log("time of day + count");
{
  const p = T.parseQuickAdd("Meditate 10 min every morning");
  assert(p.name === "Meditate", "name = Meditate (tokens stripped)");
  assert(p.type === "count" && p.target === 10 && p.unit === "min", "count 10 min");
  assert(p.time === "Morning" && p.reminderTime === "08:00", "morning → 08:00 reminder");
}

console.log("explicit clock");
{
  const p = T.parseQuickAdd("Read at 9:30pm");
  assert(p.name === "Read", "name = Read");
  assert(p.reminderTime === "21:30", "9:30pm → 21:30");
}
{
  const p = T.parseQuickAdd("Standup at 09:15");
  assert(p.reminderTime === "09:15", "24h clock parsed");
}

console.log("weekly frequency");
{
  const p = T.parseQuickAdd("Gym 3x a week");
  assert(p.name === "Gym", "name = Gym");
  assert(p.freqType === "weekly" && p.weeklyTarget === 3, "3x a week → weekly target 3");
}

console.log("weekdays / weekends");
{
  const p = T.parseQuickAdd("Pack lunch on weekdays");
  assert(JSON.stringify(p.days) === JSON.stringify([1,2,3,4,5]), "weekdays → Mon-Fri");
}
{
  const p = T.parseQuickAdd("Long run weekends");
  assert(JSON.stringify(p.days) === JSON.stringify([0,6]), "weekends → Sat/Sun");
}

console.log("specific days");
{
  const p = T.parseQuickAdd("Yoga mon wed fri");
  assert(JSON.stringify(p.days) === JSON.stringify([1,3,5]), "mon/wed/fri parsed");
  assert(p.name === "Yoga", "name = Yoga");
}

console.log("quit habits");
{
  const p = T.parseQuickAdd("No smoking");
  assert(p.quit === true, "quit flag set");
  assert(p.name === "Smoking", "quit word stripped from name");
}

console.log("count units");
{
  const p = T.parseQuickAdd("Drink water 2 L every day");
  assert(p.type === "count" && p.target === 2 && p.unit === "L", "2 L water");
  assert(p.increment === 0.5, "L increment 0.5");
  assert(JSON.stringify(p.days) === JSON.stringify([0,1,2,3,4,5,6]), "every day → all week");
  assert(p.name === "Drink water", "name = Drink water");
}
{
  const p = T.parseQuickAdd("Walk 8000 steps");
  assert(p.target === 8000 && p.unit === "steps" && p.increment === 1000, "steps with 1000 increment");
}

console.log("empty / junk");
{
  assert(T.parseQuickAdd("") === null, "empty → null");
  const p = T.parseQuickAdd("Journal");
  assert(p.name === "Journal" && p.type === "check", "plain habit → check type");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
