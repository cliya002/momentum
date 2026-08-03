// Tests the richer full-history CSV export (mood + supplement sections).
// Run: node test/export.test.js
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

console.log("buildAllCsv (mood + supplement sections)");
{
  const st = T.defaultState();
  st.habits = [
    { id: "h1", name: "Vitamin D", category: "Supplements", type: "count", target: 1, archived: false },
    { id: "h2", name: "Magnesium", category: "Supplements", type: "count", target: 2, archived: false },
    { id: "h3", name: "Walk", category: "Fitness", type: "check", target: 1, archived: false },
  ];
  st.completions = {
    "2026-08-01": { h1: 1, h2: 1, h3: 1 },
    "2026-08-02": { h1: 1, h2: 2 },
  };
  st.moods = { "2026-08-01": { mood: 4, updatedAt: 1 }, "2026-08-02": { mood: 2, updatedAt: 1 } };
  st.journal = { "2026-08-02": { text: "tired today", updatedAt: 1 } };
  st.measurements = {};
  st.customMetrics = [];
  T.setState(st);

  const csv = T.buildAllCsv();
  assert(csv.includes("HABIT CHECK-INS"), "has check-ins section");
  assert(csv.includes("MEASUREMENTS"), "has measurements section");
  assert(csv.includes("MOOD & JOURNAL"), "has mood & journal section");
  assert(csv.includes("SUPPLEMENTS"), "has supplements section");

  // Mood + journal rows.
  assert(csv.includes("2026-08-01,4,"), "logs energy value 4 for Aug 1");
  assert(csv.includes("tired today"), "includes journal note text");

  // Supplement dose log rows with taken/target/status.
  assert(csv.includes("Vitamin D,1,1,taken"), "Vitamin D 1/1 -> taken");
  assert(csv.includes("Magnesium,1,2,partial"), "Magnesium 1/2 -> partial");
  assert(csv.includes("Magnesium,2,2,taken"), "Magnesium 2/2 -> taken");

  // A non-supplement habit must not appear in the SUPPLEMENTS section.
  const suppSection = csv.split("SUPPLEMENTS")[1] || "";
  assert(!suppSection.includes("Walk"), "non-supplement habit excluded from supplements section");

  // No supplement/mood data → those sections are omitted (no crash).
  const empty = T.defaultState();
  T.setState(empty);
  const csv2 = T.buildAllCsv();
  assert(csv2.includes("HABIT CHECK-INS"), "empty state still produces check-ins header");
  assert(!csv2.includes("SUPPLEMENTS"), "no supplement habits -> no supplements section");
}

