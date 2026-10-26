/*
 * Between Visits: triage engine
 * -----------------------------
 * Turns one daily check-in into a clear next step.
 *
 * It does two things:
 *   1. SAFETY RULES: checks the answers against published "call your care team"
 *      thresholds (for example CDC's 100.4°F fever rule). Each rule has a level.
 *   2. TIMING CHECK: compares each symptom to the regimen's expected window.
 *      Nausea on day 3 after cisplatin is expected, so the app reassures.
 *      The same nausea on day 16 is unusual, so the app says to mention it.
 *
 * The highest level found becomes the headline for the day.
 * This is a pure function (no screen code), so it can be tested on its own.
 */
(function (root) {
  var LEVELS = {
    4: { key: "emergency", title: "Call 911 now", short: "Emergency" },
    3: { key: "now",       title: "Call your care team now", short: "Call now" },
    2: { key: "today",     title: "Call your care team today", short: "Call today" },
    1: { key: "visit",     title: "Mention at your next visit", short: "Note for visit" },
    0: { key: "ok",        title: "Nothing urgent today", short: "Okay" }
  };

  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

  function inWindow(day, w) { return day >= w.start && day <= w.end; }

  /* Safety rules. Each returns a finding or null. Ordered roughly by severity. */
  var RULES = [
    function emergency(c) {
      var signs = [];
      if (c.breathing) signs.push("trouble breathing");
      if (c.chest) signs.push("chest pain");
      if (c.swelling) signs.push("swelling of the face, lips, or throat");
      if (c.confusion) signs.push("new confusion");
      if (!signs.length) return null;
      return { id: "emergency", level: 4, symptom: null,
        title: "Emergency warning signs",
        text: "You reported " + signs.join(", ") + ". Call 911. Tell them the patient is getting chemotherapy." };
    },
    function fever(c) {
      var t = num(c.temp);
      if (t === null) return null;
      if (t >= 100.4) return { id: "fever", level: 3, symptom: "temp",
        title: "Fever of " + t.toFixed(1) + "°F",
        text: "During chemo, a temperature of 100.4°F or higher can be a sign of a serious infection. Call your care team's 24-hour line now. If you go to the ER, tell them about the chemo.",
        source: "CDC" };
      if (t >= 99.5) return { id: "warm", level: 1, symptom: "temp",
        title: "Slightly warm (" + t.toFixed(1) + "°F)",
        text: "Recheck in about an hour. If it reaches 100.4°F, call your care team right away." };
      return null;
    },
    function fluids(c) {
      if (c.fluids !== "no") return null;
      return { id: "fluids", level: 3, symptom: "fluids",
        title: "Can't keep fluids down",
        text: "Staying hydrated protects the kidneys, especially after cisplatin. You may need IV fluids. Call your care team now." };
    },
    function bleeding(c) {
      if (!c.bleeding) return null;
      return { id: "bleeding", level: 3, symptom: "bleeding",
        title: "Unusual bleeding or bruising",
        text: "This can mean platelets are low. Call your care team now." };
    },
    function vomiting(c) {
      var v = num(c.vomit);
      if (v === null || v < 2) return null;
      return { id: "vomit", level: 2, symptom: "vomit",
        title: "Vomited " + v + " times",
        text: "Vomiting more than once in a day, even with anti-nausea medicine, is a reason to call. Your team may change the medicine." };
    },
    function diarrhea(c) {
      var d = num(c.diarrhea);
      if (d === null || d < 4) return null;
      return { id: "diarrhea", level: 2, symptom: "diarrhea",
        title: d + " extra bowel movements",
        text: "4 or more extra bowel movements in a day can cause dehydration. Call your care team today." };
    },
    function urine(c, ctx) {
      if (c.urine === "much") return { id: "urine", level: 2, symptom: "urine",
        title: "Peeing much less than usual",
        text: "Less urine can be a sign of dehydration or kidney stress. Call your care team today and keep sipping fluids." };
      if (c.urine === "less") {
        var hydrating = ctx.watch.some(function (w) { return w.id === "hydration"; });
        return { id: "urine", level: hydrating ? 2 : 1, symptom: "urine",
          title: "Peeing a little less than usual",
          text: hydrating
            ? "These are the days the kidneys need extra fluid. Drink more, and call your care team today if it doesn't improve."
            : "Drink a bit more. Mention it at your next visit if it continues." };
      }
      return null;
    },
    function ears(c) {
      if (c.ears === "new") return { id: "ears", level: 2, symptom: "ears",
        title: "New ringing in the ears or hearing change",
        text: "Cisplatin can affect hearing. Your team wants to know early, because they may adjust the dose. Call today." };
      if (c.ears === "ongoing") return { id: "ears", level: 1, symptom: "ears",
        title: "Ongoing ringing or hearing change",
        text: "Keep your team updated at each visit. Hearing changes can build up over several cycles." };
      return null;
    },
    function numbness(c) {
      if (c.numbness === "new") return { id: "numbness", level: 2, symptom: "numbness",
        title: "New numbness or tingling",
        text: "Nerve changes in the hands or feet can build up with platinum drugs and paclitaxel. Let your team know today." };
      if (c.numbness === "ongoing") return { id: "numbness", level: 1, symptom: "numbness",
        title: "Ongoing numbness or tingling",
        text: "Mention it at your next visit, especially if it is getting worse or making buttons or walking harder." };
      return null;
    },
    function severeScores(c) {
      var out = [];
      if (num(c.nausea) >= 3) out.push({ id: "nausea-severe", level: 2, symptom: "nausea",
        title: "Severe nausea", text: "If nausea is stopping you from eating or drinking, your team can try a different medicine. Call today." });
      if (num(c.mouth) >= 3) out.push({ id: "mouth-severe", level: 2, symptom: "mouth",
        title: "Mouth sores stopping eating or drinking", text: "Call your care team today. They can prescribe a rinse or pain relief." });
      if (num(c.rash) >= 2) out.push({ id: "rash", level: 2, symptom: "rash",
        title: "Uncomfortable rash", text: "Let your care team know today. They may adjust your steroid or give a cream." });
      if (num(c.fatigue) >= 3) out.push({ id: "fatigue-severe", level: 2, symptom: "fatigue",
        title: "In bed most of the day", text: "Extreme tiredness can have treatable causes, like low blood counts or dehydration. Call today." });
      return out;
    }
  ];

  /* Symptoms that can be compared against the regimen's timing windows. */
  var TIMED = ["nausea", "appetite", "fatigue", "diarrhea", "rash", "mouth", "aches"];

  /**
   * evaluate(checkin, context) -> { level, levelInfo, findings[], expected[], reminders[] }
   *   checkin: the answers from today's form
   *   context: { regimen, day }  (day = cycle day, 1 = infusion day)
   */
  function evaluate(checkin, context) {
    var regimen = context.regimen;
    var day = context.day;
    var watch = (regimen.watch || []).filter(function (w) { return inWindow(day, w); });
    var ctx = { day: day, regimen: regimen, watch: watch };

    // 1) Safety rules
    var findings = [];
    RULES.forEach(function (rule) {
      var r = rule(checkin, ctx);
      if (!r) return;
      findings = findings.concat(Array.isArray(r) ? r : [r]);
    });
    var flagged = {};
    findings.forEach(function (f) { if (f.symptom) flagged[f.symptom] = true; });

    // 2) Timing check: is this symptom expected right now?
    var expected = [];
    TIMED.forEach(function (sym) {
      var score = num(checkin[sym]);
      if (!score || score <= 0) return;
      var eff = (regimen.effects || []).find(function (e) { return e.symptom === sym; });
      if (eff && inWindow(day, eff)) {
        var atPeak = eff.peak && day >= eff.peak[0] && day <= eff.peak[1];
        expected.push({ symptom: sym, atPeak: atPeak, what: eff.what, tips: eff.tips,
          window: "days " + eff.start + " to " + eff.end, flagged: !!flagged[sym] });
      } else if (!flagged[sym] && score >= 2 && regimen.effects && regimen.effects.length) {
        var when = eff ? " It is usually most common on days " + eff.start + " to " + eff.end + "." : "";
        findings.push({ id: sym + "-timing", level: 1, symptom: sym,
          title: "Unusual timing: " + labelFor(sym).toLowerCase() + " on day " + day,
          text: "This is not when this symptom usually shows up for " + regimen.name + "." + when + " Mention it to your team, sooner if it gets worse." });
      }
    });

    // 3) Cumulative side effects the regimen asks us to always report
    // (already covered by the ears/numbness rules; nothing extra to add here)

    findings.sort(function (a, b) { return b.level - a.level; });
    var level = findings.length ? findings[0].level : 0;

    return {
      level: level,
      levelInfo: LEVELS[level],
      findings: findings,
      expected: expected,
      reminders: watch
    };
  }

  function labelFor(sym) {
    var S = (root.BV && root.BV.data && root.BV.data.SYMPTOMS) || {};
    return (S[sym] && S[sym].label) || sym;
  }

  var api = { evaluate: evaluate, LEVELS: LEVELS, inWindow: inWindow };
  root.BV = root.BV || {};
  root.BV.triage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
