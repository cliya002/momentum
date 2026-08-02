// Tests fillNotesFromTemplates: copies template notes onto matching habits
// that have no note, and never overwrites an existing note.
// Run: node test/fillnotes.test.js
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

// A known template item name that has a note in the library.
const map = T.templateNoteMap();
const sampleName = Object.keys(map)[0];
assert(!!sampleName, "template note map is populated");

console.log("fills blank notes from matching template");
{
  const st = T.normalizeState({ habits: [
    { id: "a", name: sampleName, notes: "" },              // matches a template → should fill
    { id: "b", name: "Totally Made Up Habit XYZ", notes: "" }, // no match → stays blank
    { id: "c", name: sampleName, notes: "my own note" },    // has a note → keep it
  ] });
  T.setState(st); T.resetRenderCaches();
  const n = T.fillNotesFromTemplates();
  const habits = T.getState().habits;
  assert(habits[0].notes && habits[0].notes.length > 0, "blank matching habit got the template note");
  assert(habits[0].notes === map[sampleName.toLowerCase()], "note matches the template's note");
  assert(habits[1].notes === "", "non-matching habit left blank");
  assert(habits[2].notes === "my own note", "existing note preserved (not overwritten)");
  assert(n === 1, "reports 1 habit filled");
}

console.log("case-insensitive name match");
{
  const st = T.normalizeState({ habits: [{ id: "a", name: sampleName.toUpperCase(), notes: "" }] });
  T.setState(st); T.resetRenderCaches();
  T.fillNotesFromTemplates();
  assert(T.getState().habits[0].notes.length > 0, "uppercased name still matches");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
