/*
 * Between Visits: plain-English glossary for scan and lab reports.
 * Longer phrases are matched first, so "pleural effusion" wins over "effusion".
 */
(function (root) {
  var GLOSSARY = {
    // Scan report words
    "impression": "The radiologist's summary. This is usually the most important part of the report.",
    "findings": "The detailed list of everything the radiologist saw.",
    "unremarkable": "Normal. Nothing concerning was seen there.",
    "interval change": "A change since the last scan.",
    "no interval change": "Nothing has changed since the last scan.",
    "compared with prior": "The radiologist looked at this scan side by side with an older one.",
    "nodule": "A small round spot, usually under 3 cm. Many are harmless; doctors track their size.",
    "mass": "A spot larger than 3 cm.",
    "spiculated": "Having spiky or star-shaped edges. Doctors watch spiky nodules more closely.",
    "lobe": "A section of the lung. The right lung has 3 lobes and the left lung has 2.",
    "lesion": "A general word for any abnormal area. It does not by itself mean cancer.",
    "opacity": "An area that looks whiter (denser) than normal on the image.",
    "ground-glass opacity": "A hazy area in the lung, like frosted glass. It can be inflammation, infection, or sometimes early cancer.",
    "consolidation": "Part of the lung filled with fluid or cells instead of air, often from pneumonia.",
    "atelectasis": "A small part of the lung that is collapsed or not fully inflated.",
    "pleural effusion": "Extra fluid between the lung and the chest wall.",
    "effusion": "A buildup of extra fluid.",
    "emphysema": "Damage to the air sacs in the lungs, often from smoking.",
    "lymphadenopathy": "Lymph nodes that are larger than normal.",
    "lymph node": "Small bean-shaped glands that filter fluid. Cancer can spread to them.",
    "mediastinal": "In the middle of the chest, between the lungs.",
    "hilar": "Where the airways and blood vessels enter each lung.",
    "bilateral": "On both sides.",
    "unilateral": "On one side.",
    "ipsilateral": "On the same side as the tumor.",
    "contralateral": "On the opposite side from the tumor.",
    "fdg-avid": "Lights up on a PET scan, meaning the cells are using a lot of sugar. Cancer often does this, but so can inflammation.",
    "hypermetabolic": "Using more energy than normal tissue; shows up bright on PET.",
    "suv": "Standardized uptake value. A number for how brightly a spot lights up on PET. Higher usually means more active.",
    "metastasis": "Cancer that has spread from where it started to another part of the body.",
    "metastatic": "Has spread to other parts of the body.",
    "malignant": "Cancerous.",
    "benign": "Not cancer.",
    "stable disease": "The cancer has not grown or shrunk much. Often a good sign during treatment.",
    "partial response": "The cancer has shrunk by a meaningful amount (at least 30% by the usual rules).",
    "complete response": "No visible cancer on the scan.",
    "progression": "The cancer has grown or spread.",
    "progressive disease": "The cancer has grown or spread.",
    "recist": "The standard rules doctors use to measure whether tumors are shrinking or growing.",
    "ct": "Computed tomography. A detailed 3D X-ray.",
    "pet": "A scan that shows how active cells are, using a small amount of radioactive sugar.",
    "mri": "A scan that uses magnets instead of X-rays to see soft tissue in detail.",
    "contrast": "A dye given before a scan so blood vessels and organs show up more clearly.",
    "cm": "Centimeter. About the width of a fingernail. 2.5 cm is about 1 inch.",
    "mm": "Millimeter. One tenth of a centimeter.",

    // Diagnosis words
    "adenocarcinoma": "The most common type of non-small cell lung cancer. It starts in mucus-making cells.",
    "squamous cell carcinoma": "A type of non-small cell lung cancer that starts in the flat cells lining the airways.",
    "non-small cell lung cancer": "The most common group of lung cancers (about 85%).",
    "small cell lung cancer": "A faster-growing type of lung cancer, strongly linked to smoking.",
    "carcinoma": "Cancer that starts in the cells lining organs.",
    "biopsy": "Taking a small piece of tissue to look at under a microscope.",
    "pathology": "The lab study of tissue to find out what it is.",
    "staging": "Working out how big the cancer is and how far it has spread. Stage 1 is earliest, stage 4 has spread.",

    // Blood work words
    "neutrophils": "White blood cells that fight bacterial infections. Chemo often lowers them.",
    "anc": "Absolute neutrophil count. The number of infection-fighting cells. Below 1,000 means higher infection risk.",
    "neutropenia": "Low neutrophils, which means a higher risk of infection.",
    "febrile neutropenia": "Fever while neutrophils are low. This is a medical emergency during chemo.",
    "wbc": "White blood cell count. The cells that fight infection.",
    "hemoglobin": "The protein in red blood cells that carries oxygen. Low levels cause tiredness.",
    "anemia": "Low red blood cells or hemoglobin. Causes tiredness and shortness of breath.",
    "platelets": "Cells that help blood clot. Low platelets mean easier bruising and bleeding.",
    "thrombocytopenia": "Low platelets.",
    "creatinine": "A waste product the kidneys clear. A rising number can mean the kidneys are stressed.",
    "egfr": "Estimated glomerular filtration rate, a measure of kidney function (higher is better). Note: EGFR in capital letters on a tumor report is a different thing, a gene mutation.",
    "magnesium": "A mineral cisplatin can lower. Low levels can cause cramps or weakness.",
    "hypomagnesemia": "Low magnesium in the blood.",
    "potassium": "A mineral important for heart rhythm and muscles.",
    "nadir": "The lowest point of blood counts after a chemo dose.",

    // Treatment words
    "cycle": "One round of chemo plus the rest days after it (often 21 days).",
    "regimen": "The specific combination and schedule of drugs.",
    "infusion": "Medicine given slowly through a vein.",
    "port": "A small device under the skin that makes IV treatment easier.",
    "antiemetic": "Anti-nausea medicine.",
    "mucositis": "Sores and swelling in the mouth or gut from chemo.",
    "neuropathy": "Nerve damage, often felt as numbness or tingling in hands and feet.",
    "peripheral neuropathy": "Numbness, tingling, or pain in the hands and feet from nerve damage.",
    "ototoxicity": "Damage to hearing. Cisplatin can cause this.",
    "tinnitus": "Ringing in the ears.",
    "nephrotoxicity": "Damage to the kidneys. Cisplatin can cause this, which is why hydration matters."
  };

  var SAMPLE_REPORT =
    "CT CHEST WITH CONTRAST\n\n" +
    "COMPARISON: Compared with prior CT from 3 months ago.\n\n" +
    "FINDINGS: There is a 2.1 cm spiculated nodule in the right upper lobe, previously 2.8 cm. " +
    "Mild mediastinal lymphadenopathy, decreased. Small right pleural effusion, unchanged. " +
    "Scattered ground-glass opacity in the left lower lobe, likely inflammatory. " +
    "Mild atelectasis at the lung bases. Heart size is unremarkable. No new lesion.\n\n" +
    "IMPRESSION: Partial response of the right upper lobe adenocarcinoma. " +
    "No evidence of new metastasis. Stable small pleural effusion.";

  var api = { GLOSSARY: GLOSSARY, SAMPLE_REPORT: SAMPLE_REPORT };
  root.BV = root.BV || {};
  root.BV.data = Object.assign(root.BV.data || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
