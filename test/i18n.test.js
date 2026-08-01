// Tests localization scaffolding (translate, availableLangs).
// Run: node test/i18n.test.js
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

console.log("availableLangs");
{
  const langs = T.availableLangs();
  assert(langs[0] === "en", "English is the base language");
  assert(langs.includes("es"), "Spanish locale registered");
}

console.log("translate");
{
  assert(T.translate("es", "nav.today") === "Hoy", "es nav.today → Hoy");
  assert(T.translate("es", "page.settings") === "Ajustes", "es page.settings → Ajustes");
  assert(T.translate("en", "nav.today") === null, "English falls through to base (null)");
  assert(T.translate("es", "nonexistent.key") === null, "unknown key → null");
  assert(T.translate("zz", "nav.today") === null, "unknown locale → null");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