console.log("calorieForecast (dynamic simulation + Mifflin)");
{
  // 500 kcal/day starting deficit, base 2200 @ 200 lb (scales with weight).
  const f = T.calorieForecast({ weightLb: 200, caloriesIn: 2000, baseBurn: 2200, exerciseBurn: 300, metric: false });
  assert(f.deficit === 500, "starting deficit = base+exercise−intake = 500");
  assert(Math.abs(f.perWeekDisp - 1) < 0.05, "~1 lb/week starting rate (" + f.perWeekDisp + ")");
  assert(f.horizons.length === 6, "six horizons (7d,4w,1m,2m,3m,4m)");
  const wk4 = f.horizons.find((h) => h.days === 28);
  // Dynamic: slightly LESS than the naive 4 lb because maintenance falls with weight.
  assert(wk4.changeDisp > 3.6 && wk4.changeDisp < 4.0, "4 weeks a bit under 4 lb, dynamic (" + wk4.changeDisp + ")");
  assert(wk4.projectedDisp > 196 && wk4.projectedDisp < 196.5, "4 weeks ~196.2 lb projected (" + wk4.projectedDisp + ")");
  // Non-linear slowing: 120-day loss is well under 120/28 × the 4-week loss.
  const mo4 = f.horizons.find((h) => h.days === 120);
  assert(mo4.changeDisp > 0 && mo4.changeDisp < wk4.changeDisp * (120 / 28), "loss slows over time (sublinear): " + mo4.changeDisp);

  // Mifflin-St Jeor when a profile is provided.
  // 220 lb ≈ 99.79 kg; BMR = 10*99.79 + 6.25*180 − 5*30 + 5 = 1977.9; ×1.375 ≈ 2720.
  const p = T.calorieForecast({ weightLb: 220, caloriesIn: 2200, exerciseBurn: 0, metric: false,
    profile: { heightCm: 180, age: 30, sex: "male", activity: 1.375 } });
  assert(p.usedProfile === true, "uses the profile (Mifflin)");
  assert(Math.abs(p.startMaintenance - 2720) < 3, "Mifflin maintenance ≈ 2720 (" + p.startMaintenance + ")");
  const pFemale = T.calorieForecast({ weightLb: 220, caloriesIn: 2200, exerciseBurn: 0,
    profile: { heightCm: 180, age: 30, sex: "female", activity: 1.375 } });
  assert(pFemale.startMaintenance < p.startMaintenance, "female BMR lower than male, same stats");
  // Incomplete profile falls back (not Mifflin).
  const pIncomplete = T.calorieForecast({ weightLb: 200, caloriesIn: 2000, baseBurn: 2500, exerciseBurn: 0,
    profile: { heightCm: 0, age: 30, sex: "male", activity: 1.2 } });
  assert(pIncomplete.usedProfile === false, "incomplete profile → falls back to base estimate");

  // Surplus → gaining.
  const g = T.calorieForecast({ weightLb: 180, caloriesIn: 3000, baseBurn: 2200, exerciseBurn: 0, metric: false });
  assert(g.deficit < 0, "intake over burn → surplus");
  assert(g.horizons.find((h) => h.days === 30).projectedDisp > 180, "1 month projects weight gain");

  // Metric mode reports kg.
  const m = T.calorieForecast({ weightLb: 220, caloriesIn: 2000, baseBurn: 2500, exerciseBurn: 0, metric: true });
  assert(m.unit === "kg", "metric mode reports kg");

  assert(T.calorieForecast({ weightLb: null }) === null, "no weight → null");
  assert(T.estimateMaintenanceKcal(200) === 2800, "maintenance estimate ~14 kcal/lb (200→2800)");
  assert(Math.round(T.mifflinBmr(100, 180, 30, "male")) === 1980, "mifflinBmr(100kg,180cm,30,male)=1980");
}

console.log("groupExerciseKcalByDay (per-day exercise calories)");
{
  const dps = [
    { exercise: { interval: { startTime: "2026-08-01T13:00:00Z" }, metricsSummary: { caloriesKcal: 320 } } },
    { exercise: { interval: { startTime: "2026-08-01T18:30:00Z" }, metricsSummary: { caloriesKcal: 180 } } }, // same day → sums
    { exercise: { interval: { startTime: "2026-08-02T07:00:00Z" }, metricsSummary: { caloriesKcal: 250 } } },
    { exercise: { metricsSummary: { caloriesKcal: 99 } } }, // no interval → skipped
    { notExercise: true },
  ];
  const by = T.groupExerciseKcalByDay(dps);
  // Total is timezone-independent (day bucketing uses local time).
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  assert(total === 750, "sums only valid sessions (320+180+250=750, skips no-interval/non-exercise) got " + total);
  assert(Object.keys(by).length >= 1 && Object.keys(by).length <= 3, "buckets sessions by day");
  // civilStartTime.date fallback when startTime is absent (tz-independent).
  const by2 = T.groupExerciseKcalByDay([
    { exercise: { interval: { civilStartTime: { date: { year: 2026, month: 8, day: 3 } } }, metricsSummary: { caloriesKcal: 410 } } },
  ]);
  assert(by2["2026-08-03"] === 410, "uses civilStartTime.date fallback");
  assert(Object.keys(T.groupExerciseKcalByDay([])).length === 0, "empty → {}");
}

