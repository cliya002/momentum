// Tests the pure Google Health helpers: auth-URL building, the "today" filter,
// and rolling up exercise dataPoints into a summary.
// Run: node test/googlehealth.test.js
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

console.log("buildGoogleAuthUrl");
{
  const url = T.buildGoogleAuthUrl("cid123", "https://app.example/", "CHAL", "gh_abc");
  assert(url.indexOf("https://accounts.google.com/o/oauth2/v2/auth?") === 0, "uses Google's auth endpoint");
  const q = new URL(url).searchParams;
  assert(q.get("client_id") === "cid123", "client_id set");
  assert(q.get("redirect_uri") === "https://app.example/", "redirect_uri set");
  assert(q.get("response_type") === "code", "response_type=code");
  assert(q.get("access_type") === "offline", "access_type=offline (gets refresh token)");
  assert(q.get("prompt") === "consent", "prompt=consent (re-issues refresh token)");
  assert(q.get("code_challenge") === "CHAL" && q.get("code_challenge_method") === "S256", "PKCE challenge + method");
  assert(q.get("state") === "gh_abc", "state carried");
  assert(/googlehealth\.activity_and_fitness\.readonly$/.test(q.get("scope")), "read-only activity scope");
}

console.log("googleTodayFilter");
{
  const f = T.googleTodayFilter(new Date(2026, 1, 5, 14, 30)); // Feb 5 2026, local
  assert(f === 'exercise.interval.civil_start_time >= "2026-02-05T00:00:00"', "civil midnight filter for the local day");
}

console.log("mapExerciseDataPoints");
{
  const json = { dataPoints: [
    { exercise: { exerciseType: "WALKING", displayName: "Walk", interval: { startTime: "2026-02-23T06:00:00Z" },
      metricsSummary: { steps: "2038", caloriesKcal: 17, activeZoneMinutes: "0", distanceMillimiters: 1609344 } } },
    { exercise: { exerciseType: "RUNNING", displayName: "Run", interval: { startTime: "2026-02-23T13:10:00Z" },
      metricsSummary: { steps: "3000", caloriesKcal: 40, activeZoneMinutes: "12", distanceMillimiters: 2000000 } } },
  ] };
  const s = T.mapExerciseDataPoints(json);
  assert(s.count === 2, "counts both workouts");
  assert(s.steps === 5038, "sums steps (2038 + 3000)");
  assert(s.caloriesKcal === 57, "sums calories");
  assert(s.activeMinutes === 12, "sums active minutes");
  assert(s.last && s.last.displayName === "Run", "last workout is the latest by start time");
}
{
  const s = T.mapExerciseDataPoints({});
  assert(s.count === 0 && s.steps === 0 && s.last === null, "empty/missing response → zeroed summary");
}
{
  const s = T.mapExerciseDataPoints({ dataPoints: [{}, { exercise: null }] });
  assert(s.count === 2 && s.steps === 0, "malformed points don't throw and add nothing");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
