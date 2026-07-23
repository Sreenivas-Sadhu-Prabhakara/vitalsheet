# vitalsheet — corpus citations

All 25 reference facts in `data/bands.js` are quoted verbatim from published sources.
Each fact carries `source_title`, `source_url` and an ISO `verified_on` date. Nothing is
fabricated; where a primary page blocked the automated fetch (HTTP 403), the value was
cross-checked against a secondary authority and the fact records a `note` + `confidence`.

Verified on **2026-07-23**.

## Blood pressure — 2017 ACC/AHA categories (6 facts)

- **AHA — Understanding Blood Pressure Readings.**
  https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings
  Category cut-points (Normal <120 AND <80; Elevated 120–129 AND <80; Stage 1 130–139 OR
  80–89; Stage 2 ≥140 OR ≥90; Hypertensive Crisis >180 and/or >120). Fetched OK.
- **Whelton et al., 2017 ACC/AHA High Blood Pressure Guideline** (Hypertension. 2018;71:e13–e115).
  https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065
  Source of the "individuals with SBP and DBP in 2 categories should be designated to the
  higher BP category" rule. **The journal PDF returned HTTP 403 to the automated fetcher;**
  the rule and all four cut-points were cross-checked against the AHA consumer page above
  and the ACC/AHA guideline synopsis (Ann Intern Med, M17-3203). Confidence: verified.

## Blood glucose — ADA Standards of Care (4 facts)

- **ADA — Glycemic Goals and Hypoglycemia, Standards of Care in Diabetes** (Table 6.2, nonpregnant adults).
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10725808/
  Preprandial capillary plasma glucose 80–130 mg/dL (4.4–7.2 mmol/L); peak postprandial
  <180 mg/dL (<10.0 mmol/L); footnote "More or less stringent glycemic goals may be
  appropriate for individuals. Goals should be individualized…". Fetched OK. The 2026
  Standards of Care carry the same targets (cross-checked, diabetesjournals.org S132).
- **Glucose unit conversion — Diabetes in America (NIH/NIDDK).**
  https://www.ncbi.nlm.nih.gov/books/NBK567981/table/app1.tab2/
  mg/dL ÷ 18.016 = mmol/L (glucose molar mass ≈ 180.16 g/mol).

## Body-mass index — WHO classification (6 facts)

- **WHO — Obesity and overweight fact sheet** (last updated 8 December 2025).
  https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight
  BMI = weight (kg)/height² (m²); overweight is a BMI ≥ 25; obesity is a BMI ≥ 30. Fetched OK.
- **Full class breakdown** (Underweight <18.5; Normal 18.5–24.9; Overweight 25.0–29.9;
  Obesity class I 30.0–34.9; II 35.0–39.9; III ≥40.0) cross-checked against the WHO BMI
  classification tabulated in **NCBI Endotext, NBK278991** and the **World Obesity Federation**.
  vitalsheet stores these as HALF-OPEN intervals `[lo, hi)` so every value lands in exactly
  one class, while displaying WHO's published labels verbatim. Confidence: verified.

## Home-measurement technique (3 facts — Sources page only)

- **AHA — Monitoring Your Blood Pressure at Home.**
  https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home
  Three technique lines quoted verbatim. These appear on the Sources page ONLY and are never
  woven into any calculation or band tag — averages stay plain arithmetic means.

## Staged source snapshots

A PDF snapshot of the AHA guideline highlights flyer captured during verification is saved
under this directory. Live source URLs above are authoritative; snapshots are a fallback for
the 403 paths.
