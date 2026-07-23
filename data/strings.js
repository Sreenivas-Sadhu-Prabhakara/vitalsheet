/* ============================================================
   vitalsheet — dynamic UI strings.
   Kept in one module so a self-test can assert the never-interpret
   rule: NO string here may match /should|improv|worsen|risk|danger|
   normal for you/i. The app renders only cited band wording and
   plain arithmetic; it never issues a verdict.
   ============================================================ */

const STRINGS = {
  modeBP: "Blood pressure",
  modeGlucose: "Blood glucose",
  modeWeight: "Weight & BMI",

  addBP: "Add BP reading",
  addGlucose: "Add glucose reading",
  addWeight: "Add weight",

  avg7: "7-day average of logged readings",
  avg30: "30-day average of logged readings",
  avgNote: "Plain arithmetic mean of exactly the readings you logged — not a diagnosis.",

  emptyBP: "No blood-pressure readings yet. Add one above to start the sheet.",
  emptyGlucose: "No glucose readings yet. Add one above to start the sheet.",
  emptyWeight: "No weight entries yet. Add one above to start the sheet.",

  bandsOn: "Band tags shown",
  bandsOff: "Band tags hidden",
  bandsToggleLabel: "Show cited reference-band tags",

  noCitedTarget: "no cited target for random",
  targetCaveat: "The ADA states glycemic targets are individualized.",

  savedReading: "Reading saved.",
  deletedReading: "Reading deleted.",
  editedReading: "Reading updated.",

  exportCSV: "Export CSV",
  exportJSON: "Back up all data (JSON)",
  importJSON: "Restore from JSON backup",
  eraseAll: "Erase everything",
  eraseConfirm: "Erase every reading in this profile? Export a backup first — this cannot be undone.",

  printSheet: "Print / save as PDF",
  clinicHeading: "Clinic-ready trend sheet",
  clinicianNotes: "Clinician notes",

  offlineBadge: "Runs fully offline",
  neverLeaves: "Readings never leave this browser — the page cannot send data anywhere."
};

if (typeof module !== "undefined") module.exports = { STRINGS };
