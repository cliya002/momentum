// Tests research-based supplement timing recommendations.
// Run: node test/supplements.test.js
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

// Rough "evening" vs "morning" bucket from an HH:MM string.
function slot(hhmm) {
  if (hhmm == null) return "any";
  const [h] = hhmm.split(":").map(Number);
  return h < 11 ? "morning" : h < 17 ? "afternoon" : "evening";
}

console.log("supplementTiming (evidence-based timing)");
{
  // Evening / sleep-supporting.
  assert(slot(T.supplementTiming("Magnesium Glycinate (Thorne)").time) === "evening", "magnesium glycinate → evening");
  assert(slot(T.supplementTiming("Ashwagandha (Momentous)").time) === "evening", "ashwagandha → evening");
  assert(slot(T.supplementTiming("Melatonin 3mg").time) === "evening", "melatonin → evening");

  // Morning.
  assert(slot(T.supplementTiming("Vitamin D3 5000 IU").time) === "morning", "vitamin D → morning");
  assert(slot(T.supplementTiming("B-Complex").time) === "morning", "B-complex → morning");
  assert(slot(T.supplementTiming("Iron bisglycinate").time) === "morning", "iron → morning");
  assert(slot(T.supplementTiming("Caffeine + L-Theanine").time) === "morning", "caffeine → morning");

  // With dinner / meal.
  assert(slot(T.supplementTiming("Zinc Picolinate 15mg (Thorne)").time) === "evening", "zinc → with dinner (evening)");
  assert(slot(T.supplementTiming("Omega-3 fish oil").time) === "evening", "omega-3 → with a meal");
  // A combo (turmeric + ACV) is ambiguous — just require a valid, food-linked rec.
  const combo = T.supplementTiming("Cinnamon Turmeric ACV");
  assert(combo && combo.reason && /meal|food|before/i.test(combo.reason), "turmeric/ACV combo → a food-linked recommendation");

  // Iron bisglycinate must be treated as IRON (morning), not magnesium.
  assert(slot(T.supplementTiming("Iron bisglycinate").time) === "morning", "iron bisglycinate → iron, morning (not magnesium)");

  // Timing-flexible → no specific time.
  assert(T.supplementTiming("Creatine Monohydrate").time === null, "creatine → any time (no fixed time)");
  assert(T.supplementTiming("Collagen peptides").time === null, "collagen → any time");
  assert(T.supplementTiming("Whey protein").time === null, "protein → flexible");

  // Every recognised supplement has a label + reason.
  const r = T.supplementTiming("Vitamin D");
  assert(r.label && r.reason && r.reason.length > 10, "returns a label and a reason");

  // Newly added recognitions.
  assert(slot(T.supplementTiming("Rhodiola Rosea").time) === "morning", "rhodiola → morning");
  assert(slot(T.supplementTiming("Lion's Mane").time) === "morning", "lion's mane → morning");
  assert(slot(T.supplementTiming("Berberine").time) === "evening", "berberine → with meals (evening bucket)");
  assert(T.supplementTiming("NAC").time === null, "NAC → flexible timing");
  assert(slot(T.supplementTiming("Melatonin").time) === "evening", "melatonin → evening");
  assert(slot(T.supplementTiming("Calcium citrate").time) === "evening", "calcium → with a meal (evening)");
  assert(slot(T.supplementTiming("CoQ10 ubiquinol").time) === "morning", "coq10 → morning");

  // Fat-loss support matchers.
  assert(slot(T.supplementTiming("Green tea extract (EGCG)").time) === "morning", "green tea → morning");
  assert(slot(T.supplementTiming("Cayenne / Capsaicin").time) === "evening", "capsaicin → with meals");
  assert(slot(T.supplementTiming("L-Carnitine").time) === "morning", "l-carnitine → with a carb meal (morning)");
  assert(slot(T.supplementTiming("Yohimbine HCl").time) === "morning", "yohimbine → fasted morning pre-cardio");
  assert(/heart|anxiety|ssri/i.test(T.supplementTiming("Yohimbine HCl").reason), "yohimbine flags cardiovascular/anxiety caution");
  // Glucomannan must NOT be swallowed by the generic fiber matcher.
  const gluco = T.supplementTiming("Glucomannan");
  assert(gluco.time === "07:45" && /before meals/i.test(gluco.label), "glucomannan → before meals (its own rule, not generic fiber)");

  // Unknown → null.
  assert(T.supplementTiming("Dragon fruit smoothie") === null, "unrecognised supplement → null");
  assert(T.supplementTiming("") === null, "empty name → null");
}

console.log("supplementSafety (safe / needs research / use with care)");
{
  const tier = (name) => { const s = T.supplementSafety(name); return s ? s.tier : null; };
  // Well-studied → safe.
  assert(tier("Vitamin D3") === "safe", "vitamin D → safe");
  assert(tier("Magnesium Glycinate") === "safe", "magnesium → safe");
  assert(tier("Creatine") === "safe", "creatine → safe");
  assert(tier("Omega-3 fish oil") === "safe", "omega-3 → safe");
  assert(tier("Whey protein") === "safe", "protein → safe");
  // Higher-risk → caution.
  assert(tier("Yohimbine HCl") === "caution", "yohimbine → use with care");
  assert(tier("Berberine") === "caution", "berberine → use with care (interactions)");
  // Needs more research / caveats → moderate.
  assert(tier("Ashwagandha") === "moderate", "ashwagandha → needs more research");
  assert(tier("Lion's Mane") === "moderate", "lion's mane → needs more research");
  assert(tier("Iron bisglycinate") === "moderate", "iron → moderate (test levels)");
  assert(tier("Green tea extract") === "moderate", "green tea → moderate (liver at high dose)");
  assert(tier("Glucomannan") === "moderate", "glucomannan → moderate (water/choking)");
  // Every tier carries a short label.
  const s = T.supplementSafety("Yohimbine HCl");
  assert(s.label && /heart|bp|anxiety|ssri/i.test(s.label), "caution label explains the risk");
  // Unknown → null.
  assert(T.supplementSafety("Dragon fruit smoothie") === null, "unknown → null safety");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
