/*
 * Tests for the triage engine. Run with:  node tests/triage.test.js
 * Each case is a check-in and the result we expect.
 */
require("../js/data/regimens.js");
var triage = require("../js/triage.js");
var REG = globalThis.BV.data.REGIMENS;

var base = { nausea: "0", vomit: "0", fluids: "yes", urine: "normal", appetite: "0", fatigue: "0", diarrhea: "0", mouth: "0", rash: "0", numbness: "none", ears: "none" };
function run(changes, day, reg) { return triage.evaluate(Object.assign({}, base, changes), { regimen: REG[reg || "cis-pem"], day: day }); }

var cases = [
  ["All normal is okay", run({}, 12), 0],
  ["Fever of 100.4 means call now (CDC)", run({ temp: "100.4" }, 10), 3],
  ["100.3 is only a recheck", run({ temp: "100.3" }, 10), 1],
  ["Trouble breathing means 911", run({ breathing: true }, 4), 4],
  ["Can't keep fluids down means call now", run({ fluids: "no" }, 2), 3],
  ["Vomiting twice means call today", run({ vomit: "2" }, 3), 2],
  ["Moderate nausea on day 3 is expected, no call", run({ nausea: "2" }, 3), 0],
  ["Moderate nausea on day 16 is unusual timing", run({ nausea: "2" }, 16), 1],
  ["Less urine during hydration days means call today", run({ urine: "less" }, 2), 2],
  ["Less urine later means mention at visit", run({ urine: "less" }, 12), 1],
  ["New ringing in ears means call today", run({ ears: "new" }, 6), 2],
  ["4 extra stools means call today", run({ diarrhea: "4" }, 4), 2],
  ["Aches on day 3 are expected with paclitaxel", run({ aches: "2" }, 3, "carbo-pacli"), 0],
  ["Other regimen never flags timing", run({ nausea: "2" }, 16, "other"), 0],
  ["Carbo/pem: rash on day 4 is expected", run({ rash: "1" }, 4, "carbo-pem"), 0],
  ["Carbo/pem: moderate nausea on day 8 is unusual timing", run({ nausea: "2" }, 8, "carbo-pem"), 1],
  ["Carbo/pem: fever in the infection window means call now", run({ temp: "101.2" }, 10, "carbo-pem"), 3]
];

var failed = 0;
cases.forEach(function (c) {
  var ok = c[1].level === c[2];
  if (!ok) failed++;
  console.log((ok ? "PASS " : "FAIL ") + c[0] + (ok ? "" : "  (got level " + c[1].level + ", expected " + c[2] + ")"));
});
var exp = run({ nausea: "2" }, 3).expected[0];
console.log(exp && exp.atPeak ? "PASS Day 3 nausea is marked as the usual peak" : (failed++, "FAIL peak detection"));
console.log("\n" + (cases.length + 1 - failed) + " of " + (cases.length + 1) + " passed");
process.exit(failed ? 1 : 0);
