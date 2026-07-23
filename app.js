/* ============================================================
   vitalsheet — app logic. No inline handlers (CSP forbids them);
   every listener is wired here. All maths comes from data/engine.js
   (global VS); all band wording from data/bands.js (global BANDS);
   all dynamic copy from data/strings.js (global STRINGS).

   Scope note: this build ships a single local profile. Multi-profile
   was the pre-declared first trim from the brief's trim order.
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "vitalsheet:v1";
  var PREF_KEY = "vitalsheet:prefs";
  var $ = function (id) { return document.getElementById(id); };

  /* ---- state ---- */
  var state = load();               // { bp:[], glucose:[], weight:[], height:null }
  var prefs = loadPrefs();          // { bands:bool, mmol:bool, showBmi:bool }
  var mode = "bp";
  var editId = null;

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== "object") s = {};
      s.bp = Array.isArray(s.bp) ? s.bp : [];
      s.glucose = Array.isArray(s.glucose) ? s.glucose : [];
      s.weight = Array.isArray(s.weight) ? s.weight : [];
      s.height = (typeof s.height === "number") ? s.height : null;
      return s;
    } catch (e) { return { bp: [], glucose: [], weight: [], height: null }; }
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
      return { bands: p.bands !== false, mmol: !!p.mmol, showBmi: p.showBmi !== false };
    } catch (e) { return { bands: true, mmol: false, showBmi: true }; }
  }
  function savePrefs() { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }

  /* ---- helpers ---- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function nowHM() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function byDateDesc(a, b) {
    var ka = a.date + "T" + (a.time || "00:00"), kb = b.date + "T" + (b.time || "00:00");
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  }
  // latest value per calendar day -> map for windowed averages
  function dailyMap(rows, pick) {
    var m = {};
    rows.slice().sort(function (a, b) {
      return (a.date + a.time) < (b.date + b.time) ? -1 : 1; // ascending: last write wins
    }).forEach(function (r) { var v = pick(r); if (v != null && !isNaN(v)) m[r.date] = v; });
    return m;
  }

  /* ============================================================
     mode switching
     ============================================================ */
  function setMode(m) {
    mode = m;
    cancelEdit();
    ["bp", "glucose", "weight"].forEach(function (x) {
      var tab = $("tab-" + x);
      var on = x === m;
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".mode-fields").forEach(function (el) {
      el.hidden = el.getAttribute("data-mode") !== m;
    });
    $("mmolWrap").hidden = m !== "glucose";
    $("unitWrap").hidden = m !== "weight";
    // prefill height if known
    if (m === "weight" && state.height) $("fHeight").value = state.height;
    updateReadout();
    render();
  }

  /* ============================================================
     live seven-segment readout
     ============================================================ */
  function updateReadout() {
    var main = "---", unit = "mmHg";
    if (mode === "bp") {
      var s = $("fSys").value, d = $("fDia").value;
      main = (s || "--") + "/" + (d || "--");
      unit = "mmHg";
    } else if (mode === "glucose") {
      var g = $("fGlu").value;
      if (prefs.mmol && g) { main = VS.mgdlToMmol(+g).toFixed(1); unit = "mmol/L"; }
      else { main = g || "---"; unit = "mg/dL"; }
    } else {
      var w = $("fWeight").value;
      main = w || "---"; unit = "kg";
    }
    $("readoutMain").textContent = main;
    $("readoutUnit").textContent = unit;
  }

  /* ============================================================
     add / edit / delete
     ============================================================ */
  function readForm() {
    var date = $("fDate").value, time = $("fTime").value;
    if (!date || !time) return null;
    if (mode === "bp") {
      var sys = parseInt($("fSys").value, 10), dia = parseInt($("fDia").value, 10);
      if (isNaN(sys) || isNaN(dia)) return null;
      return {
        date: date, time: time, sys: sys, dia: dia,
        pulse: intOrNull($("fPulse").value), spo2: intOrNull($("fSpo2").value),
        arm: $("fArm").value || "", seated: $("fSeated").checked
      };
    }
    if (mode === "glucose") {
      var glu = parseInt($("fGlu").value, 10);
      if (isNaN(glu)) return null;
      return { date: date, time: time, glu: glu, ctx: $("fCtx").value };
    }
    var wt = parseFloat($("fWeight").value);
    if (isNaN(wt)) return null;
    var ht = parseFloat($("fHeight").value);
    if (!isNaN(ht)) state.height = ht;
    return { date: date, time: time, weight: wt };
  }
  function intOrNull(v) { var n = parseInt(v, 10); return isNaN(n) ? null : n; }

  function onSubmit(e) {
    e.preventDefault();
    var rec = readForm();
    if (!rec) { msg($("entryMsg"), "Enter a date, time and the reading value.", true); return; }
    var list = state[mode];
    if (editId) {
      var i = list.findIndex(function (r) { return r.id === editId; });
      if (i >= 0) { rec.id = editId; list[i] = rec; }
      msg($("entryMsg"), STRINGS.editedReading);
      cancelEdit();
    } else {
      rec.id = uid();
      list.push(rec);
      msg($("entryMsg"), STRINGS.savedReading);
    }
    save();
    resetValueFields();
    render();
  }

  function resetValueFields() {
    ["fSys", "fDia", "fPulse", "fSpo2", "fGlu", "fWeight"].forEach(function (id) { $(id).value = ""; });
    $("fSeated").checked = false; $("fArm").value = "";
    $("fDate").value = todayISO(); $("fTime").value = nowHM();
    updateReadout();
  }

  function startEdit(id) {
    var r = state[mode].find(function (x) { return x.id === id; });
    if (!r) return;
    editId = id;
    $("fDate").value = r.date; $("fTime").value = r.time;
    if (mode === "bp") {
      $("fSys").value = r.sys; $("fDia").value = r.dia;
      $("fPulse").value = r.pulse == null ? "" : r.pulse;
      $("fSpo2").value = r.spo2 == null ? "" : r.spo2;
      $("fArm").value = r.arm || ""; $("fSeated").checked = !!r.seated;
    } else if (mode === "glucose") {
      $("fGlu").value = r.glu; $("fCtx").value = r.ctx;
    } else { $("fWeight").value = r.weight; if (state.height) $("fHeight").value = state.height; }
    $("saveBtn").textContent = "Save changes";
    $("cancelEditBtn").hidden = false;
    updateReadout();
    $("readoutMain").scrollIntoView({ block: "nearest" });
  }
  function cancelEdit() {
    editId = null;
    $("saveBtn").textContent = "Add reading";
    $("cancelEditBtn").hidden = true;
  }
  function del(id) {
    state[mode] = state[mode].filter(function (r) { return r.id !== id; });
    save(); msg($("entryMsg"), STRINGS.deletedReading); render();
  }

  function msg(el, text, isErr) {
    el.textContent = text;
    el.classList.toggle("is-error", !!isErr);
    if (text) setTimeout(function () { if (el.textContent === text) el.textContent = ""; }, 4000);
  }

  /* ============================================================
     band tags (verbatim, closed-set)
     ============================================================ */
  function bpTag(r) {
    var label = VS.bpCategory(r.sys, r.dia);
    return { label: label, outside: label !== "Normal" };
  }
  function gluTag(r) {
    var label = VS.glucoseTarget(r.glu, r.ctx);
    if (!label) return { label: STRINGS.noCitedTarget, outside: false, muted: true };
    return { label: label, outside: label === "outside cited ADA target" };
  }
  function bmiTag(r) {
    if (!state.height) return null;
    var m = state.height / 100;
    var raw = r.weight / (m * m);
    var label = VS.whoBmiClass(raw);
    return { label: label, outside: label !== "Normal range" };
  }

  function chip(tag) {
    if (!tag) return "";
    var cls = "chip" + (tag.outside ? " chip--outside" : "") + (tag.muted ? " chip--muted" : "");
    var mark = tag.outside ? "▲ " : "● ";
    return '<span class="' + cls + '">' + mark + esc(tag.label) + "</span>";
  }

  /* ============================================================
     render trend table + averages
     ============================================================ */
  function fmtGlu(mgdl) {
    return prefs.mmol ? VS.mgdlToMmol(mgdl).toFixed(1) + " mmol/L" : mgdl + " mg/dL";
  }

  function render() {
    renderAverages();
    renderTable();
    syncControls();
  }

  function syncControls() {
    $("bandToggle").checked = prefs.bands;
    $("bandToggleLabel").textContent = prefs.bands ? STRINGS.bandsOn : STRINGS.bandsOff;
    $("mmolToggle").checked = prefs.mmol;
    $("unitToggle").checked = prefs.showBmi;
    document.body.classList.toggle("bands-off", !prefs.bands);
  }

  function renderAverages() {
    var box = $("averages");
    var rows = state[mode];
    if (!rows.length) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    var asOf = todayISO();
    var html = '<p class="averages__note">' + esc(STRINGS.avgNote) + "</p>";
    if (mode === "bp") {
      var s7 = VS.avg7dSys(asOf, dailyMap(rows, function (r) { return r.sys; }));
      var d7 = VS.avg7dSys(asOf, dailyMap(rows, function (r) { return r.dia; }));
      var s30 = VS.avg30dSys(asOf, dailyMap(rows, function (r) { return r.sys; }));
      var d30 = VS.avg30dSys(asOf, dailyMap(rows, function (r) { return r.dia; }));
      html += avgBlock(STRINGS.avg7, s7 != null ? s7 + "/" + d7 + " mmHg" : "—");
      html += avgBlock(STRINGS.avg30, s30 != null ? s30 + "/" + d30 + " mmHg" : "—");
    } else if (mode === "glucose") {
      var g7 = VS.avg7dSys(asOf, dailyMap(rows, function (r) { return r.glu; }));
      var g30 = VS.avg30dSys(asOf, dailyMap(rows, function (r) { return r.glu; }));
      html += avgBlock(STRINGS.avg7, g7 != null ? fmtGlu(g7) : "—");
      html += avgBlock(STRINGS.avg30, g30 != null ? fmtGlu(g30) : "—");
    } else {
      var w7map = dailyMap(rows, function (r) { return r.weight; });
      var w7 = weightAvg(asOf, w7map, 7), w30 = weightAvg(asOf, w7map, 30);
      html += avgBlock(STRINGS.avg7, w7 != null ? w7.toFixed(1) + " kg" : "—");
      html += avgBlock(STRINGS.avg30, w30 != null ? w30.toFixed(1) + " kg" : "—");
    }
    box.innerHTML = html;
  }
  function weightAvg(asOf, map, win) {
    var cutoff = VS.daysBefore(asOf, win - 1), asOfMs = VS.parseISO(asOf), vals = [];
    Object.keys(map).forEach(function (d) {
      var t = VS.parseISO(d); if (t >= cutoff && t <= asOfMs) vals.push(map[d]);
    });
    if (!vals.length) return null;
    return VS.roundHalfUp(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, 1);
  }
  function avgBlock(label, value) {
    return '<div class="avg"><span class="avg__label">' + esc(label) +
      '</span><span class="avg__value">' + esc(value) + "</span></div>";
  }

  function renderTable() {
    var head = $("logHead"), body = $("logBody"), rows = state[mode].slice().sort(byDateDesc);
    var titles = { bp: "Blood-pressure log", glucose: "Blood-glucose log", weight: "Weight & BMI log" };
    $("trendTitle").textContent = titles[mode];
    var empt = $("empty");
    if (!rows.length) {
      head.innerHTML = ""; body.innerHTML = "";
      empt.textContent = mode === "bp" ? STRINGS.emptyBP : mode === "glucose" ? STRINGS.emptyGlucose : STRINGS.emptyWeight;
      empt.hidden = false; return;
    }
    empt.hidden = true;
    head.innerHTML = headRow();
    var lastDay = null, out = "";
    rows.forEach(function (r) {
      if (r.date !== lastDay) {
        out += '<tr class="daysep"><td colspan="9">' + esc(prettyDate(r.date)) + "</td></tr>";
        lastDay = r.date;
      }
      out += dataRow(r);
    });
    body.innerHTML = out;
    // wire row buttons
    body.querySelectorAll("button[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { startEdit(b.getAttribute("data-edit")); });
    });
    body.querySelectorAll("button[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { del(b.getAttribute("data-del")); });
    });
  }

  var NOTES_TH = '<th class="notes-col">Clinician notes</th>';
  var NOTES_TD = '<td class="notes-col"></td>';
  function headRow() {
    if (mode === "bp")
      return "<tr><th>Time</th><th>Systolic</th><th>Diastolic</th><th>Pulse</th><th>SpO₂</th><th>Context</th><th>Band</th>" + NOTES_TH + "<th class=\"noprint\">Edit</th></tr>";
    if (mode === "glucose")
      return "<tr><th>Time</th><th>Glucose</th><th>Context</th><th>Band</th>" + NOTES_TH + "<th class=\"noprint\">Edit</th></tr>";
    return "<tr><th>Time</th><th>Weight</th><th>BMI</th><th>Band</th>" + NOTES_TH + "<th class=\"noprint\">Edit</th></tr>";
  }

  function dataRow(r) {
    var actions = NOTES_TD + '<td class="noprint"><button class="linkbtn" data-edit="' + r.id + '">Edit</button>' +
      '<button class="linkbtn linkbtn--del" data-del="' + r.id + '">Delete</button></td>';
    if (mode === "bp") {
      var ctx = [r.arm ? r.arm + " arm" : "", r.seated ? "seated" : ""].filter(Boolean).join(", ") || "—";
      return "<tr><td>" + esc(r.time) + '</td><td class="num">' + r.sys + '</td><td class="num">' + r.dia +
        '</td><td class="num">' + (r.pulse == null ? "—" : r.pulse) + '</td><td class="num">' + (r.spo2 == null ? "—" : r.spo2 + "%") +
        "</td><td>" + esc(ctx) + '</td><td class="bandcell">' + chip(bpTag(r)) + "</td>" + actions + "</tr>";
    }
    if (mode === "glucose") {
      var ctxLabel = { fasting: "Fasting", "post-meal": "After meal", random: "Random" }[r.ctx] || r.ctx;
      return "<tr><td>" + esc(r.time) + '</td><td class="num">' + esc(fmtGlu(r.glu)) +
        "</td><td>" + esc(ctxLabel) + '</td><td class="bandcell">' + chip(gluTag(r)) + "</td>" + actions + "</tr>";
    }
    var bmiVal = "—", tag = null;
    if (state.height) {
      var m = state.height / 100;
      bmiVal = VS.bmi(r.weight, m).toFixed(1);
      tag = bmiTag(r);
    }
    return "<tr><td>" + esc(r.time) + '</td><td class="num">' + r.weight.toFixed(1) +
      ' kg</td><td class="num">' + bmiVal + '</td><td class="bandcell">' + chip(tag) + "</td>" + actions + "</tr>";
  }

  function prettyDate(iso) {
    var p = iso.split("-");
    var mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return parseInt(p[2], 10) + " " + mo[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  /* ============================================================
     CSV export
     ============================================================ */
  function csvFor(m) {
    var rows = [], header;
    if (m === "bp") {
      header = ["date", "time", "mode", "systolic_mmHg", "diastolic_mmHg", "pulse_bpm", "spo2_pct", "context", "band_ACC_AHA_2017"];
      rows.push(header);
      state.bp.slice().sort(byDateDesc).forEach(function (r) {
        rows.push([r.date, r.time, "bp", r.sys, r.dia, r.pulse == null ? "" : r.pulse,
          r.spo2 == null ? "" : r.spo2, [r.arm ? r.arm + " arm" : "", r.seated ? "seated" : ""].filter(Boolean).join(", "),
          VS.bpCategory(r.sys, r.dia)]);
      });
    } else if (m === "glucose") {
      header = ["date", "time", "mode", "glucose_mgdl", "glucose_mmolL", "context", "band_ADA_target"];
      rows.push(header);
      state.glucose.slice().sort(byDateDesc).forEach(function (r) {
        rows.push([r.date, r.time, "glucose", r.glu, VS.mgdlToMmol(r.glu).toFixed(1), r.ctx,
          VS.glucoseTarget(r.glu, r.ctx) || "no cited target (random)"]);
      });
    } else {
      header = ["date", "time", "mode", "weight_kg", "height_cm", "bmi_kgm2", "band_WHO"];
      rows.push(header);
      state.weight.slice().sort(byDateDesc).forEach(function (r) {
        var bmiV = "", band = "";
        if (state.height) { var mm = state.height / 100; bmiV = VS.bmi(r.weight, mm).toFixed(1); band = VS.whoBmiClass(r.weight / (mm * mm)); }
        rows.push([r.date, r.time, "weight", r.weight, state.height || "", bmiV, band]);
      });
    }
    return VS.csvDoc(rows);
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ============================================================
     JSON backup / restore / erase
     ============================================================ */
  function jsonExport() {
    var payload = { app: "vitalsheet", version: 1, exported: new Date().toISOString(), data: state };
    download("vitalsheet-backup-" + todayISO() + ".json", JSON.stringify(payload, null, 2), "application/json");
    msg($("dataMsg"), "Backup downloaded.");
  }
  function jsonImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var p = JSON.parse(reader.result);
        var d = p && p.data ? p.data : p;
        state = {
          bp: Array.isArray(d.bp) ? d.bp : [],
          glucose: Array.isArray(d.glucose) ? d.glucose : [],
          weight: Array.isArray(d.weight) ? d.weight : [],
          height: typeof d.height === "number" ? d.height : null
        };
        // ensure ids
        ["bp", "glucose", "weight"].forEach(function (k) {
          state[k].forEach(function (r) { if (!r.id) r.id = uid(); });
        });
        save(); render();
        msg($("dataMsg"), "Backup restored.");
      } catch (e) { msg($("dataMsg"), "Could not read that file — is it a vitalsheet JSON backup?", true); }
    };
    reader.readAsText(file);
  }
  function erase() {
    if (!window.confirm(STRINGS.eraseConfirm)) return;
    state = { bp: [], glucose: [], weight: [], height: null };
    save(); render();
    msg($("dataMsg"), "All readings erased.");
  }

  /* ============================================================
     sources page
     ============================================================ */
  function renderSources() {
    var groups = [
      { key: "bp", title: "Blood pressure — 2017 ACC/AHA categories" },
      { key: "glucose", title: "Blood glucose — ADA Standards of Care" },
      { key: "bmi", title: "Body-mass index — WHO classification" },
      { key: "unit", title: "Units & definitions" },
      { key: "technique", title: "Home-measurement technique (verbatim; used nowhere in calculations)" }
    ];
    var html = "";
    groups.forEach(function (g) {
      var items = BANDS.filter(function (b) { return b.mode === g.key; });
      html += '<h3 class="src__group">' + esc(g.title) + "</h3><ul class=\"src__list\">";
      items.forEach(function (b) {
        var quote = b.rule || b.quote || "";
        var conf = b.confidence && b.confidence !== "verified" ? ' <span class="badge badge--beta">' + esc(b.confidence) + "</span>" : "";
        html += '<li class="src"><span class="src__label">' + esc(b.label || b.id) + conf + "</span>" +
          '<span class="src__quote">' + esc(quote) + "</span>" +
          '<span class="src__meta"><a href="' + esc(b.source_url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(b.source_title) + "</a> &middot; verified " + esc(b.verified_on) +
          (b.note ? '<span class="src__note">' + esc(b.note) + "</span>" : "") + "</span></li>";
      });
      html += "</ul>";
    });
    $("sourcesList").innerHTML = html;
  }

  /* ============================================================
     print
     ============================================================ */
  function doPrint() {
    var name = $("pName").value.trim(), dob = $("pDob").value;
    document.body.setAttribute("data-print-name", name);
    document.body.setAttribute("data-print-dob", dob);
    var meta = [];
    if (name) meta.push("Name: " + name);
    if (dob) meta.push("DOB: " + dob);
    var from = $("pFrom").value, to = $("pTo").value;
    if (from || to) meta.push("Range: " + (from || "start") + " to " + (to || "today"));
    var hdr = document.getElementById("printHeader");
    if (!hdr) {
      hdr = document.createElement("div");
      hdr.id = "printHeader"; hdr.className = "print-only";
      document.querySelector("main").insertBefore(hdr, document.querySelector("main").firstChild);
    }
    hdr.innerHTML = "<h1>vitalsheet — clinic-ready trend sheet</h1><p>" +
      esc(meta.join("  •  ")) + "</p><p class=\"print-mode\">" +
      ({ bp: "Blood pressure (mmHg)", glucose: "Blood glucose", weight: "Weight & BMI" }[mode]) +
      " — averages are the plain arithmetic mean of logged readings.</p>";
    window.print();
  }

  /* ============================================================
     wire up
     ============================================================ */
  function init() {
    $("fDate").value = todayISO();
    $("fTime").value = nowHM();

    $("tab-bp").addEventListener("click", function () { setMode("bp"); });
    $("tab-glucose").addEventListener("click", function () { setMode("glucose"); });
    $("tab-weight").addEventListener("click", function () { setMode("weight"); });

    $("entryForm").addEventListener("submit", onSubmit);
    $("cancelEditBtn").addEventListener("click", function () { cancelEdit(); resetValueFields(); });
    ["fSys", "fDia", "fGlu", "fWeight"].forEach(function (id) {
      $(id).addEventListener("input", updateReadout);
    });

    $("bandToggle").addEventListener("change", function () {
      prefs.bands = $("bandToggle").checked; savePrefs(); syncControls();
    });
    $("mmolToggle").addEventListener("change", function () {
      prefs.mmol = $("mmolToggle").checked; savePrefs(); updateReadout(); render();
    });
    $("unitToggle").addEventListener("change", function () {
      prefs.showBmi = $("unitToggle").checked; savePrefs(); render();
    });

    $("csvModeBtn").addEventListener("click", function () {
      download("vitalsheet-" + mode + "-" + todayISO() + ".csv", csvFor(mode));
    });
    $("csvAllBtn").addEventListener("click", function () {
      var all = csvFor("bp") + "\r\n" + csvFor("glucose") + "\r\n" + csvFor("weight");
      download("vitalsheet-all-" + todayISO() + ".csv", all);
    });
    $("printBtn").addEventListener("click", doPrint);

    $("jsonExportBtn").addEventListener("click", jsonExport);
    $("jsonImportBtn").addEventListener("click", function () { $("jsonFile").click(); });
    $("jsonFile").addEventListener("change", function () {
      if (this.files && this.files[0]) jsonImport(this.files[0]);
      this.value = "";
    });
    $("eraseBtn").addEventListener("click", erase);

    renderSources();
    setMode("bp");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
