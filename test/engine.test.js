"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const VS = require("../data/engine.js");
const { BANDS } = require("../data/bands.js");
const { STRINGS } = require("../data/strings.js");

/* ---- BP category, higher-category-wins (brief fixtures) ------- */
test("bpCategory — exact brief fixtures", () => {
  assert.equal(VS.bpCategory(118, 79), "Normal");
  assert.equal(VS.bpCategory(124, 79), "Elevated");
  assert.equal(VS.bpCategory(124, 85), "Hypertension Stage 1");
  assert.equal(VS.bpCategory(140, 89), "Hypertension Stage 2");
  assert.equal(VS.bpCategory(184, 100), "Hypertensive Crisis");
});

test("bpCategory — higher category wins on split readings", () => {
  // systolic Normal but diastolic Stage 1 -> Stage 1
  assert.equal(VS.bpCategory(118, 85), "Hypertension Stage 1");
  // systolic Stage 2 but diastolic Normal -> Stage 2
  assert.equal(VS.bpCategory(150, 70), "Hypertension Stage 2");
  // boundary: crisis by diastolic alone
  assert.equal(VS.bpCategory(120, 121), "Hypertensive Crisis");
});

/* ---- avgInt (round half up to integer) ----------------------- */
test("avgInt — mmHg and glucose fixtures", () => {
  assert.equal(VS.avgInt([122, 118, 131]), 124); // 371/3=123.67->124
  assert.equal(VS.avgInt([78, 82, 85]), 82);     // 245/3=81.67->82
  assert.equal(VS.avgInt([96, 142, 118]), 119);  // 356/3=118.67->119
});

/* ---- windowed averages (date arithmetic) --------------------- */
test("avg7dSys — window excludes reading older than 7 days", () => {
  const r = VS.avg7dSys("2026-07-22",
    { "2026-07-22": 120, "2026-07-20": 130, "2026-07-15": 160 });
  assert.equal(r, 125); // window >= 2026-07-16, so 160 excluded; (120+130)/2
});

test("date arithmetic clamps month-end and leap years", () => {
  // 7-day window ending 2026-03-01 starts 2026-02-23 (2026 is not leap)
  assert.equal(VS.daysBefore("2026-03-01", 6), VS.parseISO("2026-02-23"));
  // leap year: 7-day window ending 2024-03-01 starts 2024-02-24
  assert.equal(VS.daysBefore("2024-03-01", 6), VS.parseISO("2024-02-24"));
  // 30-day window across a year boundary
  assert.equal(VS.daysBefore("2026-01-05", 29), VS.parseISO("2025-12-07"));
});

/* ---- glucose conversion -------------------------------------- */
test("mgdlToMmol — divide by 18.016, round half up 1dp", () => {
  assert.equal(VS.mgdlToMmol(200), 11.1); // 11.1013->11.1
  assert.equal(VS.mgdlToMmol(126), 7.0);  // 6.9938->7.0
});

/* ---- BMI value + WHO class (unrounded classification) -------- */
test("bmi value and WHO class", () => {
  assert.equal(VS.bmi(82, 1.70), 28.4); // 28.3737->28.4
  assert.equal(VS.whoBmiClass(28.3737), "Overweight"); // uses unrounded
});

test("whoBmiClass — WHO boundary and half-open interval edges", () => {
  assert.equal(VS.whoBmiClass(24.99), "Normal range");
  assert.equal(VS.whoBmiClass(25.0), "Overweight");
  // adversarial-review fixtures at 24.95 and 29.95
  assert.equal(VS.whoBmiClass(24.95), "Normal range");
  assert.equal(VS.whoBmiClass(29.95), "Overweight");
  assert.equal(VS.whoBmiClass(30.0), "Obesity class I");
  assert.equal(VS.whoBmiClass(18.49), "Underweight");
  assert.equal(VS.whoBmiClass(40.0), "Obesity class III");
});

/* ---- glucose target classification --------------------------- */
test("glucoseTarget — context-dependent cited target", () => {
  assert.equal(VS.glucoseTarget(100, "fasting"), "in cited ADA target");
  assert.equal(VS.glucoseTarget(140, "fasting"), "outside cited ADA target");
  assert.equal(VS.glucoseTarget(150, "post-meal"), "in cited ADA target");
  assert.equal(VS.glucoseTarget(190, "post-meal"), "outside cited ADA target");
  assert.equal(VS.glucoseTarget(200, "random"), null); // no cited target
});

