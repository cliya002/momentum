// Tests accent color helpers (hexToRgb, shade) used by the appearance picker.
// Run: node test/appearance.test.js
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

console.log("hexToRgb");
{
  assert(JSON.stringify(T.hexToRgb("#ff0000")) === JSON.stringify({ r: 255, g: 0, b: 0 }), "#ff0000 → red");
  assert(JSON.stringify(T.hexToRgb("6366f1")) === JSON.stringify({ r: 99, g: 102, b: 241 }), "no-hash form accepted");
  assert(T.hexToRgb("nope") === null, "invalid → null");
}

console.log("shade");
{
  assert(T.shade("#808080", -0.5).toLowerCase() === "#404040", "darken 50% halves channels");
  assert(T.shade("#000000", 1) === "#ffffff", "lighten black fully → white");
  assert(/^#[0-9a-f]{6}$/i.test(T.shade("#6366f1", -0.18)), "returns a valid hex");
  assert(T.shade("bad", -0.2) === "bad", "invalid passes through");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
