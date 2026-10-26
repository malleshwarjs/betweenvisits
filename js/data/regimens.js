/*
 * Between Visits: regimen knowledge base
 * ---------------------------------------
 * Each regimen describes WHEN side effects usually show up in a cycle.
 * Days are "cycle days": day 1 is the infusion day.
 *
 * effects[]   symptom key (must match a check-in field), the day window where it
 *             is common, the peak days, and plain-English tips.
 * watch[]     time windows that need extra care (hydration, infection risk...).
 * cumulative  symptoms that build up over many cycles and should ALWAYS be reported.
 *
 * This is general patient-education information collected from the sources listed
 * in each regimen. It is not a substitute for the patient's own care team, whose
 * instructions always come first.
 */
(function (root) {
  var REGIMENS = {
    "cis-pem": {
      id: "cis-pem",
      name: "Cisplatin + Pemetrexed",
      usedFor: "Often used for non-small cell lung cancer (non-squamous) and mesothelioma.",
      cycleLength: 21,
      effects: [
        { symptom: "nausea", start: 1, end: 5, peak: [2, 3],
          what: "Cisplatin can cause nausea on day 1 and a second, delayed wave on days 2 to 5.",
          tips: ["Take anti-nausea medicine on schedule, even before you feel sick.",
                 "Eat small, bland meals. Cold foods smell less and are easier to keep down."] },
        { symptom: "appetite", start: 1, end: 7, peak: [2, 4],
          what: "Appetite is often low for the first week.",
          tips: ["Aim for small snacks every 2 to 3 hours instead of full meals."] },
        { symptom: "fatigue", start: 2, end: 10, peak: [3, 7],
          what: "Tiredness usually builds in the first week and eases in the second.",
          tips: ["Short walks help more than staying in bed all day.", "Plan the most important task for when energy is highest."] },
        { symptom: "diarrhea", start: 2, end: 7, peak: [3, 5],
          what: "Some people get loose stools in the first week.",
          tips: ["Drink extra fluids to replace what you lose."] },
        { symptom: "rash", start: 2, end: 10, peak: [3, 6],
          what: "Pemetrexed can cause a rash. The steroid you take around treatment day helps prevent it.",
          tips: ["Use a fragrance-free moisturizer."] },
        { symptom: "mouth", start: 5, end: 12, peak: [7, 10],
          what: "Small mouth sores can appear in the second week.",
          tips: ["Brush gently with a soft toothbrush.", "Rinse with a mild salt and baking soda rinse, or ask your team about a mouthwash."] }
      ],
      watch: [
        { id: "hydration", start: 1, end: 3, label: "Drink often",
          text: "Cisplatin is cleared by the kidneys. Drink a glass of fluid about every hour while awake for the first days.",
          caregiver: "Keep a full water bottle within reach and gently remind them to sip every hour." },
        { id: "steroid", start: 1, end: 3, label: "Steroid days",
          text: "The steroid (dexamethasone) can cause trouble sleeping, more energy, or a bigger appetite for a few days.",
          caregiver: "Restless nights are common on steroid days. It usually passes by day 4." },
        { id: "infection", start: 8, end: 15, label: "Infection-risk window",
          text: "White blood cells are usually lowest in this window. Check your temperature any time you feel warm, chilled, or unwell.",
          caregiver: "Wash your hands when you visit. If you are sick, wear a mask or call instead of visiting." }
      ],
      cumulative: ["ears", "numbness"],
      sources: [
        { title: "Velindre Cancer Centre: Pemetrexed and cisplatin patient leaflet", url: "https://velindre.nhs.wales/velindrecc/patient-information/chemotherapy-immunotherapy-information-leaflets/pemetrexed-and-cisplatin" },
        { title: "Cancer Care Ontario: Cisplatin drug monograph", url: "https://www.cancercareontario.ca/system/files_force/cisplatin.pdf?download=1" },
        { title: "CDC: Watch out for fever", url: "https://www.cdc.gov/cancer/preventinfections/fever.htm" }
      ]
    },

    "carbo-pacli": {
      id: "carbo-pacli",
      name: "Carboplatin + Paclitaxel",
      usedFor: "Often used for non-small cell lung cancer, ovarian, and other cancers.",
      cycleLength: 21,
      effects: [
        { symptom: "nausea", start: 1, end: 3, peak: [2, 2],
          what: "Nausea, if it happens, is usually in the first few days.",
          tips: ["Take anti-nausea medicine as prescribed.", "Small, bland meals are easiest."] },
        { symptom: "aches", start: 2, end: 6, peak: [3, 4],
          what: "Paclitaxel often causes deep muscle and joint aches a few days after treatment.",
          tips: ["Heat packs and rest help.", "Ask your team which pain reliever is safe for you."] },
        { symptom: "fatigue", start: 3, end: 10, peak: [4, 7],
          what: "Many people feel fine for 2 days, then low on energy around days 4 to 7.",
          tips: ["Plan lighter days for days 4 to 7."] },
        { symptom: "appetite", start: 2, end: 7, peak: [3, 5],
          what: "Appetite can dip in the first week.",
          tips: ["Small snacks every few hours."] },
        { symptom: "mouth", start: 5, end: 12, peak: [7, 10],
          what: "Mouth sores can appear after treatment.",
          tips: ["Avoid hot, spicy, or acidic foods.", "Brush gently with a soft brush."] }
      ],
      watch: [
        { id: "steroid", start: 1, end: 2, label: "Steroid days",
          text: "The steroid given with treatment can cause a short energy boost and trouble sleeping.",
          caregiver: "Expect a burst of energy, then a dip around day 4." },
        { id: "infection", start: 7, end: 14, label: "Infection-risk window",
          text: "White blood cells are usually lowest around days 7 to 14. Check your temperature any time you feel unwell.",
          caregiver: "Avoid visiting if you have a cold or cough. Wash hands often." },
        { id: "hair", start: 14, end: 21, label: "Hair changes",
          text: "Hair loss often starts 2 to 3 weeks after the first treatment.",
          caregiver: "Some families make a plan together (a short haircut, a favorite hat) before it starts." }
      ],
      cumulative: ["numbness"],
      sources: [
        { title: "Hamilton Health Sciences: Carboplatin and Paclitaxel patient guide", url: "https://www.hamiltonhealthsciences.ca/wp-content/uploads/2023/01/Carboplatin-and-Paclitaxel-Chemo.pdf" },
        { title: "CDC: Watch out for fever", url: "https://www.cdc.gov/cancer/preventinfections/fever.htm" }
      ]
    },

    "carbo-pem": {
      id: "carbo-pem",
      name: "Carboplatin + Pemetrexed",
      usedFor: "Often used for non-small cell lung cancer (non-squamous), especially when cisplatin is too hard on the kidneys or hearing.",
      cycleLength: 21,
      effects: [
        { symptom: "nausea", start: 1, end: 3, peak: [2, 2],
          what: "Anti-nausea medicine usually keeps this mild. If it comes, it is most likely in the first few days.",
          tips: ["Take anti-nausea medicine on schedule.", "Small, bland meals are easiest."] },
        { symptom: "appetite", start: 1, end: 6, peak: [2, 4],
          what: "Appetite can dip in the first week.",
          tips: ["Small snacks every few hours instead of full meals."] },
        { symptom: "fatigue", start: 2, end: 10, peak: [4, 7],
          what: "Tiredness is common in the first week and should not be severe.",
          tips: ["Rest when you need to, and keep up light activity like short walks."] },
        { symptom: "diarrhea", start: 2, end: 7, peak: [3, 5],
          what: "Some people get loose stools in the first week.",
          tips: ["Drink extra fluids to replace what you lose."] },
        { symptom: "rash", start: 2, end: 10, peak: [3, 6],
          what: "Pemetrexed can cause a rash. The steroid you take around treatment day helps prevent it.",
          tips: ["Use a fragrance-free moisturizer.", "Pemetrexed can make skin more sensitive to sun, so cover up outside."] },
        { symptom: "mouth", start: 5, end: 12, peak: [7, 10],
          what: "Dryness or small mouth ulcers can appear in the second week.",
          tips: ["Brush gently with a soft toothbrush and sip fluids often."] }
      ],
      watch: [
        { id: "steroid", start: 1, end: 3, label: "Steroid days",
          text: "Dexamethasone, started the day before treatment, can cause trouble sleeping and a bigger appetite for a few days. Take it with food, earlier in the day.",
          caregiver: "Restless nights are common on steroid days. It usually passes by day 4." },
        { id: "infection", start: 7, end: 14, label: "Infection-risk window",
          text: "White blood cells are often lowest in the second week. Check your temperature any time you feel warm, chilled, or unwell, and ask your team when your counts are lowest.",
          caregiver: "Wash your hands when you visit. If you are sick, wear a mask or call instead of visiting." },
        { id: "hair", start: 10, end: 21, label: "Possible hair thinning",
          text: "Most people keep their hair. A few notice thinning starting around 10 to 14 days after treatment.",
          caregiver: "If thinning starts, a soft brush and gentle shampoo help." }
      ],
      cumulative: ["numbness", "ears"],
      sources: [
        { title: "The Christie NHS Foundation Trust: Pemetrexed and carboplatin patient leaflet", url: "https://www.christie.nhs.uk/media/2nbhhgo0/456-pemetrexed-and-carboplatin-jun-24.pdf" },
        { title: "Velindre Cancer Centre: Pemetrexed and carboplatin patient leaflet", url: "https://velindre.nhs.wales/velindrecc/patient-information/chemotherapy-immunotherapy-information-leaflets/pemetrexed-and-carboplatin" },
        { title: "CDC: Watch out for fever", url: "https://www.cdc.gov/cancer/preventinfections/fever.htm" }
      ]
    },

    "other": {
      id: "other",
      name: "Another regimen / not sure",
      usedFor: "General chemotherapy safety checks only. Timing tips are turned off.",
      cycleLength: 21,
      effects: [],
      watch: [
        { id: "infection", start: 7, end: 14, label: "Possible infection-risk window",
          text: "For many regimens, white blood cells are lowest about 7 to 14 days after treatment. Ask your team when yours are lowest.",
          caregiver: "Wash your hands when you visit, and stay away if you are sick." }
      ],
      cumulative: [],
      sources: [
        { title: "CDC: Watch out for fever", url: "https://www.cdc.gov/cancer/preventinfections/fever.htm" }
      ]
    }
  };

  /* Labels for every symptom the app tracks (used in charts, summaries, and alerts). */
  var SYMPTOMS = {
    nausea:   { label: "Nausea",          scale: ["None", "Mild", "Moderate", "Severe"] },
    appetite: { label: "Appetite loss",   scale: ["Normal", "A little less", "Much less", "Can't eat"] },
    fatigue:  { label: "Tiredness",       scale: ["Normal", "Mild", "Moderate", "In bed most of the day"] },
    diarrhea: { label: "Diarrhea",        unit: "extra stools today" },
    rash:     { label: "Rash",            scale: ["None", "Mild", "Uncomfortable", "Severe"] },
    mouth:    { label: "Mouth sores",     scale: ["None", "Mild", "Painful", "Can't eat or drink"] },
    aches:    { label: "Muscle/joint aches", scale: ["None", "Mild", "Moderate", "Severe"] },
    ears:     { label: "Ringing ears / hearing change" },
    numbness: { label: "Numbness or tingling" }
  };

  var api = { REGIMENS: REGIMENS, SYMPTOMS: SYMPTOMS };
  root.BV = root.BV || {};
  root.BV.data = Object.assign(root.BV.data || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
