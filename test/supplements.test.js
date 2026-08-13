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

  // Unknown → null.
  assert(T.supplementTiming("Dragon fruit smoothie") === null, "unrecognised supplement → null");
  assert(T.supplementTiming("") === null, "empty name → null");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
