# Between Visits

A chemo companion for patients and the families helping them. Check in once a day, see what is normal for this day of the treatment cycle, and know when to call the care team.

Built for the 2026 Congressional App Challenge, Kentucky's 1st Congressional District.

## Features

- **Today:** the 21-day cycle shown as a pill-pack grid, colored by each day's check-in, with the days side effects are common and the infection-risk window marked.
- **Daily check-in:** about a minute. Gives one clear next step: nothing urgent, mention at next visit, call today, call now, or call 911.
- **Timing check:** compares each symptom to when it usually appears for the chosen regimen, so expected side effects get reassurance and unusual ones get flagged.
- **Trends:** charts each symptom across the cycle with its expected window shaded.
- **Visit prep:** a printable summary with questions generated from the check-ins.
- **Family link:** shares the latest check-ins without an account or a server.
- **Report reader:** explains medical words in scan and lab reports.
- **Help in Kentucky:** maps all 31 KY-01 counties to their Kentucky Cancer Program office, nearby cancer centers, and statewide programs.

Regimens: Cisplatin + Pemetrexed, Carboplatin + Pemetrexed, Carboplatin + Paclitaxel, plus a general mode for other regimens.

## Run it

Open `index.html` in a browser. No install, no account, no server. Tap **Explore with sample data instead** to see a demo patient on day 11 of cycle 2.

Run the triage tests with Node.js:

```
node tests/triage.test.js
```

## How it is built

| File | What it does |
|---|---|
| `js/triage.js` | Triage engine: safety rules from published guidance (such as the CDC's 100.4°F fever rule), then a timing check against the regimen's expected windows. |
| `js/data/regimens.js` | Side effect timing windows for each regimen, with sources. |
| `js/data/kentucky.js` | KY-01 counties, Kentucky Cancer Program regional offices, and cancer centers. |
| `js/data/glossary.js` | Plain-English definitions for report terms. |
| `js/core.js` | On-device storage, cycle-day math that handles delayed cycles, and the family share link. |
| `js/app.js` | All screens and navigation. |
| `css/styles.css` | Design, with light and dark mode and adjustable text size. Font: Atkinson Hyperlegible. |
| `tests/triage.test.js` | Automated tests for the triage engine. |

JavaScript, HTML, and CSS. Charts use [Chart.js](https://www.chartjs.org/) (MIT license), included in `vendor/`.

## Privacy

Everything is saved only in the browser on the user's device. The family link carries its data in the part of the URL after `#`, which browsers do not send to servers.

## Sources

- CDC, Watch Out for Fever: https://www.cdc.gov/cancer/preventinfections/fever.htm
- Velindre Cancer Centre, Pemetrexed and cisplatin; Pemetrexed and carboplatin
- The Christie NHS Foundation Trust, Pemetrexed and carboplatin
- Cancer Care Ontario, Cisplatin monograph
- Hamilton Health Sciences, Carboplatin and Paclitaxel patient guide
- Kentucky Cancer Program regional offices; Markey Cancer Center Affiliate Network
- American Lung Association, State of Lung Cancer 2025: Kentucky

## Disclaimer

Between Visits gives general education, not medical advice. Always follow your own care team's instructions.
