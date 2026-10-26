/*
 * Between Visits: Kentucky resources for the 1st Congressional District.
 *
 * Each KY-01 county is mapped to its Area Development District, because the
 * Kentucky Cancer Program (run by UK and U of L) has a regional office for each
 * district, staffed by someone who lives there and knows the local resources.
 *
 * Phone numbers and centers were checked against the sources listed at the bottom
 * in October 2026. Re-check them before each new school year.
 */
(function (root) {
  var DISTRICTS = {
    purchase: {
      name: "Purchase District", kcp: { city: "Paducah", phone: "270-442-1310" },
      centers: [
        { name: "Baptist Health Paducah, Ray and Kay Eckstein Regional Cancer Care Center", city: "Paducah", url: "https://www.baptisthealth.com/choose-baptist/our-communities/paducah/services/cancer-care" },
        { name: "Mercy Health Lourdes Hospital (Markey Cancer Center Affiliate Network)", city: "Paducah" }
      ]
    },
    pennyrile: {
      name: "Pennyrile District", kcp: { city: "Madisonville", phone: "270-821-4298" }, centers: []
    },
    greenriver: { name: "Green River District", kcp: { city: "Owensboro", phone: "270-683-2560" }, centers: [] },
    barrenriver: {
      name: "Barren River District", kcp: { city: "Bowling Green", phone: "270-842-0950" },
      centers: [
        { name: "The Medical Center at Bowling Green (Markey Cancer Center Affiliate Network)", city: "Bowling Green" },
        { name: "TJ Samson Community Hospital (Markey Cancer Center Affiliate Network)", city: "Glasgow" }
      ]
    },
    lakecumberland: {
      name: "Lake Cumberland District", kcp: { city: "Somerset", phone: "606-383-0367" },
      centers: [
        { name: "Taylor Regional Hospital (Markey Cancer Center Affiliate Network)", city: "Campbellsville" },
        { name: "Lake Cumberland Regional Hospital (Markey Cancer Center Affiliate Network)", city: "Somerset" }
      ]
    },
    bluegrass: {
      name: "Bluegrass District", kcp: { city: "Lexington", phone: "859-608-9021", alt: "859-200-6689" },
      centers: [
        { name: "Ephraim McDowell Commonwealth Cancer Center", city: "Danville", url: "https://emhealth.org/service/cancer-care/" },
        { name: "Georgetown Community Hospital (Markey Cancer Center Affiliate Network)", city: "Georgetown" },
        { name: "UK Markey Cancer Center, Kentucky's NCI-designated cancer center", city: "Lexington", url: "https://ukhealthcare.uky.edu/markey-cancer-center" }
      ]
    },
    lincolntrail: {
      name: "Lincoln Trail District", kcp: { city: "Bardstown", phone: "502-348-0143" },
      centers: [
        { name: "Taylor Regional Hospital (Markey Cancer Center Affiliate Network)", city: "Campbellsville" }
      ]
    }
  };

  /* The 31 counties of Kentucky's 1st Congressional District (2023 map). */
  var COUNTIES = {
    "Adair": "lakecumberland", "Allen": "barrenriver", "Anderson": "bluegrass", "Ballard": "purchase",
    "Boyle": "bluegrass", "Caldwell": "pennyrile", "Calloway": "purchase", "Carlisle": "purchase",
    "Casey": "lakecumberland", "Christian": "pennyrile", "Clinton": "lakecumberland", "Franklin": "bluegrass",
    "Fulton": "purchase", "Graves": "purchase", "Henderson": "greenriver", "Hickman": "purchase",
    "Hopkins": "pennyrile", "Logan": "barrenriver", "Lyon": "pennyrile", "McCracken": "purchase",
    "Marion": "lincolntrail", "Marshall": "purchase", "Metcalfe": "barrenriver", "Monroe": "barrenriver",
    "Russell": "lakecumberland", "Simpson": "barrenriver", "Taylor": "lakecumberland", "Todd": "pennyrile",
    "Trigg": "pennyrile", "Union": "greenriver", "Webster": "greenriver"
  };

  /* Help that covers every county in Kentucky. */
  var STATEWIDE = [
    { name: "Kentucky CancerLink", phone: "859-309-1700", url: "https://www.kycancerlink.org",
      text: "Patient navigation, gas cards and help getting to treatment, and free wigs, headwear, and prostheses." },
    { name: "American Cancer Society, Road To Recovery", phone: "1-800-227-2345", url: "https://www.cancer.org/ride",
      text: "Free rides to treatment from volunteer drivers. The same number is the 24-hour cancer helpline." },
    { name: "Quit Now Kentucky", phone: "1-800-784-8669", display: "1-800-QUIT-NOW",
      text: "Free coaching to quit smoking or other tobacco, for the patient or anyone in the family." },
    { name: "Kentucky Cancer Program Pathfinder", url: "https://kcp.louisville.edu/pathfinder",
      text: "A searchable directory of cancer resources across Kentucky, by county." }
  ];

  var SOURCES = [
    { title: "Kentucky Cancer Program regional offices (PDF)", url: "https://www.kcp.uky.edu/about/RCCS%20Offices%20State.pdf" },
    { title: "Markey Cancer Center Affiliate Network fact sheet (PDF)", url: "https://ukhealthcare.uky.edu/sites/default/files/2026-04/Fact%20Sheet%20-%20MCCAN%20July%202025%20DIGITAL-rem0426.pdf" },
    { title: "Kentucky's 1st congressional district", url: "https://en.wikipedia.org/wiki/Kentucky%27s_1st_congressional_district" }
  ];

  var api = { KY: { DISTRICTS: DISTRICTS, COUNTIES: COUNTIES, STATEWIDE: STATEWIDE, SOURCES: SOURCES } };
  root.BV = root.BV || {};
  root.BV.data = Object.assign(root.BV.data || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
