// Bumps the version in version.js. Run before every push.
//   node bump.js         → patch bump (4.0.1 → 4.0.2)
//   node bump.js minor   → minor bump (4.0.2 → 4.1.0)
//   node bump.js major   → major bump (4.1.0 → 5.0.0)
const fs = require("fs");
const file = "version.js";
const level = (process.argv[2] || "patch").toLowerCase();

let s = fs.readFileSync(file, "utf8");
const m = s.match(/APP_VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)"/);
if (!m) { console.error("Could not find APP_VERSION in version.js"); process.exit(1); }

let major = +m[1], minor = +m[2], patch = +m[3];
if (level === "major") { major++; minor = 0; patch = 0; }
else if (level === "minor") { minor++; patch = 0; }
else { patch++; }

const next = `${major}.${minor}.${patch}`;
s = s.replace(/APP_VERSION\s*=\s*"\d+\.\d+\.\d+"/, `APP_VERSION = "${next}"`);
fs.writeFileSync(file, s);
console.log(`Version bumped (${level}) to ${next}`);
