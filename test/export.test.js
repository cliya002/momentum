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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
