/* ============================================================
   vitalsheet — corpus of cited reference bands & definitions.
   25 hand-verified facts. Every fact carries provenance:
   source_title, source_url, verified_on (ISO), and — where the
   fact is a published rule — a verbatim `label`/`quote`.

   Engine rule: app.js and test/*.test.js read constants FROM
   this corpus. Numbers are NEVER duplicated in app.js.

   Interval convention: BMI bands are HALF-OPEN [lo, hi) so every
   real value lands in exactly one class with no gap or overlap.
   The displayed `label` is the source's published wording verbatim.
   ============================================================ */

const BANDS = [
  /* ---- (a) 6 BP facts — 2017 ACC/AHA categories -------------- */
  {
    id: "bp-normal", mode: "bp", label: "Normal",
    sys_lo: null, sys_hi: 120, sys_cmp: "and", dia_lo: null, dia_hi: 80,
    rule: "Systolic LESS THAN 120 mm Hg AND diastolic LESS THAN 80 mm Hg.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings (2017 ACC/AHA categories)",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "bp-elevated", mode: "bp", label: "Elevated",
    sys_lo: 120, sys_hi: 130, sys_cmp: "and", dia_lo: null, dia_hi: 80,
    rule: "Systolic 120–129 mm Hg AND diastolic LESS THAN 80 mm Hg.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings (2017 ACC/AHA categories)",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "bp-stage1", mode: "bp", label: "Hypertension Stage 1",
    sys_lo: 130, sys_hi: 140, sys_cmp: "or", dia_lo: 80, dia_hi: 90,
    rule: "Systolic 130–139 mm Hg OR diastolic 80–89 mm Hg.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings (2017 ACC/AHA categories)",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "bp-stage2", mode: "bp", label: "Hypertension Stage 2",
    sys_lo: 140, sys_hi: null, sys_cmp: "or", dia_lo: 90, dia_hi: null,
    rule: "Systolic 140 mm Hg or higher OR diastolic 90 mm Hg or higher.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings (2017 ACC/AHA categories)",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "bp-crisis", mode: "bp", label: "Hypertensive Crisis",
    sys_lo: 180, sys_hi: null, sys_cmp: "and/or", dia_lo: 120, dia_hi: null,
    rule: "Systolic HIGHER THAN 180 mm Hg and/or diastolic HIGHER THAN 120 mm Hg.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings (2017 ACC/AHA categories)",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "bp-higher-wins", mode: "bp", label: "Higher category applies",
    rule: "Individuals with systolic and diastolic in 2 categories should be designated to the higher blood pressure category.",
    source_title: "Whelton et al., 2017 ACC/AHA High Blood Pressure Guideline (Hypertension. 2018;71:e13–e115)",
    source_url: "https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065",
    verified_on: "2026-07-23",
    confidence: "verified",
    note: "Primary journal PDF returned HTTP 403 to the automated fetch; the 'higher category' rule and all four category cut-points were cross-checked against the AHA consumer page and the ACC/AHA guideline synopsis."
  },

  /* ---- (b) 4 ADA facts — glycemic goals, nonpregnant adults --- */
  {
    id: "glu-preprandial", mode: "glucose", context: "fasting", label: "in cited ADA target",
    lo: 80, hi: 130, hi_inclusive: true, unit: "mg/dL",
    rule: "Preprandial capillary plasma glucose 80–130 mg/dL (4.4–7.2 mmol/L).",
    source_title: "ADA — Glycemic Goals and Hypoglycemia, Standards of Care in Diabetes (Table 6.2, nonpregnant adults)",
    source_url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10725808/",
    verified_on: "2026-07-23"
  },
  {
    id: "glu-postprandial", mode: "glucose", context: "post-meal", label: "in cited ADA target",
    lo: null, hi: 180, unit: "mg/dL",
    rule: "Peak postprandial capillary plasma glucose <180 mg/dL (<10.0 mmol/L).",
    source_title: "ADA — Glycemic Goals and Hypoglycemia, Standards of Care in Diabetes (Table 6.2, nonpregnant adults)",
    source_url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10725808/",
    verified_on: "2026-07-23"
  },
  {
    id: "glu-individualized", mode: "glucose", label: "targets are individualized",
    quote: "More or less stringent glycemic goals may be appropriate for individuals. Goals should be individualized based on duration of diabetes, age/life expectancy, comorbid conditions, known CVD or advanced microvascular complications, hypoglycemia unawareness, and individual patient considerations.",
    source_title: "ADA — Glycemic Goals and Hypoglycemia, Standards of Care in Diabetes (Table 6.2 footnotes)",
    source_url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10725808/",
    verified_on: "2026-07-23"
  },
  {
    id: "glu-conversion", mode: "glucose", label: "mg/dL → mmol/L",
    factor: 18.016,
    rule: "Divide mg/dL by 18.016 to obtain mmol/L (glucose molar mass ≈ 180.16 g/mol).",
    source_title: "Diabetes in America (NIH/NIDDK), glucose unit-conversion table",
    source_url: "https://www.ncbi.nlm.nih.gov/books/NBK567981/table/app1.tab2/",
    verified_on: "2026-07-23"
  },

  /* ---- (c) 6 WHO BMI classes — half-open [lo, hi) ------------- */
  {
    id: "bmi-underweight", mode: "bmi", label: "Underweight",
    lo: null, hi: 18.5,
    rule: "BMI less than 18.5 kg/m².",
    source_title: "WHO BMI classification (adults) — cross-checked (see note)",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    verified_on: "2026-07-23", confidence: "verified",
    note: "WHO fact sheet anchors overweight ≥25 and obesity ≥30; the full class breakdown was cross-checked against the WHO BMI classification tabulated in NCBI Endotext (NBK278991) and the World Obesity Federation."
  },
  {
    id: "bmi-normal", mode: "bmi", label: "Normal range",
    lo: 18.5, hi: 25.0,
    rule: "BMI 18.5 to less than 25.0 kg/m².",
    source_title: "WHO BMI classification (adults) — cross-checked (see note)",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    verified_on: "2026-07-23", confidence: "verified"
  },
  {
    id: "bmi-overweight", mode: "bmi", label: "Overweight",
    lo: 25.0, hi: 30.0,
    rule: "BMI 25.0 to less than 30.0 kg/m² (WHO: overweight / pre-obesity).",
    source_title: "WHO — Obesity and overweight fact sheet (overweight is a BMI ≥ 25)",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    verified_on: "2026-07-23", confidence: "verified"
  },
  {
    id: "bmi-obese1", mode: "bmi", label: "Obesity class I",
    lo: 30.0, hi: 35.0,
    rule: "BMI 30.0 to less than 35.0 kg/m².",
    source_title: "WHO BMI classification (adults) — cross-checked (see note)",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    verified_on: "2026-07-23", confidence: "verified"
  },
  {
    id: "bmi-obese2", mode: "bmi", label: "Obesity class II",
    lo: 35.0, hi: 40.0,
    rule: "BMI 35.0 to less than 40.0 kg/m².",
    source_title: "WHO BMI classification (adults) — cross-checked (see note)",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    verified_on: "2026-07-23", confidence: "verified"
  },
  {
    id: "bmi-obese3", mode: "bmi", label: "Obesity class III",
    lo: 40.0, hi: null,
    rule: "BMI 40.0 kg/m² or higher.",
    source_title: "WHO BMI classification (adults) — cross-checked (see note)",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    verified_on: "2026-07-23", confidence: "verified"
  },

  /* ---- (d) 6 unit / field definitions ------------------------ */
  {
    id: "unit-mmhg", mode: "unit", label: "mmHg",
    rule: "Millimetres of mercury — the unit for systolic and diastolic blood pressure.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "unit-bpm", mode: "unit", label: "bpm",
    rule: "Beats per minute — resting pulse rate reported by many home cuffs.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "unit-mgdl", mode: "unit", label: "mg/dL",
    rule: "Milligrams per decilitre — glucose unit used in the United States, India and elsewhere.",
    source_title: "ADA — Glycemic Goals and Hypoglycemia, Standards of Care in Diabetes",
    source_url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10725808/",
    verified_on: "2026-07-23"
  },
  {
    id: "unit-mmol", mode: "unit", label: "mmol/L",
    rule: "Millimoles per litre — glucose unit used in the UK, Canada and much of Europe.",
    source_title: "ADA — Glycemic Goals and Hypoglycemia, Standards of Care in Diabetes",
    source_url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10725808/",
    verified_on: "2026-07-23"
  },
  {
    id: "unit-spo2", mode: "unit", label: "SpO₂ %",
    rule: "Peripheral oxygen saturation, percent — an optional pulse-oximeter reading, logged as typed.",
    source_title: "American Heart Association — Understanding Blood Pressure Readings (unit reference)",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
    verified_on: "2026-07-23"
  },
  {
    id: "unit-bmi", mode: "unit", label: "BMI = kg/m²",
    rule: "Body mass index is weight in kilograms divided by height in metres squared: kg/m².",
    source_title: "WHO — Obesity and overweight fact sheet (BMI is weight (kg)/height² (m²))",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    verified_on: "2026-07-23"
  },

  /* ---- (e) 3 AHA home-measurement technique lines ------------ */
  /* Shown VERBATIM on the Sources page ONLY. Never woven into any
     computation or band tag — the averages stay plain arithmetic means. */
  {
    id: "tech-prep", mode: "technique",
    quote: "Don't smoke, drink caffeinated beverages or exercise within 30 minutes before taking your blood pressure.",
    source_title: "American Heart Association — Monitoring Your Blood Pressure at Home",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home",
    verified_on: "2026-07-23"
  },
  {
    id: "tech-rest", mode: "technique",
    quote: "Allow at least five minutes of quiet rest before measurements. Don't talk or use the phone.",
    source_title: "American Heart Association — Monitoring Your Blood Pressure at Home",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home",
    verified_on: "2026-07-23"
  },
  {
    id: "tech-timing", mode: "technique",
    quote: "Take the readings at the same time each day. Talk with your health care professional about how often to take your blood pressure.",
    source_title: "American Heart Association — Monitoring Your Blood Pressure at Home",
    source_url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home",
    verified_on: "2026-07-23"
  }
];

if (typeof module !== "undefined") module.exports = { BANDS };
