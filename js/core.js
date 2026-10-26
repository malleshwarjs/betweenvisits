/*
 * Between Visits: storage, cycle math, and the family share link.
 * Everything is saved only on this device (localStorage). Nothing is sent to a server.
 */
(function (root) {
  var KEY = "between-visits-v1";
  var DAY_MS = 24 * 60 * 60 * 1000;

  /* ---------- dates ---------- */
  function ymd(d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }
  function parseYmd(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysBetween(a, b) { return Math.round((parseYmd(ymd(b)) - parseYmd(ymd(a))) / DAY_MS); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function prettyDate(s) {
    return parseYmd(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  /* ---------- storage ---------- */
  var memoryFallback = null;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return memoryFallback; }
  }
  function save(state) {
    memoryFallback = state;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep in memory */ }
  }
  function clear() {
    memoryFallback = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* ---------- cycle math ----------
   * profile.firstCycleStart = the date of cycle 1, day 1.
   * profile.cycleStarts = list of actual start dates (cycles can be delayed).
   */
  function cycleInfo(profile, onDate) {
    var date = ymd(onDate || new Date());
    var starts = (profile.cycleStarts || []).slice().sort();
    var len = profile.cycleLength || 21;
    var idx = -1;
    for (var i = 0; i < starts.length; i++) if (starts[i] <= date) idx = i;
    if (idx === -1) return { cycle: 0, day: 0, length: len, start: null, before: true, daysUntil: starts.length ? daysBetween(date, starts[0]) : null };
    var day = daysBetween(starts[idx], date) + 1;
    return { cycle: (profile.firstCycleNumber || 1) + idx, day: day, length: len, start: starts[idx], overdue: day > len };
  }

  /* ---------- family share link ----------
   * The latest status is packed into the link itself (after the #),
   * so a family member can open it without an account and without a server.
   */
  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = ""; bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function makeShare(state) {
    var p = state.profile;
    var recent = state.checkins.slice(-7).map(function (c) {
      return { d: c.date, cy: c.cycle, dy: c.day, l: c.result.level,
               f: c.result.findings.slice(0, 3).map(function (f) { return f.title; }),
               e: c.result.expected.map(function (e) { return e.symptom; }),
               t: c.temp || null };
    });
    var payload = { v: 1, n: p.patientName, r: p.regimen, s: p.cycleStarts, fc: p.firstCycleNumber || 1, len: p.cycleLength, at: Date.now(), c: recent };
    return b64urlEncode(JSON.stringify(payload));
  }
  function readShare(code) {
    try { return JSON.parse(b64urlDecode(code)); } catch (e) { return null; }
  }

  var api = { ymd: ymd, parseYmd: parseYmd, daysBetween: daysBetween, addDays: addDays, prettyDate: prettyDate,
              load: load, save: save, clear: clear, cycleInfo: cycleInfo, makeShare: makeShare, readShare: readShare };
  root.BV = root.BV || {};
  root.BV.core = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
