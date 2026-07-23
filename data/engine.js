/* ============================================================
   vitalsheet — pure computation engine.
   No DOM, no I/O. Same module runs in the browser (global) and in
   node --test. Every classifier reads its cut-points FROM the BANDS
   corpus so a number is never duplicated between engine and data.

   Design rule (never-interpret): every classifier returns a member
   of a CLOSED label set — the published band name, verbatim. The
   engine never emits a verdict ("improving", "risk", "is this bad").
   ============================================================ */

(function (root) {
  "use strict";

  const BANDS = (typeof require !== "undefined")
    ? require("./bands.js").BANDS
    : root.BANDS;

  function band(id) {
    const b = BANDS.find(function (x) { return x.id === id; });
    if (!b) throw new Error("unknown band id: " + id);
    return b;
  }

  /* ---- rounding: round-half-up for non-negative reals --------- */
  function roundHalfUp(x, dp) {
    const f = Math.pow(10, dp || 0);
    return Math.round((x * f) + Number.EPSILON) / f;
  }

  /* ---- BP category (2017 ACC/AHA) — higher category wins ------- */
  // Cut-points pulled from the corpus; cascade top-down so a reading
  // that qualifies for two categories takes the higher one.
  function bpCategory(sys, dia) {
    const crisis = band("bp-crisis");
    const stage2 = band("bp-stage2");
    const stage1 = band("bp-stage1");
    const elevated = band("bp-elevated");
    // crisis: sys > 180 and/or dia > 120
    if (sys > crisis.sys_lo || dia > crisis.dia_lo) return crisis.label;
    // stage 2: sys >= 140 or dia >= 90
    if (sys >= stage2.sys_lo || dia >= stage2.dia_lo) return stage2.label;
    // stage 1: sys >= 130 or dia >= 80
    if (sys >= stage1.sys_lo || dia >= stage1.dia_lo) return stage1.label;
    // elevated: sys 120–129 and dia < 80
    if (sys >= elevated.sys_lo) return elevated.label;
    return band("bp-normal").label;
  }

  /* ---- WHO BMI class — half-open [lo, hi) intervals ----------- */
  function whoBmiClass(bmiValue) {
    // classification always uses the UNROUNDED value
    const classes = ["bmi-underweight", "bmi-normal", "bmi-overweight",
      "bmi-obese1", "bmi-obese2", "bmi-obese3"];
    for (let i = 0; i < classes.length; i++) {
      const b = band(classes[i]);
      const geLo = (b.lo === null) || (bmiValue >= b.lo);
      const ltHi = (b.hi === null) || (bmiValue < b.hi);
      if (geLo && ltHi) return b.label;
    }
    throw new Error("bmi value outside all classes: " + bmiValue);
  }

  /* ---- glucose vs cited ADA target (context-dependent) -------- */
  // Returns one of the closed labels, or null when no cited target
  // exists for the context (e.g. 'random') — the UI then shows none.
  function glucoseTarget(mgdl, context) {
    let b = null;
    if (context === "fasting") b = band("glu-preprandial");
    else if (context === "post-meal") b = band("glu-postprandial");
    else return null; // 'random' — no single cited target; do not classify
    const geLo = (b.lo === null) || (mgdl >= b.lo);
    const leHi = (b.hi === null) || (mgdl < b.hi);
    return (geLo && leHi) ? "in cited ADA target" : "outside cited ADA target";
  }

  /* ---- BMI value (display) ----------------------------------- */
  function bmi(kg, metres) {
    return roundHalfUp(kg / (metres * metres), 1);
  }

  /* ---- glucose unit conversion ------------------------------- */
  function mgdlToMmol(mgdl) {
    const f = band("glu-conversion").factor; // 18.016, from corpus
    return roundHalfUp(mgdl / f, 1);
  }

  /* ---- arithmetic mean, round-half-up to integer ------------- */
  function avgInt(values) {
    if (!values.length) return null;
    const sum = values.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((sum / values.length) + Number.EPSILON);
  }

  /* ---- ISO date helpers (clamp/leap-safe via UTC epoch) ------- */
  function parseISO(s) {
    // s = 'YYYY-MM-DD' — build a UTC date to avoid TZ drift
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new Error("bad ISO date: " + s);
    return Date.UTC(+m[1], (+m[2]) - 1, +m[3]);
  }
  function daysBefore(iso, n) {
    return parseISO(iso) - n * 86400000;
  }

  // Mean of readings within the trailing N-day window ending at asOf
  // (inclusive). window start = asOf - (N-1) days. `byDate` maps
  // 'YYYY-MM-DD' -> value. Rounds to integer like a mmHg average.
  function avgWindow(asOf, byDate, windowDays) {
    const cutoff = daysBefore(asOf, windowDays - 1);
    const asOfMs = parseISO(asOf);
    const vals = [];
    Object.keys(byDate).forEach(function (d) {
      const t = parseISO(d);
      if (t >= cutoff && t <= asOfMs) vals.push(byDate[d]);
    });
    return avgInt(vals);
  }
  function avg7dSys(asOf, byDate) { return avgWindow(asOf, byDate, 7); }
  function avg30dSys(asOf, byDate) { return avgWindow(asOf, byDate, 30); }

  /* ---- RFC-4180 CSV ------------------------------------------ */
  function csvField(v) {
    const s = String(v == null ? "" : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csvRow(fields) { return fields.map(csvField).join(","); }
  function csvDoc(rows) { return rows.map(csvRow).join("\r\n") + "\r\n"; }

  /* ---- closed label set (never-interpret guard) -------------- */
  const LABELS = Object.freeze([
    "Normal", "Elevated", "Hypertension Stage 1",
    "Hypertension Stage 2", "Hypertensive Crisis",
    "Underweight", "Normal range", "Overweight",
    "Obesity class I", "Obesity class II", "Obesity class III",
    "in cited ADA target", "outside cited ADA target"
  ]);

  const API = {
    BANDS: BANDS, band: band, LABELS: LABELS,
    roundHalfUp: roundHalfUp,
    bpCategory: bpCategory, whoBmiClass: whoBmiClass,
    glucoseTarget: glucoseTarget, bmi: bmi, mgdlToMmol: mgdlToMmol,
    avgInt: avgInt, avgWindow: avgWindow,
    avg7dSys: avg7dSys, avg30dSys: avg30dSys,
    parseISO: parseISO, daysBefore: daysBefore,
    csvField: csvField, csvRow: csvRow, csvDoc: csvDoc
  };

  if (typeof module !== "undefined") module.exports = API;
  else root.VS = API;
})(typeof self !== "undefined" ? self : this);
