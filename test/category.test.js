// Tests category customization: categoryMeta persistence through normalize,
// merge (tied to whichever categories win), and the categoryMeta() accessor.
// Run: node test/category.test.js
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

console.log("categoryMeta normalize");
{
  const st = T.normalizeState({
    habits: [],
    categories: ["Work", "Home"],
    categoryMeta: { Work: { color: "#123456", icon: "💼" }, Home: { color: "not-a-color", icon: "🏠" } },
  });
  assert(st.categoryMeta.Work.color === "#123456", "keeps a valid color");
  assert(st.categoryMeta.Work.icon === "💼", "keeps an icon");
  assert(st.categoryMeta.Home.icon === "🏠", "keeps home icon even with odd color string");
}
{
  const st = T.normalizeState({ habits: [], categoryMeta: { X: {} } });
  assert(!st.categoryMeta.X, "empty meta entry dropped");
}

console.log("categoryMeta() accessor with defaults");
{
  const st = T.normalizeState({ habits: [], categories: ["Fitness", "Mystery"], categoryMeta: {} });
  T.setState(st);
  const fit = T.categoryMeta("Fitness");
  assert(fit.icon === "🏋️" && /^#/.test(fit.color), "default meta for known category");
  const un = T.categoryMeta("Mystery");
  assert(un.icon === "🏷️" && un.color === "#64748b", "fallback meta for unknown category");
}
{
  const st = T.normalizeState({ habits: [], categories: ["Fitness"], categoryMeta: { Fitness: { color: "#ff0000", icon: "🔥" } } });
  T.setState(st);
  const fit = T.categoryMeta("Fitness");
  assert(fit.color === "#ff0000" && fit.icon === "🔥", "custom meta overrides default");
}

console.log("categoryMeta merge follows winning categories");
{
  const local = T.normalizeState({ habits: [], categories: ["A"], categoryMeta: { A: { color: "#111111", icon: "1" } }, categoriesUpdatedAt: 100 });
  const remote = T.normalizeState({ habits: [], categories: ["B"], categoryMeta: { B: { color: "#222222", icon: "2" } }, categoriesUpdatedAt: 200 });
  const merged = T.mergeStates(local, remote);
  assert(merged.categories[0] === "B", "newer categoriesUpdatedAt wins the list");
  assert(merged.categoryMeta.B && merged.categoryMeta.B.color === "#222222", "meta follows the winning side");
  assert(!merged.categoryMeta.A, "losing side's meta is not merged in");
}
{
  const local = T.normalizeState({ habits: [], categories: ["A"], categoryMeta: { A: { color: "#111111", icon: "1" } }, categoriesUpdatedAt: 300 });
  const remote = T.normalizeState({ habits: [], categories: ["B"], categoryMeta: { B: { color: "#222222", icon: "2" } }, categoriesUpdatedAt: 200 });
  const merged = T.mergeStates(local, remote);
  assert(merged.categories[0] === "A" && merged.categoryMeta.A, "local wins when it has newer timestamp");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
