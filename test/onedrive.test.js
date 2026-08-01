// Tests the OneDrive PKCE base64url encoder (b64url). The rest of the OneDrive
// module is browser-only (WebCrypto, OAuth redirects, Graph fetch).
// Run: node test/onedrive.test.js
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

console.log("b64url (RFC 4648 base64url, no padding)");
{
  // "Man" → base64 "TWFu" (no url-unsafe chars here)
  assert(T.b64url(new Uint8Array([77, 97, 110])) === "TWFu", "encodes 'Man'");
  // bytes that produce + and / in standard base64 → must become - and _
  // 0xfb 0xff 0xbf → standard "+/+/"; url-safe "-_-_"
  const out = T.b64url(new Uint8Array([0xfb, 0xff, 0xbf]));
  assert(!/[+/=]/.test(out), "no +, / or = characters");
  assert(out === "-_-_", "url-safe substitution applied");
}
{
  // 1 byte → 2 base64 chars after stripping padding
  assert(T.b64url(new Uint8Array([0])) === "AA", "padding stripped");
  assert(T.b64url(new Uint8Array([])) === "", "empty → empty");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
