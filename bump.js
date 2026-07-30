// Increments the patch number in version.js. Run before every push:
//   node bump.js
const fs = require("fs");
const file = "version.js";
let s = fs.readFileSync(file, "utf8");
const m = s.match(/APP_VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)"/);
if (!m) { console.error("Could not find APP_VERSION in version.js"); process.exit(1); }
const major = +m[1], minor = +m[2], patch = +m[3] + 1;
const next = `${major}.${minor}.${patch}`;
s = s.replace(/APP_VERSION\s*=\s*"\d+\.\d+\.\d+"/, `APP_VERSION = "${next}"`);
fs.writeFileSync(file, s);
console.log("Version bumped to", next);
