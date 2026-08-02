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
  const scope = q.get("scope");
  assert(scope.includes("googlehealth.activity_and_fitness.readonly"), "requests read-only activity scope");
  assert(scope.includes("health_metrics_and_measurements.readonly"), "requests health-metrics scope (for weight)");
  assert(scope.includes("googlehealth.sleep.readonly"), "requests sleep scope");
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

console.log("sumStepsDataPoints (tolerant of field shapes)");
{
  assert(T.sumStepsDataPoints({ dataPoints: [{ steps: { count: "1200" } }, { steps: { count: 800 } }] }) === 2000, "sums steps.count (string + number)");
  assert(T.sumStepsDataPoints({ dataPoints: [{ value: 500 }, { count: 300 }] }) === 800, "sums alternate value/count shapes");
  assert(T.sumStepsDataPoints({}) === 0, "empty → 0");
  assert(T.sumStepsDataPoints({ dataPoints: [{}, { steps: null }] }) === 0, "malformed points add nothing");
}

console.log("latestWeightKg (tolerant + safe)");
{
  const j = { dataPoints: [
    { weight: { kilograms: 80 }, sampleTime: "2026-02-01T08:00:00Z" },
    { weight: { kilograms: 79.2 }, sampleTime: "2026-02-20T08:00:00Z" },
  ] };
  assert(T.latestWeightKg(j) === 79.2, "returns the most recent sample's kg");
  assert(T.latestWeightKg({ dataPoints: [{ value: { kilograms: 72 }, sampleTime: "2026-01-01T00:00:00Z" }] }) === 72, "handles value.kilograms shape");
  assert(T.latestWeightKg({}) === null, "no data → null (safe no-op)");
  assert(T.latestWeightKg({ dataPoints: [{ weight: { kilograms: 9999 } }] }) === null, "implausible value ignored");
}

console.log("parseDurationSeconds");
{
  assert(T.parseDurationSeconds("27000s") === 27000, "'27000s' -> 27000");
  assert(T.parseDurationSeconds(3600) === 3600, "number passthrough");
  assert(T.parseDurationSeconds("bad") === 0, "junk -> 0");
  assert(T.parseDurationSeconds(null) === 0, "null -> 0");
}

console.log("mapSleepHours (tolerant)");
{
  // Two sessions via explicit activeDuration (7h30m + naps)
  const j = { dataPoints: [
    { sleep: { activeDuration: "27000s" } },  // 7.5h
    { sleep: { activeDuration: "1800s" } },   // 0.5h nap
  ] };
  assert(T.mapSleepHours(j) === 8, "sums activeDuration sessions -> 8h");
  // Fallback: compute from interval start/end
  const j2 = { dataPoints: [{ sleep: { interval: { startTime: "2026-02-01T23:00:00Z", endTime: "2026-02-02T06:30:00Z" } } }] };
  assert(T.mapSleepHours(j2) === 7.5, "computes 7.5h from interval when no duration");
  assert(T.mapSleepHours({}) === 0, "empty -> 0");
  assert(T.mapSleepHours({ dataPoints: [{}, { sleep: null }] }) === 0, "malformed -> 0 (no throw)");
}

console.log("mapWorkoutSessions + workoutHabitMatch");
{
  const json = { dataPoints: [
    { exercise: { exerciseType: "RUNNING", displayName: "Treadmill run", activeDuration: "1800s", interval: { startTime: "2026-02-23T13:00:00Z" }, metricsSummary: { caloriesKcal: 320, steps: "4200" } } },
    { exercise: { exerciseType: "BIKING", displayName: "Morning ride", activeDuration: "2700s", interval: { startTime: "2026-02-23T07:00:00Z" }, metricsSummary: { caloriesKcal: 400 } } },
  ] };
  const s = T.mapWorkoutSessions(json);
  assert(s.length === 2 && s[0].minutes === 30 && s[0].kcal === 320, "sessions flattened (30 min, 320 kcal)");
  // Specific match: a "Treadmill" habit ticks from the treadmill run.
  const m1 = T.workoutHabitMatch("Treadmill", s);
  assert(m1 && /treadmill/i.test(m1.name), "'Treadmill' matches the treadmill run");
  // Synonym: "Run" matches the treadmill run too.
  assert(!!T.workoutHabitMatch("Run", s), "'Run' matches (running/treadmill synonym)");
  // Cycling.
  assert(T.workoutHabitMatch("Cycling", s) && T.workoutHabitMatch("Cycling", s).type === "biking", "'Cycling' matches the bike ride");
  // Generic workout habit matches any session.
  assert(!!T.workoutHabitMatch("Workout", s), "generic 'Workout' matches any session");
  // No match for an unrelated activity.
  assert(T.workoutHabitMatch("Swimming", s) === null, "'Swimming' has no match today");
  assert(T.workoutHabitMatch("Treadmill", []) === null, "no sessions -> null");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
