/*
 * Between Visits: screens and navigation.
 * Each screen is a function that returns HTML. The router picks one based on the URL hash.
 */
(function () {
  var core = BV.core, triage = BV.triage;
  var REGIMENS = BV.data.REGIMENS, SYMPTOMS = BV.data.SYMPTOMS;
  var view = document.getElementById("view");
  var state = core.load();
  var chart = null;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function telHref(n) { return "tel:" + String(n || "").replace(/[^0-9+]/g, ""); }
  function regimen() { return REGIMENS[state.profile.regimen] || REGIMENS.other; }
  function today() { return core.ymd(new Date()); }
  function checkinFor(date) { return state.checkins.find(function (c) { return c.date === date; }); }
  function persist() { core.save(state); }
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.remove("hide");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.add("hide"); }, 2600);
  }
  function copyText(text, msg) {
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); toast(msg);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback);
    else fallback();
  }
  function patient() { return state.profile.patientName || "the patient"; }
  function possessive(name) { return /s$/i.test(name) ? name + "'" : name + "'s"; }
  function isHelper() { return state.profile.role === "helper"; }
  function levelBadge(l) { return '<span class="badge l' + l + '">' + esc(triage.LEVELS[l].short) + "</span>"; }
  function windowText(w) { return "days " + w.start + " to " + w.end; }
  function hasEffect(reg, sym) { return reg.effects.some(function (e) { return e.symptom === sym; }); }
  function countyOptions(selected) {
    return '<option value="">Choose a county</option>' + Object.keys(BV.data.KY.COUNTIES).map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === selected ? " selected" : "") + '>' + esc(c) + '</option>';
    }).join("") + '<option value="other"' + (selected === "other" ? " selected" : "") + '>Another Kentucky county</option>';
  }

  function applySettings() {
    var s = (state && state.settings) || {};
    document.documentElement.setAttribute("data-size", s.size || "normal");
    if (s.theme && s.theme !== "auto") document.documentElement.setAttribute("data-theme", s.theme);
    else document.documentElement.removeAttribute("data-theme");
  }

  /* ---------- router ---------- */
  function go(route) { location.hash = "#/" + route; }
  function render() {
    if (chart) { chart.destroy(); chart = null; }
    var hash = location.hash || "";
    var familyMatch = hash.match(/^#family=(.+)$/);
    var tabs = document.getElementById("tabs");
    var settingsBtn = document.getElementById("settingsBtn");

    if (familyMatch) {
      tabs.classList.add("hide"); settingsBtn.classList.add("hide");
      view.innerHTML = familyViewer(familyMatch[1]);
      return;
    }
    if (!state || !state.profile) {
      tabs.classList.add("hide"); settingsBtn.classList.add("hide");
      view.innerHTML = onboarding();
      return;
    }
    tabs.classList.remove("hide"); settingsBtn.classList.remove("hide");
    var parts = hash.replace(/^#\/?/, "").split("/");
    var route = parts[0] || "today";
    var screens = { today: todayScreen, checkin: checkinScreen, result: resultScreen, trends: trendsScreen,
                    visit: visitScreen, family: familyScreen, report: reportScreen, settings: settingsScreen, kentucky: kentuckyScreen };
    var fn = screens[route] || todayScreen;
    view.innerHTML = fn(parts[1]);
    Array.prototype.forEach.call(tabs.querySelectorAll("button"), function (b) {
      var active = b.getAttribute("data-nav") === route || (route === "result" && b.getAttribute("data-nav") === "checkin") || (route === "report" && b.getAttribute("data-nav") === "visit") || (route === "kentucky" && b.getAttribute("data-nav") === "today");
      if (active) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (route === "trends") drawChart();
    if (route === "report") runReport();
    window.scrollTo(0, 0);
  }

  /* =========================================================
   * ONBOARDING
   * ========================================================= */
  function onboarding() {
    var opts = Object.keys(REGIMENS).map(function (k) {
      return '<option value="' + k + '">' + esc(REGIMENS[k].name) + "</option>";
    }).join("");
    return '' +
      '<h1>Know what to expect between chemo visits.</h1>' +
      '<p class="lead">Check in once a day. Between Visits tells you what is normal for this point in the cycle, and when to call the care team.</p>' +
      '<form id="setup" class="panel stack" novalidate>' +
        '<fieldset><legend>Who is using this?</legend><div class="seg">' +
          segOpt("role", "patient", "I'm the patient", true) + segOpt("role", "helper", "I'm helping someone") +
        '</div></fieldset>' +
        '<label class="label" for="pname">Patient\'s first name</label>' +
        '<input id="pname" name="patientName" type="text" autocomplete="off" placeholder="For example, Mary" required>' +
        '<label class="label" for="county">Kentucky county</label>' +
        '<select id="county" name="county">' + countyOptions("") + '</select>' +
        '<p class="hint">Used to show cancer resources near you. Optional.</p>' +
        '<label class="label" for="reg">Chemo regimen</label>' +
        '<select id="reg" name="regimen">' + opts + '</select>' +
        '<p class="hint" id="regHint">' + esc(REGIMENS["cis-pem"].usedFor) + '</p>' +
        '<div class="row" style="align-items:flex-start">' +
          '<div style="flex:1;min-width:140px"><label class="label" for="cyc">Which cycle is this?</label><input id="cyc" name="cycle" type="number" min="1" max="30" value="1"></div>' +
          '<div style="flex:2;min-width:180px"><label class="label" for="cstart">Infusion day of this cycle</label><input id="cstart" name="start" type="date" value="' + today() + '"></div>' +
        '</div>' +
        '<label class="label" for="dayp">Care team phone (daytime)</label>' +
        '<input id="dayp" name="dayPhone" type="tel" placeholder="Optional">' +
        '<label class="label" for="nightp">After-hours or 24-hour line</label>' +
        '<input id="nightp" name="nightPhone" type="tel" placeholder="Optional">' +
        '<p class="hint">The CDC advises keeping both numbers handy during chemo.</p>' +
        '<p class="small muted" id="setupError" role="alert"></p>' +
        '<button class="btn block" type="submit">Start using Between Visits</button>' +
      '</form>' +
      '<p class="row"><button class="linkish" data-action="demo">Explore with sample data instead</button></p>';
  }

  function segOpt(name, value, label, checked) {
    return '<label><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (checked ? " checked" : "") + '><span>' + esc(label) + '</span></label>';
  }

  function saveSetup(form) {
    var f = new FormData(form);
    var name = (f.get("patientName") || "").trim();
    if (!name) { document.getElementById("setupError").textContent = "Add the patient's first name to continue."; return; }
    var reg = REGIMENS[f.get("regimen")];
    var cycle = Math.max(1, parseInt(f.get("cycle"), 10) || 1);
    var start = f.get("start") || today();
    state = {
      profile: { role: f.get("role"), patientName: name, county: f.get("county") || "", regimen: reg.id, cycleLength: reg.cycleLength,
                 cycleStarts: [start], firstCycleNumber: cycle, dayPhone: f.get("dayPhone"), nightPhone: f.get("nightPhone") },
      checkins: [], questions: [], settings: { size: "normal", theme: "auto" }
    };
    persist(); go("today");
  }

  /* =========================================================
   * TODAY
   * ========================================================= */
  function todayScreen() {
    var p = state.profile, reg = regimen(), ci = core.cycleInfo(p);
    var html = "";
    var hour = new Date().getHours();
    var hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    if (ci.before) {
      return '<h1>' + hello + '.</h1><div class="panel"><h2 style="margin-top:0">Treatment starts in ' + ci.daysUntil + ' day' + (ci.daysUntil === 1 ? "" : "s") + '.</h2>' +
        '<p>Check in from the infusion day onward. Until then, it helps to write down questions for the first visit.</p>' +
        '<a class="btn" href="#/visit">Write down questions</a></div>';
    }

    var who = isHelper() ? possessive(patient()) : "Your";
    html += '<p class="eyebrow">' + hello + (isHelper() ? "" : ", " + esc(patient())) + '.</p>';
    html += '<h1 class="day-title">Day ' + ci.day + ' <span>of ' + ci.length + '</span></h1>';
    html += '<p class="lead">' + esc(who) + ' cycle ' + ci.cycle + ' of ' + esc(reg.name) + '.</p>';

    if (ci.overdue) {
      html += '<div class="level l1"><h3>Has the next cycle started?</h3><p>Day ' + ci.day + ' is past the usual ' + ci.length + '-day cycle. Cycles are often delayed for blood counts, which is common.</p>' +
        '<button class="btn" data-action="new-cycle">Start cycle ' + (ci.cycle + 1) + ' today</button></div>';
    }

    html += blisterPack(ci, reg);

    // Today's check-in
    var c = checkinFor(today());
    if (c) {
      var r = c.result;
      html += '<div class="level l' + r.level + '"><div class="row" style="justify-content:space-between"><h2 style="margin:0">' + esc(r.levelInfo.title) + '</h2>' + levelBadge(r.level) + '</div>' +
        '<p style="margin-top:8px">' + (r.findings.length ? esc(r.findings[0].title) + (r.findings.length > 1 ? " and " + (r.findings.length - 1) + " more." : ".") : "Today's check-in didn't raise anything urgent.") + '</p>' +
        '<div class="row"><a class="btn" href="#/result/' + c.date + '">See today\'s result</a><a class="btn secondary" href="#/checkin">Update check-in</a></div></div>';
    } else {
      html += '<div class="panel"><h2 style="margin-top:0">Today\'s check-in</h2><p>About a minute. Answer a few questions and see what is normal for day ' + ci.day + '.</p><a class="btn block" href="#/checkin">Start today\'s check-in</a></div>';
    }

    // What to expect today
    var active = reg.effects.filter(function (e) { return triage.inWindow(ci.day, e); });
    var watching = reg.watch.filter(function (w) { return triage.inWindow(ci.day, w); });
    var soon = reg.watch.filter(function (w) { return w.start > ci.day && w.start <= ci.day + 3; });

    html += '<h2>What to expect on day ' + ci.day + '</h2>';
    if (!active.length && !watching.length) {
      html += '<p class="muted">' + (reg.effects.length ? "No side effects are typically expected right now. If something new shows up, check in." : "Timing tips are off for this regimen. Safety checks still run on every check-in.") + '</p>';
    }
    active.forEach(function (e) {
      var peak = e.peak && ci.day >= e.peak[0] && ci.day <= e.peak[1];
      html += '<div class="expected"><h3>' + esc(SYMPTOMS[e.symptom].label) + '</h3><p class="when">Common on ' + windowText(e) + (peak ? ". Today is usually the worst day." : ".") + '</p><p class="small" style="margin:0">' + esc(e.what) + '</p>' +
        '<ul class="small">' + e.tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul></div>';
    });
    watching.forEach(function (w) {
      html += '<div class="level ' + (w.id === "infection" ? "l2" : "l1") + '"><h3>' + esc(w.label) + ' (' + windowText(w) + ')</h3><p class="small" style="margin:0">' + esc(w.text) + '</p></div>';
    });
    soon.forEach(function (w) {
      html += '<p class="small muted">Coming up: ' + esc(w.label.toLowerCase()) + ' starts on day ' + w.start + '.</p>';
    });

    html += helpPanel();
    return html;
  }

  function blisterPack(ci, reg) {
    var cells = "";
    for (var d = 1; d <= ci.length; d++) {
      var date = core.addDays(ci.start, d - 1);
      var c = checkinFor(date);
      var cls = "pocket";
      var label = "Day " + d;
      if (c) { cls += " done l" + c.result.level; label += ", checked in: " + c.result.levelInfo.short; }
      else if (date > today()) { cls += " future"; }
      else if (date < today()) { cls += " missed"; label += ", no check-in"; }
      if (date === today()) { cls += " today"; label += ", today"; }
      var infection = reg.watch.some(function (w) { return w.id === "infection" && triage.inWindow(d, w); });
      var effect = reg.effects.some(function (e) { return triage.inWindow(d, e); });
      var bar = infection ? '<span class="win infection"></span>' : effect ? '<span class="win"></span>' : "";
      if (infection) label += ", infection-risk window"; else if (effect) label += ", side effects common";
      cells += '<div class="' + cls + '" role="listitem" aria-label="' + esc(label) + '">' + d + bar + '</div>';
    }
    return '<div class="pack" aria-label="Cycle ' + ci.cycle + ' at a glance"><div class="pack-grid" role="list">' + cells + '</div></div>' +
      '<div class="pack-caption"><span class="key"><i class="bar" style="background:var(--sage)"></i>Side effects common</span>' +
      '<span class="key"><i class="bar" style="background:var(--lv2)"></i>Infection-risk window</span>' +
      '<span class="key"><i style="background:var(--lv0)"></i>Okay</span><span class="key"><i style="background:var(--lv1)"></i>Note for visit</span><span class="key"><i style="background:var(--lv2)"></i>Call today</span><span class="key"><i style="background:var(--lv3)"></i>Call now</span></div>';
  }

  function helpPanel() {
    var p = state.profile;
    var html = '<h2>Need help now?</h2><div class="panel stack">';
    if (p.dayPhone) html += '<a class="btn secondary block" href="' + telHref(p.dayPhone) + '">Call care team (daytime) ' + esc(p.dayPhone) + '</a>';
    if (p.nightPhone) html += '<a class="btn secondary block" href="' + telHref(p.nightPhone) + '">Call after-hours line ' + esc(p.nightPhone) + '</a>';
    if (!p.dayPhone && !p.nightPhone) html += '<p>Add the care team\'s phone numbers in <a href="#/settings">settings</a> so they are one tap away.</p>';
    html += '<a class="btn secondary block" href="#/kentucky">' + (p.county ? "Help near " + esc(p.county) + " County" : "Kentucky help near you") + '</a>';
    html += '<p class="small muted" style="margin:0">Trouble breathing, chest pain, or swelling of the face or lips: call 911. Questions any time: American Cancer Society, <a href="tel:18002272345">1-800-227-2345</a>, 24 hours a day.</p></div>';
    return html;
  }

  /* =========================================================
   * CHECK-IN
   * ========================================================= */
  function scaleField(key, current) {
    var s = SYMPTOMS[key];
    return '<fieldset><legend>' + esc(s.label) + '</legend><div class="seg">' +
      s.scale.map(function (lab, i) { return segOpt(key, String(i), lab, String(current == null ? 0 : current) === String(i)); }).join("") +
      '</div></fieldset>';
  }
  function choiceField(key, legend, options, current, hint) {
    return '<fieldset><legend>' + esc(legend) + '</legend>' + (hint ? '<p class="hint">' + esc(hint) + '</p>' : "") + '<div class="seg">' +
      options.map(function (o) { return segOpt(key, o[0], o[1], (current || options[0][0]) === o[0]); }).join("") + '</div></fieldset>';
  }
  function stepperField(key, legend, hint, current) {
    var v = current || 0;
    return '<fieldset><legend>' + esc(legend) + '</legend><p class="hint">' + esc(hint) + '</p>' +
      '<div class="stepper"><button type="button" data-step="' + key + '" data-dir="-1" aria-label="Fewer">&minus;</button>' +
      '<output id="out-' + key + '" aria-live="polite">' + v + '</output><input type="hidden" name="' + key + '" value="' + v + '">' +
      '<button type="button" data-step="' + key + '" data-dir="1" aria-label="More">+</button></div></fieldset>';
  }

  function checkinScreen() {
    var ci = core.cycleInfo(state.profile), c = checkinFor(today()) || {};
    var reg = regimen();
    var html = '<h1>' + (c.date ? "Update today's check-in" : "Today's check-in") + '</h1>' +
      '<p class="lead">Day ' + ci.day + ' of cycle ' + ci.cycle + '. ' + (isHelper() ? "Answer for " + esc(patient()) + "." : "Answer for how you feel today.") + '</p>' +
      '<form id="checkin" novalidate>' +
      '<fieldset class="danger-zone checks"><legend>Is any of this happening right now?</legend>' +
        check("breathing", "Trouble breathing", c) + check("chest", "Chest pain", c) +
        check("swelling", "Swelling of the face, lips, or throat", c) + check("confusion", "New confusion or very hard to wake", c) +
      '</fieldset><br>' +
      '<fieldset><legend><label for="temp">Temperature (°F)</label></legend><p class="hint">Leave blank if you didn\'t check. Check any time you feel warm, chilled, or unwell.</p>' +
        '<input id="temp" name="temp" type="number" inputmode="decimal" step="0.1" min="90" max="110" placeholder="For example, 98.6" value="' + esc(c.temp || "") + '"></fieldset>' +
      scaleField("nausea", c.nausea) +
      stepperField("vomit", "Times vomited today", "Count each time.", c.vomit) +
      choiceField("fluids", "Keeping fluids down?", [["yes", "Yes"], ["some", "Some"], ["no", "Can't keep anything down"]], c.fluids) +
      choiceField("urine", "Peeing compared to usual", [["normal", "About the same"], ["less", "A little less"], ["much", "Much less"]], c.urine,
        reg.id === "cis-pem" ? "Cisplatin is cleared by the kidneys, so this matters most in the first days." : "") +
      scaleField("appetite", c.appetite) +
      scaleField("fatigue", c.fatigue) +
      stepperField("diarrhea", "Extra bowel movements today", "More than your normal number. Use 0 if none.", c.diarrhea) +
      scaleField("mouth", c.mouth) +
      (hasEffect(reg, "aches") ? scaleField("aches", c.aches) : "") +
      (hasEffect(reg, "rash") ? scaleField("rash", c.rash) : "") +
      choiceField("numbness", "Numbness or tingling in hands or feet", [["none", "No"], ["ongoing", "Yes, same as before"], ["new", "Yes, new or worse"]], c.numbness) +
      choiceField("ears", "Ringing in the ears or hearing change", [["none", "No"], ["ongoing", "Yes, same as before"], ["new", "Yes, new or worse"]], c.ears) +
      '<fieldset class="checks"><legend>Anything else</legend>' + check("bleeding", "Unusual bleeding or bruising", c) + '</fieldset>' +
      '<label class="label" for="notes">Notes for the care team (optional)</label><textarea id="notes" name="notes" style="min-height:90px">' + esc(c.notes || "") + '</textarea><br><br>' +
      '<button class="btn block" type="submit">See today\'s result</button>' +
      '</form>';
    return html;
  }
  function check(name, label, c) {
    return '<label><input type="checkbox" name="' + name + '"' + (c[name] ? " checked" : "") + '><span>' + esc(label) + '</span></label>';
  }

  function saveCheckin(form) {
    var f = new FormData(form);
    var ci = core.cycleInfo(state.profile);
    var entry = { date: today(), time: new Date().toTimeString().slice(0, 5), cycle: ci.cycle, day: ci.day };
    ["temp", "nausea", "vomit", "fluids", "urine", "appetite", "fatigue", "diarrhea", "mouth", "aches", "rash", "numbness", "ears", "notes"].forEach(function (k) {
      var v = f.get(k); if (v !== null && v !== "") entry[k] = v;
    });
    ["breathing", "chest", "swelling", "confusion", "bleeding"].forEach(function (k) { entry[k] = f.get(k) === "on"; });
    entry.result = triage.evaluate(entry, { regimen: regimen(), day: ci.day });
    state.checkins = state.checkins.filter(function (c) { return c.date !== entry.date; }).concat([entry])
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    persist();
    go("result/" + entry.date);
  }

  /* =========================================================
   * RESULT
   * ========================================================= */
  function resultScreen(date) {
    var c = checkinFor(date || today());
    if (!c) return '<h1>No check-in yet</h1><a class="btn" href="#/checkin">Start today\'s check-in</a>';
    var r = c.result, p = state.profile;
    var html = '<p class="muted" style="margin-top:12px">' + esc(core.prettyDate(c.date)) + ', cycle ' + c.cycle + ' day ' + c.day + '</p>';
    html += '<div class="level l' + r.level + '"><h1 style="margin-top:0">' + esc(r.levelInfo.title) + '</h1>';
    if (r.level === 4) html += '<a class="btn block" href="tel:911">Call 911</a>';
    else if (r.level === 3) html += (p.nightPhone ? '<a class="btn block" href="' + telHref(p.nightPhone) + '">Call after-hours line ' + esc(p.nightPhone) + '</a>' : '<p>Call your care team\'s 24-hour line now.</p>');
    else if (r.level === 2) html += (p.dayPhone ? '<a class="btn block" href="' + telHref(p.dayPhone) + '">Call care team ' + esc(p.dayPhone) + '</a>' : '<p>Call your care team today.</p>');
    else if (r.level === 0) html += '<p style="margin:0">Nothing in today\'s answers needs a call. Keep going, and check in again tomorrow.</p>';
    else html += '<p style="margin:0">Nothing needs a call right now. It\'s been added to your visit summary.</p>';
    html += '</div>';

    if (r.findings.length) {
      html += '<h2>Why</h2><div class="panel">';
      r.findings.forEach(function (f) {
        html += '<div class="finding"><div class="row" style="justify-content:space-between"><h3>' + esc(f.title) + '</h3>' + levelBadge(f.level) + '</div><p class="small" style="margin:4px 0 0">' + esc(f.text) + '</p></div>';
      });
      html += '</div>';
    }
    if (r.expected.length) {
      html += '<h2>Expected for day ' + c.day + '</h2>';
      r.expected.forEach(function (e) {
        html += '<div class="expected"><h3>' + esc(SYMPTOMS[e.symptom].label) + '</h3><p class="when">Common on ' + esc(e.window) + (e.atPeak ? ". Today is usually the worst day." : ".") + '</p>' +
          '<p class="small" style="margin:0">' + esc(e.what) + '</p><ul class="small">' + e.tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul></div>';
      });
    }
    if (r.reminders.length) {
      html += '<h2>Keep in mind</h2>';
      r.reminders.forEach(function (w) { html += '<div class="panel"><h3>' + esc(w.label) + '</h3><p class="small" style="margin:0">' + esc(w.text) + '</p></div>'; });
    }
    html += '<div class="row no-print" style="margin-top:16px"><a class="btn" href="#/family">Share update with family</a><a class="btn secondary" href="#/today">Back to today</a></div>';
    return html;
  }

  /* =========================================================
   * TRENDS
   * ========================================================= */
  var trendSymptom = "nausea", trendCycle = null;
  function trendOptions() {
    var reg = regimen();
    var keys = ["nausea", "fatigue", "appetite", "mouth"];
    if (hasEffect(reg, "aches")) keys.push("aches");
    if (hasEffect(reg, "rash")) keys.push("rash");
    keys.push("temp");
    return keys;
  }
  function cyclesWithData() {
    var set = {}; state.checkins.forEach(function (c) { set[c.cycle] = true; });
    var cur = core.cycleInfo(state.profile).cycle; if (cur) set[cur] = true;
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }
  function trendsScreen() {
    var cycles = cyclesWithData();
    if (trendCycle === null || cycles.indexOf(trendCycle) === -1) trendCycle = cycles[cycles.length - 1];
    var html = '<h1>Trends</h1><p class="lead">See each symptom across the cycle, with the days it is usually expected shaded in.</p>';
    html += '<div class="chips" role="group" aria-label="Symptom">' + trendOptions().map(function (k) {
      return '<button class="chip" data-trend="' + k + '" aria-pressed="' + (k === trendSymptom) + '">' + esc(k === "temp" ? "Temperature" : SYMPTOMS[k].label) + '</button>';
    }).join("") + '</div>';
    if (cycles.length > 1) html += '<div class="chips" role="group" aria-label="Cycle">' + cycles.map(function (n) {
      return '<button class="chip" data-cycle="' + n + '" aria-pressed="' + (n === trendCycle) + '">Cycle ' + n + '</button>';
    }).join("") + '</div>';
    html += '<div class="panel"><div class="chart-wrap"><canvas id="trendChart" aria-label="Chart" role="img"></canvas></div><p id="trendSummary" style="margin:12px 0 0"></p></div>';

    var rows = state.checkins.filter(function (c) { return c.cycle === trendCycle; }).slice().reverse();
    html += '<h2>Check-ins in cycle ' + trendCycle + '</h2>';
    if (!rows.length) html += '<p class="muted">No check-ins in this cycle yet.</p>';
    else html += '<div class="panel"><ul class="list">' + rows.map(function (c) {
      return '<li><div class="row" style="justify-content:space-between"><a href="#/result/' + c.date + '">Day ' + c.day + ', ' + esc(core.prettyDate(c.date)) + '</a>' + levelBadge(c.result.level) + '</div>' +
        (c.result.findings[0] ? '<div class="small muted">' + esc(c.result.findings[0].title) + '</div>' : "") + '</li>';
    }).join("") + '</ul></div>';
    return html;
  }

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function drawChart() {
    var canvas = document.getElementById("trendChart");
    if (!canvas || typeof Chart === "undefined") return;
    var reg = regimen(), len = state.profile.cycleLength || 21;
    var labels = [], data = [], pointColors = [];
    var rows = state.checkins.filter(function (c) { return c.cycle === trendCycle; });
    for (var d = 1; d <= len; d++) {
      labels.push(String(d));
      var c = rows.find(function (x) { return x.day === d; });
      var v = c ? (trendSymptom === "temp" ? (c.temp ? parseFloat(c.temp) : null) : parseFloat(c[trendSymptom] || 0)) : null;
      data.push(v);
      pointColors.push(c ? cssVar("--lv" + c.result.level) : "transparent");
    }
    var isTemp = trendSymptom === "temp";
    var eff = reg.effects.find(function (e) { return e.symptom === trendSymptom; });
    var shade = isTemp ? reg.watch.find(function (w) { return w.id === "infection"; }) : eff;

    // Plugin: shade the expected window behind the line, and draw the 100.4°F fever line.
    var windowPlugin = {
      id: "expectedWindow",
      beforeDatasetsDraw: function (ch) {
        var x = ch.scales.x, y = ch.scales.y, ctx = ch.ctx, area = ch.chartArea;
        ctx.save();
        if (shade) {
          var step = x.getPixelForValue(1) - x.getPixelForValue(0);
          var left = x.getPixelForValue(shade.start - 1) - step / 2, right = x.getPixelForValue(shade.end - 1) + step / 2;
          ctx.fillStyle = isTemp ? "rgba(168,106,0,0.14)" : "rgba(111,165,146,0.22)";
          ctx.fillRect(Math.max(left, area.left), area.top, Math.min(right, area.right) - Math.max(left, area.left), area.bottom - area.top);
        }
        if (isTemp) {
          var py = y.getPixelForValue(100.4);
          ctx.strokeStyle = cssVar("--lv3"); ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(area.left, py); ctx.lineTo(area.right, py); ctx.stroke();
          ctx.setLineDash([]); ctx.fillStyle = cssVar("--lv3"); ctx.font = "bold 12px " + cssVar("--font");
          ctx.fillText("100.4°F: call now", area.left + 6, py - 6);
        }
        ctx.restore();
      }
    };

    var scale = !isTemp && SYMPTOMS[trendSymptom].scale;
    chart = new Chart(canvas, {
      type: "line",
      data: { labels: labels, datasets: [{ data: data, borderColor: cssVar("--accent"), backgroundColor: cssVar("--accent"), borderWidth: 3, tension: 0.3,
        pointRadius: 6, pointHoverRadius: 8, pointBackgroundColor: pointColors, pointBorderColor: cssVar("--surface"), pointBorderWidth: 2, spanGaps: true }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          title: function (items) { return "Day " + items[0].label; },
          label: function (item) { return isTemp ? item.raw + "°F" : scale[item.raw] || item.raw; } } } },
        scales: {
          x: { title: { display: true, text: "Day of cycle", color: cssVar("--ink-soft") }, ticks: { color: cssVar("--ink-soft"), autoSkip: true, maxRotation: 0 }, grid: { display: false } },
          y: isTemp
            ? { suggestedMin: 97, suggestedMax: 101.5, ticks: { color: cssVar("--ink-soft") }, grid: { color: cssVar("--line") } }
            : { min: 0, max: 3, ticks: { stepSize: 1, color: cssVar("--ink-soft"), callback: function (v) { return scale[v]; } }, grid: { color: cssVar("--line") } }
        }
      },
      plugins: [windowPlugin]
    });
    canvas.setAttribute("aria-label", (isTemp ? "Temperature" : SYMPTOMS[trendSymptom].label) + " by day of cycle " + trendCycle);
    document.getElementById("trendSummary").textContent = trendSummary(rows, eff, isTemp, shade);
  }

  /* One plain-English sentence about the chart. */
  function trendSummary(rows, eff, isTemp, shade) {
    var label = isTemp ? "Temperature" : SYMPTOMS[trendSymptom].label;
    var vals = rows.map(function (c) { return { day: c.day, v: isTemp ? (c.temp ? parseFloat(c.temp) : null) : parseFloat(c[trendSymptom] || 0) }; })
      .filter(function (x) { return x.v !== null && !isNaN(x.v); });
    if (!vals.length) return "No " + label.toLowerCase() + " data in this cycle yet.";
    var top = vals.reduce(function (a, b) { return b.v > a.v ? b : a; });
    if (isTemp) {
      var fevers = vals.filter(function (x) { return x.v >= 100.4; });
      var s = "Highest temperature: " + top.v.toFixed(1) + "°F on day " + top.day + ".";
      if (fevers.length) s += " " + fevers.length + " reading" + (fevers.length > 1 ? "s were" : " was") + " at fever level" + (shade && fevers.some(function (f) { return triage.inWindow(f.day, shade); }) ? ", inside the infection-risk window." : ".");
      return s;
    }
    if (top.v === 0) return "No " + label.toLowerCase() + " reported in this cycle.";
    var s2 = label + " was worst on day " + top.day + " (" + SYMPTOMS[trendSymptom].scale[top.v].toLowerCase() + ").";
    if (eff) {
      var outside = vals.filter(function (x) { return x.v > 0 && !triage.inWindow(x.day, eff); });
      s2 += triage.inWindow(top.day, eff) ? " That is inside the usual window (" + windowText(eff) + ")." : " That is outside the usual window (" + windowText(eff) + "), so mention it.";
      if (outside.length && triage.inWindow(top.day, eff)) s2 += " It also showed up on day" + (outside.length > 1 ? "s " : " ") + outside.map(function (o) { return o.day; }).join(", ") + ", outside that window.";
    }
    return s2;
  }

  /* =========================================================
   * VISIT PREP
   * ========================================================= */
  var visitCycle = null;
  function visitScreen() {
    var cycles = cyclesWithData();
    if (visitCycle === null || cycles.indexOf(visitCycle) === -1) visitCycle = cycles[cycles.length - 1];
    var reg = regimen();
    var rows = state.checkins.filter(function (c) { return c.cycle === visitCycle; });
    var html = '<h1>Visit prep</h1><p class="lead no-print">A one-page summary to bring to the next appointment, plus questions to ask.</p>';
    if (cycles.length > 1) html += '<div class="chips no-print" role="group" aria-label="Cycle">' + cycles.map(function (n) {
      return '<button class="chip" data-vcycle="' + n + '" aria-pressed="' + (n === visitCycle) + '">Cycle ' + n + '</button>'; }).join("") + '</div>';

    html += '<div class="panel"><h2 style="margin-top:0">' + esc(possessive(patient())) + ' summary, cycle ' + visitCycle + '</h2>' +
      '<p class="small muted">' + esc(reg.name) + '. ' + rows.length + ' check-in' + (rows.length === 1 ? "" : "s") + (rows.length ? ', ' + esc(core.prettyDate(rows[0].date)) + ' to ' + esc(core.prettyDate(rows[rows.length - 1].date)) : "") + '.</p>';
    if (!rows.length) html += '<p>No check-ins in this cycle yet.</p>';
    else {
      html += '<table class="summary"><thead><tr><th>Symptom</th><th>Worst</th><th>Day</th></tr></thead><tbody>';
      var temps = rows.filter(function (c) { return c.temp; });
      if (temps.length) {
        var tmax = temps.reduce(function (a, b) { return parseFloat(b.temp) > parseFloat(a.temp) ? b : a; });
        html += '<tr><td>Highest temperature</td><td>' + esc(parseFloat(tmax.temp).toFixed(1)) + '°F</td><td>' + tmax.day + '</td></tr>';
      }
      ["nausea", "appetite", "fatigue", "mouth", "aches", "rash"].forEach(function (k) {
        var withVal = rows.filter(function (c) { return parseFloat(c[k] || 0) > 0; });
        if (!withVal.length) return;
        var w = withVal.reduce(function (a, b) { return parseFloat(b[k]) > parseFloat(a[k]) ? b : a; });
        html += '<tr><td>' + esc(SYMPTOMS[k].label) + '</td><td>' + esc(SYMPTOMS[k].scale[w[k]]) + '</td><td>' + w.day + '</td></tr>';
      });
      var vomitRow = rows.reduce(function (a, b) { return parseInt(b.vomit || 0, 10) > parseInt((a && a.vomit) || 0, 10) ? b : a; }, null);
      if (vomitRow) { var vn = parseInt(vomitRow.vomit, 10); html += '<tr><td>Most vomiting in a day</td><td>' + vn + (vn === 1 ? ' time' : ' times') + '</td><td>' + vomitRow.day + '</td></tr>'; }
      ["ears", "numbness"].forEach(function (k) {
        var hit = rows.filter(function (c) { return c[k] && c[k] !== "none"; });
        if (hit.length) html += '<tr><td>' + esc(SYMPTOMS[k].label) + '</td><td>Reported ' + hit.length + ' day' + (hit.length > 1 ? "s" : "") + '</td><td>First: ' + hit[0].day + '</td></tr>';
      });
      html += '</tbody></table>';

      // Group repeated flags (for example "ongoing ringing" on days 7 to 10) into one line.
      var groups = [], byKey = {};
      rows.forEach(function (c) { c.result.findings.forEach(function (f) {
        var k = f.id + "|" + f.level;
        if (!byKey[k] || /^(fever|warm)$/.test(f.id)) { byKey[k] = { f: f, days: [] }; groups.push(byKey[k]); }
        byKey[k].days.push(c.day);
      }); });
      if (groups.length) {
        html += '<h3 style="margin-top:18px">Flags raised</h3><ul class="list">' + groups.map(function (g) {
          return '<li class="row" style="justify-content:space-between"><span>' + esc(dayList(g.days)) + ': ' + esc(g.f.title) + '</span>' + levelBadge(g.f.level) + '</li>'; }).join("") + '</ul>';
      }
      var notes = rows.filter(function (c) { return c.notes; });
      if (notes.length) html += '<h3 style="margin-top:18px">Notes</h3><ul class="list">' + notes.map(function (c) { return '<li>Day ' + c.day + ': ' + esc(c.notes) + '</li>'; }).join("") + '</ul>';
    }
    html += '</div>';

    // Questions
    var auto = suggestedQuestions(rows);
    html += '<div class="panel"><h2 style="margin-top:0">Questions to ask</h2><ul class="list">' +
      auto.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join("") +
      (state.questions || []).map(function (q, i) { return '<li class="row" style="justify-content:space-between"><span>' + esc(q) + '</span><button class="linkish no-print" data-delq="' + i + '">Remove</button></li>'; }).join("") +
      '</ul><form id="qform" class="row no-print" style="margin-top:12px"><input name="q" type="text" placeholder="Add your own question" aria-label="Add your own question" style="flex:1;min-width:200px"><button class="btn secondary" type="submit">Add</button></form></div>';

    html += '<div class="row no-print"><button class="btn" data-action="print">Print or save as PDF</button><a class="btn secondary" href="#/report">Understand a scan or lab report</a></div>';
    return html;
  }

  /* [7,8,9,10] -> "Days 7 to 10"; [2,6] -> "Days 2 and 6"; [3] -> "Day 3" */
  function dayList(days) {
    if (days.length === 1) return "Day " + days[0];
    var consecutive = days.every(function (d, i) { return i === 0 || d === days[i - 1] + 1; });
    if (consecutive) return "Days " + days[0] + " to " + days[days.length - 1];
    return "Days " + days.slice(0, -1).join(", ") + " and " + days[days.length - 1];
  }

  function suggestedQuestions(rows) {
    var q = [], seen = {};
    function add(s) { if (!seen[s]) { seen[s] = true; q.push(s); } }
    rows.forEach(function (c) {
      c.result.findings.forEach(function (f) {
        if (f.id === "fever") add("I had a fever on day " + c.day + ". What should I do differently if it happens again?");
        if (f.id === "ears") add("I noticed ringing or a hearing change. Should my hearing be tested before the next cycle?");
        if (f.id === "numbness") add("The numbness or tingling is new. Could the dose be adjusted?");
        if (f.id === "vomit" || f.id === "nausea-severe") add("Can we change my anti-nausea plan?");
        if (f.id === "urine" || f.id === "fluids") add("Should my kidney function be checked? How much should I drink each day?");
        if (/-timing$/.test(f.id)) add("I had " + SYMPTOMS[f.symptom].label.toLowerCase() + " on day " + c.day + ", which isn't the usual time. Is that a concern?");
      });
      (c.result.expected || []).forEach(function (e) {
        if (e.symptom === "nausea" && parseFloat(c.nausea) >= 2) add("Nausea got to moderate in the days after treatment. Is there a better medicine for the delayed nausea?");
      });
    });
    add("When are my blood counts usually lowest on this regimen?");
    add("Which number should I call after hours, and when should I go to the ER instead?");
    return q;
  }

  /* =========================================================
   * REPORT READER
   * ========================================================= */
  function reportScreen() {
    return '<h1>Understand a report</h1><p class="lead">Paste the text of a scan or lab report. Medical words will be highlighted with plain-English meanings.</p>' +
      '<div class="panel stack"><label class="label" for="reportText">Report text</label><textarea id="reportText" placeholder="Paste report text here">' + esc(state.lastReport || "") + '</textarea>' +
      '<div class="row"><button class="btn" data-action="explain">Explain the words</button><button class="linkish" data-action="sample-report">Use a sample CT report</button></div></div>' +
      '<div id="reportOut"></div><p class="small muted">This explains words, not what they mean for one person. Bring your questions to the care team.</p>';
  }

  var termRegex = null;
  function getTermRegex() {
    if (termRegex) return termRegex;
    var terms = Object.keys(BV.data.GLOSSARY).sort(function (a, b) { return b.length - a.length; });
    termRegex = new RegExp("\\b(" + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")\\b", "gi");
    return termRegex;
  }
  function runReport() {
    var text = state.lastReport;
    var out = document.getElementById("reportOut");
    if (!out || !text) return;
    var found = {}, html = "", last = 0, re = getTermRegex(), m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      var key = m[1].toLowerCase();
      // "EGFR" in capitals on a tumor report is a gene, not kidney function. Skip the kidney meaning there.
      if (key === "egfr" && m[1] === "EGFR") continue;
      html += esc(text.slice(last, m.index)) + '<mark class="term" tabindex="0" role="button" aria-expanded="false" data-term="' + esc(key) + '">' + esc(m[1]) + '</mark>';
      last = m.index + m[1].length; found[key] = true;
    }
    html += esc(text.slice(last));
    var keys = Object.keys(found);
    out.innerHTML = '<div class="panel"><p class="small muted">' + keys.length + ' term' + (keys.length === 1 ? "" : "s") + ' found. Tap a highlighted word.</p><div class="report-out">' + html + '</div>' +
      '<div id="def" class="definition hide" aria-live="polite"></div></div>' +
      (keys.length ? '<div class="panel"><h2 style="margin-top:0">All terms in this report</h2><dl class="terms">' + keys.map(function (k) {
        return '<dt>' + esc(termName(k)) + '</dt><dd>' + esc(BV.data.GLOSSARY[k]) + '</dd>'; }).join("") + '</dl></div>' : "");
  }
  var ABBREVIATIONS = { ct: "CT", pet: "PET", mri: "MRI", suv: "SUV", anc: "ANC", wbc: "WBC", egfr: "eGFR", recist: "RECIST", "fdg-avid": "FDG-avid" };
  function termName(k) { return ABBREVIATIONS[k] || k.charAt(0).toUpperCase() + k.slice(1); }
  function showTerm(el) {
    Array.prototype.forEach.call(document.querySelectorAll("mark.term"), function (m) { m.setAttribute("aria-expanded", "false"); });
    el.setAttribute("aria-expanded", "true");
    var key = el.getAttribute("data-term"), def = document.getElementById("def");
    def.innerHTML = '<strong>' + esc(termName(key)) + '</strong><br>' + esc(BV.data.GLOSSARY[key]);
    def.classList.remove("hide");
  }

  /* =========================================================
   * FAMILY (sender)
   * ========================================================= */
  function caregiverTips(reg, day) {
    var tips = reg.watch.filter(function (w) { return triage.inWindow(day, w); }).map(function (w) { return w.caregiver; });
    var effects = reg.effects.filter(function (e) { return triage.inWindow(day, e); });
    if (effects.some(function (e) { return e.symptom === "nausea"; })) tips.push("Offer small, bland snacks and cold foods. Strong cooking smells can make nausea worse.");
    if (effects.some(function (e) { return e.symptom === "fatigue"; })) tips.push("Take one chore off their list today, like a meal, a ride, or the dishes.");
    tips.push("Ask how they are feeling today, and listen. Not every conversation has to be about the cancer.");
    return tips;
  }
  function shareLink() { return location.href.split("#")[0] + "#family=" + core.makeShare(state); }
  function textUpdate() {
    var ci = core.cycleInfo(state.profile), reg = regimen(), c = state.checkins[state.checkins.length - 1];
    var s = "Update on " + patient() + ": cycle " + ci.cycle + ", day " + ci.day + " of " + ci.length + " (" + reg.name + "). ";
    if (c) {
      s += (c.date === today() ? "Today's" : "Last") + " check-in: " + c.result.levelInfo.title.toLowerCase() + ". ";
      if (c.result.findings.length) s += "Flag: " + c.result.findings[0].title + ". ";
      if (c.result.expected.length) s += "Expected right now: " + c.result.expected.map(function (e) { return SYMPTOMS[e.symptom].label.toLowerCase(); }).join(", ") + ". ";
    }
    var w = reg.watch.filter(function (x) { return triage.inWindow(ci.day, x); });
    if (w.length) s += "Watch: " + w.map(function (x) { return x.label.toLowerCase(); }).join(", ") + ". ";
    return s + "(Sent from Between Visits)";
  }
  function familyScreen() {
    var ci = core.cycleInfo(state.profile), reg = regimen();
    var html = '<h1>Keep family in the loop</h1><p class="lead">Send a link that shows the latest check-in and how to help this week. No account needed, and nothing is stored on a server.</p>';
    html += '<div class="panel stack"><button class="btn block" data-action="copy-link">Copy family link</button>' +
      '<button class="btn secondary block" data-action="copy-text">Copy a text-message update</button>' +
      '<a class="btn secondary block" href="' + esc(shareLink()) + '" target="_blank" rel="noopener">Preview what family sees</a>' +
      '<p class="small muted" style="margin:0">The link is a snapshot. Send a new one after each check-in.</p></div>';
    html += '<h2>The text update</h2><div class="panel"><p style="margin:0">' + esc(textUpdate()) + '</p></div>';
    if (ci.day) {
      html += '<h2>How family can help on day ' + ci.day + '</h2><div class="panel"><ul class="list">' + caregiverTips(reg, ci.day).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul></div>';
    }
    return html;
  }

  /* =========================================================
   * FAMILY (viewer, opened from a shared link)
   * ========================================================= */
  function familyViewer(code) {
    var d = core.readShare(code);
    if (!d) return '<h1>This link didn\'t open</h1><p>The family link may have been cut off when it was copied. Ask for a new one.</p><a class="btn" href="#/today">Open Between Visits</a>';
    var reg = REGIMENS[d.r] || REGIMENS.other;
    var ci = core.cycleInfo({ cycleStarts: d.s, cycleLength: d.len, firstCycleNumber: d.fc });
    var last = d.c[d.c.length - 1];
    var hours = Math.round((Date.now() - d.at) / 36e5);
    var ago = hours < 1 ? "less than an hour ago" : hours < 48 ? hours + " hour" + (hours === 1 ? "" : "s") + " ago" : Math.round(hours / 24) + " days ago";
    var html = '<h1>Update on ' + esc(d.n) + '</h1><p class="lead">Shared ' + ago + '. ' + (ci.day ? 'Today is cycle ' + ci.cycle + ', day ' + ci.day + ' of ' + ci.length + '.' : "") + '</p>';
    if (last) {
      var L = triage.LEVELS[last.l];
      html += '<div class="level l' + last.l + '"><p class="small" style="margin:0 0 4px">Latest check-in, ' + esc(core.prettyDate(last.d)) + ' (day ' + last.dy + ')</p><h2 style="margin:0 0 6px">' + esc(L.title) + '</h2>' +
        (last.f.length ? '<p style="margin:0">' + last.f.map(esc).join(". ") + '.</p>' : '') +
        (last.e.length ? '<p class="small" style="margin:6px 0 0">Expected right now: ' + last.e.map(function (s) { return esc(SYMPTOMS[s].label.toLowerCase()); }).join(", ") + '.</p>' : '') + '</div>';
      html += '<h2>Last ' + d.c.length + ' check-ins</h2><div class="pack"><div class="pack-grid" role="list">' + d.c.map(function (c) {
        return '<div class="pocket done l' + c.l + '" role="listitem" aria-label="Day ' + c.dy + ': ' + esc(triage.LEVELS[c.l].short) + '">' + c.dy + '</div>'; }).join("") + '</div></div>';
    } else {
      html += '<div class="panel"><p style="margin:0">No check-ins yet.</p></div>';
    }
    if (ci.day) {
      html += '<h2>How you can help today</h2><div class="panel"><ul class="list">' + caregiverTips(reg, ci.day).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul></div>';
    }
    html += '<p class="small muted">Questions about symptoms should go to ' + esc(possessive(d.n)) + ' care team. In an emergency, call 911.</p>';
    return html;
  }

  /* =========================================================
   * KENTUCKY RESOURCES
   * ========================================================= */
  function kentuckyScreen() {
    var KY = BV.data.KY, county = state.profile.county || "";
    var dKey = KY.COUNTIES[county], d = dKey && KY.DISTRICTS[dKey];
    var html = '<h1>Help in Kentucky</h1><p class="lead">Local people and programs that help with rides, costs, and finding care. Most of it is free.</p>' +
      '<div class="panel"><label class="label" for="kyCounty">County</label><select id="kyCounty">' + countyOptions(county) + '</select></div>';

    if (d) {
      html += '<h2>Near ' + esc(county) + ' County</h2><div class="panel stack">' +
        '<h3>Kentucky Cancer Program, ' + esc(d.name) + '</h3>' +
        '<p class="small" style="margin:0">A free regional office run by UK and the University of Louisville. Staff live in the area and can connect you with local support groups, financial help, and the closest treatment options.</p>' +
        '<a class="btn secondary block" href="' + telHref(d.kcp.phone) + '">Call the ' + esc(d.kcp.city) + ' office ' + esc(d.kcp.phone) + '</a>' +
        (d.kcp.alt ? '<p class="small muted" style="margin:0">Second Bluegrass office line: <a href="' + telHref(d.kcp.alt) + '">' + esc(d.kcp.alt) + '</a></p>' : "") + '</div>';
      html += '<h2>Cancer treatment centers in the region</h2>';
      if (d.centers.length) html += '<div class="panel"><ul class="list">' + d.centers.map(function (c) {
        return '<li><strong>' + (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.name) + '</a>' : esc(c.name)) + '</strong><div class="small muted">' + esc(c.city) + ', KY</div></li>'; }).join("") + '</ul></div>';
      else html += '<p class="muted">Ask your Kentucky Cancer Program office above for the closest treatment center. Many families here travel to a larger center for some treatments.</p>';
    } else if (county === "other") {
      html += '<p class="muted">Every Kentucky county has a Kentucky Cancer Program office. Find yours with Pathfinder below.</p>';
    } else {
      html += '<p class="muted">Choose a county to see your nearest Kentucky Cancer Program office and cancer centers.</p>';
    }

    html += '<h2>Anywhere in Kentucky</h2><div class="panel"><ul class="list">' + KY.STATEWIDE.map(function (r) {
      return '<li><h3>' + esc(r.name) + '</h3><p class="small" style="margin:2px 0 6px">' + esc(r.text) + '</p><div class="row">' +
        (r.phone ? '<a href="' + telHref(r.phone) + '">' + esc(r.display || r.phone) + '</a>' : "") +
        (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">Website</a>' : "") + '</div></li>'; }).join("") + '</ul></div>';
    html += '<p class="small muted">Checked October 2026. Sources: ' + KY.SOURCES.map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>'; }).join("; ") + '.</p>';
    return html;
  }

  /* =========================================================
   * SETTINGS
   * ========================================================= */
  function settingsScreen() {
    var p = state.profile, s = state.settings || {};
    var starts = p.cycleStarts || [];
    var opts = Object.keys(REGIMENS).map(function (k) { return '<option value="' + k + '"' + (k === p.regimen ? " selected" : "") + '>' + esc(REGIMENS[k].name) + '</option>'; }).join("");
    return '<h1>Settings</h1>' +
      '<form id="settings" class="panel stack">' +
        '<label class="label" for="s-name">Patient\'s first name</label><input id="s-name" name="patientName" type="text" value="' + esc(p.patientName) + '">' +
        '<label class="label" for="s-county">Kentucky county</label><select id="s-county" name="county">' + countyOptions(p.county || "") + '</select>' +
        '<label class="label" for="s-reg">Chemo regimen</label><select id="s-reg" name="regimen">' + opts + '</select>' +
        '<label class="label" for="s-start">Infusion day of the current cycle</label><input id="s-start" name="start" type="date" value="' + esc(starts[starts.length - 1] || today()) + '">' +
        '<p class="hint">Treatment delayed? Change this date and the cycle days will update.</p>' +
        '<label class="label" for="s-day">Care team phone (daytime)</label><input id="s-day" name="dayPhone" type="tel" value="' + esc(p.dayPhone || "") + '">' +
        '<label class="label" for="s-night">After-hours or 24-hour line</label><input id="s-night" name="nightPhone" type="tel" value="' + esc(p.nightPhone || "") + '">' +
        '<button class="btn" type="submit">Save changes</button>' +
      '</form>' +
      '<div class="panel stack"><button class="btn secondary" data-action="new-cycle">Start a new cycle today</button></div>' +
      '<div class="panel"><fieldset><legend>Text size</legend><div class="seg">' +
        segOpt("size", "normal", "Normal", (s.size || "normal") === "normal") + segOpt("size", "large", "Large", s.size === "large") + segOpt("size", "xlarge", "Extra large", s.size === "xlarge") +
      '</div></fieldset><fieldset style="margin:0"><legend>Appearance</legend><div class="seg">' +
        segOpt("theme", "auto", "Match device", (s.theme || "auto") === "auto") + segOpt("theme", "light", "Light", s.theme === "light") + segOpt("theme", "dark", "Dark", s.theme === "dark") +
      '</div></fieldset></div>' +
      '<div class="panel stack"><h2 style="margin-top:0">Your data</h2><p class="small">Everything is saved only in this browser on this device.</p>' +
        '<button class="btn secondary" data-action="export">Download a copy (JSON)</button>' +
        '<button class="btn secondary" data-action="demo">Replace with sample data</button>' +
        '<button class="btn danger" data-action="erase">Erase everything</button></div>' +
      '<h2>Where the information comes from</h2><div class="panel"><ul class="list">' + regimenSources() + '</ul></div>';
  }
  function regimenSources() {
    var seen = {}, out = "";
    Object.keys(REGIMENS).forEach(function (k) { REGIMENS[k].sources.forEach(function (s) {
      if (seen[s.url]) return; seen[s.url] = true;
      out += '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></li>'; }); });
    return out;
  }
  function saveSettings(form) {
    var f = new FormData(form), p = state.profile;
    p.patientName = (f.get("patientName") || "").trim() || p.patientName;
    p.county = f.get("county") || "";
    p.regimen = f.get("regimen"); p.cycleLength = REGIMENS[p.regimen].cycleLength;
    var start = f.get("start");
    if (start) p.cycleStarts[p.cycleStarts.length - 1] = start;
    p.cycleStarts.sort();
    p.dayPhone = f.get("dayPhone"); p.nightPhone = f.get("nightPhone");
    persist(); toast("Changes saved"); render();
  }

  /* =========================================================
   * SAMPLE DATA (for trying the app and for the demo video)
   * ========================================================= */
  function loadDemo() {
    var t = today(), c2 = core.addDays(t, -10), c1 = core.addDays(c2, -21);
    state = {
      profile: { role: "helper", patientName: "Mary", county: "McCracken", regimen: "cis-pem", cycleLength: 21, cycleStarts: [c1, c2], firstCycleNumber: 1,
                 dayPhone: "(270) 555-0142", nightPhone: "(270) 555-0199" },
      checkins: [], questions: ["Is it safe to travel to my granddaughter's graduation during cycle 3?"], settings: (state && state.settings) || { size: "normal", theme: "auto" }
    };
    var reg = REGIMENS["cis-pem"];
    function make(cycle, start, day, v) {
      var e = Object.assign({ date: core.addDays(start, day - 1), time: "09:" + String(10 + day).padStart(2, "0"), cycle: cycle, day: day,
        nausea: "0", vomit: "0", fluids: "yes", urine: "normal", appetite: "0", fatigue: "0", diarrhea: "0", mouth: "0", rash: "0", numbness: "none", ears: "none" }, v);
      e.result = triage.evaluate(e, { regimen: reg, day: day });
      state.checkins.push(e);
    }
    var nausea = { 1: 1, 2: 2, 3: 2, 4: 1, 5: 1 }, appetite = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 1, 6: 1 }, fatigue = { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 7: 1, 8: 1, 9: 1 };
    var temps = ["98.4", "98.6", "98.2", "98.7", "98.5", "98.9", "98.3", "98.6", "98.8"];
    for (var d = 1; d <= 21; d++) {
      if (d === 6 || d === 13 || d === 18) continue; // missed days look real
      var v = { nausea: String(nausea[d] || 0), appetite: String(appetite[d] || 0), fatigue: String(fatigue[d] || 0), temp: temps[d % temps.length] };
      if (d === 2) v.vomit = "1";
      if (d >= 8 && d <= 10) v.mouth = d === 9 ? "2" : "1";
      if (d === 10) { v.temp = "100.6"; v.notes = "Felt chilled after lunch. Called the after-hours line, went in for labs."; }
      if (d === 16) v.nausea = "2";
      make(1, c1, d, v);
    }
    for (var d2 = 1; d2 <= 10; d2++) {
      var v2 = { nausea: String(nausea[d2] || 0), appetite: String(appetite[d2] || 0), fatigue: String(fatigue[d2] || 0), temp: temps[(d2 + 3) % temps.length] };
      if (d2 === 3) v2.nausea = "2";
      if (d2 === 2) v2.urine = "less";
      if (d2 === 6) v2.ears = "new";
      if (d2 > 6) v2.ears = "ongoing";
      if (d2 === 9) v2.temp = "99.7";
      make(2, c2, d2, v2);
    }
    persist(); go("today"); render();
    toast("Sample data loaded");
  }

  /* =========================================================
   * EVENTS
   * ========================================================= */
  var eraseArmed = false;
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-nav],[data-action],[data-step],[data-trend],[data-cycle],[data-vcycle],[data-delq],mark.term");
    if (!el) return;
    if (el.matches("mark.term")) { showTerm(el); return; }
    if (el.hasAttribute("data-nav")) { go(el.getAttribute("data-nav")); return; }
    if (el.hasAttribute("data-step")) {
      var key = el.getAttribute("data-step"), input = document.querySelector('input[name="' + key + '"]');
      var n = Math.max(0, Math.min(20, (parseInt(input.value, 10) || 0) + parseInt(el.getAttribute("data-dir"), 10)));
      input.value = n; document.getElementById("out-" + key).textContent = n; return;
    }
    if (el.hasAttribute("data-trend")) { trendSymptom = el.getAttribute("data-trend"); render(); return; }
    if (el.hasAttribute("data-cycle")) { trendCycle = parseInt(el.getAttribute("data-cycle"), 10); render(); return; }
    if (el.hasAttribute("data-vcycle")) { visitCycle = parseInt(el.getAttribute("data-vcycle"), 10); render(); return; }
    if (el.hasAttribute("data-delq")) { state.questions.splice(parseInt(el.getAttribute("data-delq"), 10), 1); persist(); render(); return; }

    switch (el.getAttribute("data-action")) {
      case "demo": loadDemo(); break;
      case "new-cycle":
        state.profile.cycleStarts.push(today()); state.profile.cycleStarts = Array.from(new Set(state.profile.cycleStarts)).sort();
        persist(); toast("New cycle started today"); go("today"); render(); break;
      case "print": window.print(); break;
      case "copy-link": copyText(shareLink(), "Family link copied"); break;
      case "copy-text": copyText(textUpdate(), "Text update copied"); break;
      case "sample-report": state.lastReport = BV.data.SAMPLE_REPORT; persist(); render(); break;
      case "explain": state.lastReport = document.getElementById("reportText").value; persist(); runReport(); break;
      case "export":
        var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "between-visits-data.json"; a.click(); break;
      case "erase":
        if (!eraseArmed) { eraseArmed = true; el.textContent = "Tap again to erase everything"; setTimeout(function () { eraseArmed = false; if (el.isConnected) el.textContent = "Erase everything"; }, 4000); }
        else { core.clear(); state = null; eraseArmed = false; location.hash = ""; render(); }
        break;
    }
  });
  document.addEventListener("keydown", function (ev) {
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches("mark.term")) { ev.preventDefault(); showTerm(ev.target); }
  });
  document.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var id = ev.target.id;
    if (id === "setup") saveSetup(ev.target);
    if (id === "checkin") saveCheckin(ev.target);
    if (id === "settings") saveSettings(ev.target);
    if (id === "qform") { var q = ev.target.q.value.trim(); if (q) { state.questions = state.questions || []; state.questions.push(q); persist(); render(); } }
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.id === "reg") document.getElementById("regHint").textContent = REGIMENS[ev.target.value].usedFor;
    if (ev.target.id === "kyCounty") { state.profile.county = ev.target.value; persist(); render(); }
    if (ev.target.name === "size" || ev.target.name === "theme") {
      state.settings = state.settings || {}; state.settings[ev.target.name] = ev.target.value; persist(); applySettings();
      if (chart) render();
    }
  });
  window.addEventListener("hashchange", render);

  applySettings();
  render();
})();