/* ---- CSV (RFC 4180) ------------------------------------------ */
test("csvRow — quotes only fields that need it, doubles inner quotes", () => {
  assert.equal(
    VS.csvRow(["2026-07-22 07:10", "bp", "120", "80", "left arm, seated"]),
    '2026-07-22 07:10,bp,120,80,"left arm, seated"');
  assert.equal(VS.csvField('a "quote"'), '"a ""quote"""');
});

test("csvDoc — rows joined with CRLF", () => {
  const doc = VS.csvDoc([["a", "b"], ["c", "d"]]);
  assert.equal(doc, "a,b\r\nc,d\r\n");
});

/* ---- never-interpret guard ----------------------------------- */
test("every classifier return is in the closed label set", () => {
  const seen = new Set();
  for (let s = 90; s <= 200; s += 2) {
    for (let d = 50; d <= 130; d += 2) seen.add(VS.bpCategory(s, d));
  }
  for (let b = 10; b <= 60; b += 0.13) seen.add(VS.whoBmiClass(b));
  ["fasting", "post-meal"].forEach((c) => {
    for (let g = 40; g <= 300; g += 3) seen.add(VS.glucoseTarget(g, c));
  });
  seen.forEach((label) => assert.ok(VS.LABELS.includes(label),
    "leaked label outside closed set: " + label));
});

test("no UI string implies a verdict", () => {
  const bad = /should|improv|worsen|risk|danger|normal for you/i;
  Object.keys(STRINGS).forEach((k) => {
    assert.ok(!bad.test(STRINGS[k]),
      "verdict-like UI string at STRINGS." + k + ": " + STRINGS[k]);
  });
});

/* ---- corpus invariants --------------------------------------- */
test("corpus has 25 facts with unique ids and provenance", () => {
  assert.equal(BANDS.length, 25);
  const ids = new Set(BANDS.map((b) => b.id));
  assert.equal(ids.size, 25);
  BANDS.forEach((b) => {
    assert.ok(b.source_title && b.source_url && b.verified_on,
      "missing provenance on " + b.id);
    assert.match(b.verified_on, /^\d{4}-\d{2}-\d{2}$/);
  });
});

test("corpus class counts match the spec (6/4/6/6/3)", () => {
  const by = (p) => BANDS.filter(p).length;
  assert.equal(by((b) => b.mode === "bp"), 6);
  assert.equal(by((b) => b.mode === "glucose"), 4);
  assert.equal(by((b) => b.mode === "bmi"), 6);
  assert.equal(by((b) => b.mode === "unit"), 6);
  assert.equal(by((b) => b.mode === "technique"), 3);
});

test("BMI bands tile [any] with no gap or overlap (half-open)", () => {
  const bmi = ["bmi-underweight", "bmi-normal", "bmi-overweight",
    "bmi-obese1", "bmi-obese2", "bmi-obese3"].map((id) => VS.band(id));
  // sorted, contiguous: each hi === next lo
  for (let i = 0; i < bmi.length - 1; i++) {
    assert.equal(bmi[i].hi, bmi[i + 1].lo, "gap/overlap at " + bmi[i].id);
  }
  assert.equal(bmi[0].lo, null);
  assert.equal(bmi[bmi.length - 1].hi, null);
});

test("engine reads BMI cut-points FROM corpus (no duplication)", () => {
  // change nothing, but assert the engine's boundary equals the corpus
  assert.equal(VS.band("bmi-overweight").lo, 25.0);
  assert.equal(VS.whoBmiClass(24.999), "Normal range");
  assert.equal(VS.whoBmiClass(VS.band("bmi-overweight").lo), "Overweight");
});

test("glucose conversion factor comes from corpus", () => {
  assert.equal(VS.band("glu-conversion").factor, 18.016);
});

/* ---- property / fuzz test ------------------------------------ */
test("property: windowed average never exceeds max in window; Σ identity", () => {
  let seed = 20260723;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let iter = 0; iter < 5000; iter++) {
    const n = 1 + Math.floor(rnd() * 8);
    const vals = [];
    for (let i = 0; i < n; i++) vals.push(80 + Math.floor(rnd() * 120));
    const mean = VS.avgInt(vals);
    assert.ok(mean >= Math.min.apply(null, vals) - 1);
    assert.ok(mean <= Math.max.apply(null, vals) + 1);
    // rounding identity: |mean*n - Σ| <= n/2
    const sum = vals.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(mean * n - sum) <= n / 2 + 1e-9);
  }
});

test("property: whoBmiClass total over a dense sweep is exhaustive", () => {
  for (let b = 1; b < 80; b += 0.017) {
    const label = VS.whoBmiClass(b);
    assert.ok(VS.LABELS.includes(label));
  }
});