console.log("calorieAudit (accuracy diagnostics)");
{
  const has = (r, sub) => r.issues.some((i) => i.msg.toLowerCase().includes(sub));
  // No weight → prompt to log it.
  const a0 = T.calorieAudit({ weightLb: null });
  assert(has(a0, "log your weight"), "no weight → log weight");
  // Implausibly high maintenance (the 5580 case).
  const aHigh = T.calorieAudit({ weightLb: 240, caloriesIn: 1400, baseBurn: 5580, exerciseBurn: 0 });
  assert(has(aHigh, "too high"), "flags implausibly high maintenance");
  assert(has(aHigh, "unrealistic"), "flags unrealistic deficit");
  // Missing height when not using Google.
  const aNoH = T.calorieAudit({ weightLb: 200, caloriesIn: 2000, baseBurn: 2800, exerciseBurn: 0 });
  assert(has(aNoH, "add height"), "suggests adding height/age/sex");
  // Divergence from Google measured.
  const aDiv = T.calorieAudit({ weightLb: 200, caloriesIn: 2000, baseBurn: 3600, exerciseBurn: 0, heightCm: 178, googleAvg: 2400 });
  assert(has(aDiv, "off google") || has(aDiv, "% off"), "flags divergence from Google measured burn");
  assert(aDiv.recommendation.toLowerCase().includes("use google"), "recommends using Google's measured burn");
  // Using Google → clean recommendation.
  const aG = T.calorieAudit({ weightLb: 200, caloriesIn: 2000, baseBurn: 2400, exerciseBurn: 0, usingGoogle: true, googleAvg: 2400 });
  assert(aG.recommendation.toLowerCase().includes("most accurate") || aG.recommendation.includes("✓"), "using Google → most accurate");
  // Big deficit WHILE using Google's measured burn → blame intake, not maintenance.
  const aBig = T.calorieAudit({ weightLb: 240, caloriesIn: 1400, baseBurn: 3842, exerciseBurn: 0, usingGoogle: true, googleAvg: 3842 });
  assert(has(aBig, "intake looks very low"), "big deficit + Google → points at intake, not maintenance");
  assert(!has(aBig, "maintenance/height"), "does NOT blame maintenance/height when using measured burn");
  // Very low intake warning.
  const aLow = T.calorieAudit({ weightLb: 160, caloriesIn: 900, baseBurn: 2200, exerciseBurn: 0, heightCm: 170 });
  assert(has(aLow, "very low"), "flags very low intake");
  // Reasonable inputs → no warnings.
  const aOk = T.calorieAudit({ weightLb: 180, caloriesIn: 2000, baseBurn: 2500, exerciseBurn: 0, heightCm: 178, usingGoogle: true, googleAvg: 2500 });
  assert(aOk.issues.some((i) => i.level === "ok"), "clean inputs → OK");
}

console.log("bmiFrom (BMI + category)");
{
  // 180 lb, 175 cm → 81.6 kg / 1.75² = ~26.7 (Overweight).
  const b = T.bmiFrom(180, 175);
  assert(Math.abs(b.bmi - 26.7) < 0.2, "180lb/175cm ≈ 26.7 (" + b.bmi + ")");
  assert(b.category === "Overweight", "26.7 → Overweight");
  assert(T.bmiFrom(130, 175).category === "Normal", "130lb/175cm → Normal");
  assert(T.bmiFrom(95, 175).category === "Underweight", "95lb/175cm → Underweight");
  assert(T.bmiFrom(230, 170).category === "Obese", "230lb/170cm → Obese");
  assert(T.bmiFrom(180, 0) === null, "no height → null");
  assert(T.bmiFrom(0, 175) === null, "no weight → null");
  assert(T.bmiFrom(180, 400) === null, "implausible height → null");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
