# Questionnaire Format Guide

This app is **fully config-driven**. All survey content lives in a single JSON file:

```text
asa-app/src/config/survey.config.json
```

This is the **canonical source of truth** for the survey — questions, registration
fields, branding, scoring tiers. To change the survey, edit this JSON file, commit,
and push. GitHub Actions auto-redeploys the live site within ~1 minute.

> **For non-developers**: you don't need to know any JavaScript. JSON is just a
> structured text format you can edit in Notepad, VS Code, or any online JSON
> editor. The schema below is the format. The maintainer (developer) reviews your
> changes and commits them.

## 📌 Live working example

The currently-deployed SIA AI Literacy Survey is itself a working example you can
copy and adapt:

🔗 <https://github.com/integrations-space/asa-app/blob/master/asa-app/src/config/survey.config.json>

Download it, modify it for your own survey, and submit it back via PR or hand it
to the maintainer. Everything that file contains is documented below.

## Architecture in 30 seconds

```text
survey.config.json ──┐
                     │  (build-time import)
survey.config.js ────┤  (thin wrapper: injects backend URL,
                     │   converts the 9999 sentinel back to Infinity)
                     ▼
              SurveyEngine.jsx (renders everything from config)
```

You only ever edit the JSON. The `.js` wrapper exists for two runtime concerns —
the backend URL injection (from `VITE_BACKEND_URL` env at build) and the
`Infinity` value for the top scoring tier (since JSON can't express it natively).

---

## Top-level shape

```json
{
  "title":       "...",
  "subtitle":    "...",
  "description": "...",

  "registration": [],
  "questions":    [],
  "tiers":        []
}
```

Notes:

- `backendUrl` is **not** in the JSON — the runtime wrapper injects it from the build-time `VITE_BACKEND_URL` env. You don't set it here.
- All four sections (`title`, `subtitle`, `description`, plus the three arrays) are required.
- Comments are not allowed in JSON. If you need to annotate a survey, keep notes in a separate file or use field labels descriptively.

---

## Registration fields

Shown on the second screen, before any question. Use these for participant
metadata (name, email, cohort, consent, etc.) — *not* for scored content.

Each field is an object with these keys:

| Key | Required | What it does |
|---|---|---|
| `name` | yes | Unique identifier. Used as the form-data key and as the URL query-string param for pre-fill. |
| `label` | yes | Visible label. |
| `type` | yes | One of `text`, `email`, `tel`, `select`, `checkbox`. |
| `required` | yes | `true` blocks submission until filled. |
| `placeholder` | no | Greyed-out hint inside text inputs. |
| `options` | conditional | Only for `type: 'select'`. Array of `{ value, label }` pairs. First option should be a placeholder with `value: ''`. |
| `readOnly` | no | If `true`, value can't be edited by the user (only pre-filled from URL). |

### Pre-filling from the URL

Any field whose `name` matches a URL query-string parameter is auto-populated.
For example, if your QR code links to:

```text
https://example.github.io/asa-app/?sessionId=ASA-MORNING-01&groupName=SIA%20S1
```

then `sessionId` and `groupName` fields are pre-filled. Users can still edit
them unless you set `readOnly: true`.

### Examples

```json
{ "name": "fullName", "label": "Your Full Name", "type": "text",  "required": true },
{ "name": "email",    "label": "Email Address",  "type": "email", "required": true },
{ "name": "mobile",   "label": "Mobile (optional)", "type": "tel", "required": false },
{
  "name": "yearsInPractice", "label": "Years in Practice", "type": "select", "required": true,
  "options": [
    { "value": "",    "label": "Select years…" },
    { "value": "<2",  "label": "Less than 2 years" },
    { "value": "2-5", "label": "2–5 years" },
    { "value": ">5",  "label": "More than 5 years" }
  ]
},
{
  "name": "consent",
  "label": "I consent to my responses being used for...",
  "type": "checkbox", "required": true
}
```

---

## Questions

Each question is an object. The schema depends on `type`. All four types are
listed below.

### Common keys (every question)

| Key | Required | What it does |
|---|---|---|
| `id` | yes | Unique slug (`q1`, `q2`, …, or any string). Used as the answer key. |
| `type` | yes | One of `mcq`, `mcq_other`, `text`, `scale`. |
| `category` | yes | Free-text label shown as a badge above the question. |
| `question` | yes | The question text shown to the user. |
| `correct` | yes | The scoring rule. `-1` = unscored. Otherwise, the index/value of the correct answer. |

### Type 1 — `mcq` (multiple choice, single correct answer)

```json
{
  "id": "q1",
  "type": "mcq",
  "category": "Foundational",
  "question": "What does 'generative AI' best describe?",
  "options": [
    "Software that automates drafting tasks",
    "AI that creates new content from a prompt",
    "A BIM plugin for clash reports",
    "A scheduling optimiser"
  ],
  "correct": 1
}
```

- Renders as a list of clickable cards.
- `correct` is the **zero-based index** of the right option. In the example above, `1` means "AI that creates new content from a prompt".
- `correct: -1` makes it unscored (still shown, still recorded, just not graded).

### Type 2 — `mcq_other` (dropdown with optional free-text "Other")

For self-reflection questions where you want to *guide* with common answers but
let the participant type their own if none fit.

```json
{
  "id": "q11",
  "type": "mcq_other",
  "category": "Self-Reflection",
  "question": "Which area would you most like to improve?",
  "placeholder": "Select an area…",
  "options": [
    "Understanding what AI can and cannot do",
    "Writing effective prompts",
    "Critically evaluating AI outputs",
    "Ethics, IP, and professional liability",
    "Integrating AI into daily workflow"
  ],
  "otherLabel":       "Other (please specify)",
  "otherPlaceholder": "Describe your area…",
  "maxLength": 400,
  "correct": -1
}
```

Optional keys: `placeholder` (dropdown's default label), `otherLabel` (the "Other" option text — has a sensible default), `otherPlaceholder` (placeholder inside the text field), `maxLength` (character cap on the free-text field).

- Renders as a `<select>` dropdown. Last item is the "Other" option.
- When "Other" is picked, a text field appears below.
- The final answer stored in the sheet is **either the picked option text or the
  user-typed text** — never the internal `__OTHER__` sentinel.

### Type 3 — `text` (free-response, multi-line)

```json
{
  "id": "q_reflection",
  "type": "text",
  "category": "Self-Reflection",
  "question": "In your own words, what is your biggest concern about AI in your practice?",
  "placeholder": "Type your reflection…",
  "maxLength": 600,
  "correct": -1
}
```

- Renders as a `<textarea>`. Always unscored (`correct` must be `-1`).
- `placeholder` and `maxLength` are optional. `maxLength` defaults to `1000`.

### Type 4 — `scale` (numeric scale, min → max)

```json
{
  "id": "q12",
  "type": "scale",
  "category": "Self-Reflection",
  "question": "How useful do you find AI tools in your current practice?",
  "min": 1,
  "max": 5,
  "labels": { "min": "Not useful", "max": "Very useful" },
  "correct": -1
}
```

- Renders as a row of clickable numbered buttons from `min` to `max`.
- `labels` is optional — adds anchor text under the endpoints. Omit to show just the numbers.
- Set `"correct": 4` (for example) to score the answer if and only if they pick `4`.
- Set `"correct": -1` for a pure rating with no "right answer".

---

## Tiers

Once the score is computed (number of questions with `correct !== -1` that the
participant got right), the tier engine maps it to a competency band shown on the
result screen.

```json
"tiers": [
  { "min": 0, "max": 3,    "name": "Foundational Awareness", "color": "#1F8A70" },
  { "min": 4, "max": 6,    "name": "Applied Practitioner",   "color": "#2C7BB6" },
  { "min": 7, "max": 8,    "name": "Strategic & Critical",   "color": "#E04E1B" },
  { "min": 9, "max": 9999, "name": "AI Champion",            "color": "#1A3C5E" }
]
```

- Ranges are **inclusive** on both ends.
- The top band should use `9999` for `max` to catch any high score. The runtime wrapper converts `9999` to JavaScript's `Infinity` automatically — this is the documented sentinel because JSON has no native infinity.
- `color` is any CSS colour — used for the tier badge border and accent.

> ⚠️ **The Apps Script must mirror this.** If you rename a tier, you must also
> update `COMPETENCY_TIERS` in `ASA_GoogleAppsScript.gs` because the back-end
> uses tier names to group respondents in the dashboard and email report.

---

## Scoring — what counts as "correct"

The max score is computed dynamically from the questions list: it's the count of questions whose `correct` is not `-1`. So if you add 9 scored questions + 3 unscored reflections, the headline score reads `X / 9`.

### Mirror the `correct` index on the back-end

`ASA_GoogleAppsScript.gs` has its own minimal `QUESTIONS` array (JavaScript, not JSON) used only for scoring. The question text doesn't live on the back-end — only the index of the right answer. If you change a question's correct answer, also update:

```js
// ASA_GoogleAppsScript.gs, near the top
const QUESTIONS = [
  { id: 'q1', category: 'Foundational',  correct: 1 },
  { id: 'q2', category: 'Foundational',  correct: 1 },
  // …
];
```

For `mcq_other`, `text`, and `scale` questions with `correct: -1`, you can omit them from the back-end array entirely (scoring ignores them) — but mirroring them is harmless.

---

## Adding a new question — full walkthrough

Let's say you want to add a Q13: "What size project are you working on?" as an unscored MCQ.

**Step 1.** Open `asa-app/src/config/survey.config.json` and append to the `questions` array:

```json
{
  "id": "q13",
  "type": "mcq",
  "category": "Context",
  "question": "What size of project are you currently working on?",
  "options": [
    "Small (< $1M)",
    "Medium ($1M – $20M)",
    "Large ($20M – $100M)",
    "Mega (> $100M)"
  ],
  "correct": -1
}
```

**Step 2.** Update the splash `description` if the question count changed:

```json
"description": "13 questions · about 5–10 minutes · …"
```

**Step 3** *(optional)*. Mirror in `ASA_GoogleAppsScript.gs` for completeness:

```js
{ id: 'q13', category: 'Context', correct: -1 },
```

**Step 4.** Commit, push. GitHub Actions auto-builds and deploys to GitHub Pages within ~1 minute.

**Step 5** *(only if you touched `.gs`)*. Paste the updated Apps Script into the editor → Manage deployments → ✏️ → "New version" → Deploy.

---

## Equivalent JSON template (for non-developers)

If you'd rather hand a non-developer a filled-in JSON file, here's the same
structure as a plain JSON document. They send you this, you paste it into
`survey.config.js` (wrapping it as `export const config = { … }`).

```json
{
  "title": "My Survey",
  "subtitle": "What this survey measures",
  "description": "10 questions · about 5 minutes · report by email.",

  "registration": [
    { "name": "fullName", "label": "Your Name",    "type": "text",  "required": true },
    { "name": "email",    "label": "Email",        "type": "email", "required": true }
  ],

  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "category": "Foundational",
      "question": "Which statement is true?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": 1
    },
    {
      "id": "q2",
      "type": "scale",
      "category": "Self-Reflection",
      "question": "How confident do you feel about X?",
      "min": 1, "max": 5,
      "labels": { "min": "Not confident", "max": "Very confident" },
      "correct": -1
    },
    {
      "id": "q3",
      "type": "mcq_other",
      "category": "Self-Reflection",
      "question": "Pick the area you most want to improve.",
      "options": ["Topic A", "Topic B", "Topic C"],
      "otherLabel": "Other (please specify)",
      "maxLength": 400,
      "correct": -1
    },
    {
      "id": "q4",
      "type": "text",
      "category": "Self-Reflection",
      "question": "Anything else you'd like to share?",
      "maxLength": 800,
      "correct": -1
    }
  ],

  "tiers": [
    { "min": 0, "max": 1,        "name": "Beginner",     "color": "#1F8A70" },
    { "min": 2, "max": Infinity, "name": "Advanced",     "color": "#1A3C5E" }
  ]
}
```

> ⚠️ JSON does not natively support `Infinity`. In the actual `.js` file you can
> use `Infinity`; when handing over JSON, use a big number like `9999` and the
> developer can swap it back to `Infinity` on import.

---

## Runtime override — swap surveys without redeploying

The deployed app accepts a `?config=<URL>` query parameter. When present, the
app fetches the JSON from that URL, validates its shape against the schema
above, and uses it in place of the bundled `survey.config.json`. This means a
single deployed instance can host any number of surveys — one URL per cohort,
no redeploy required.

### Usage

```text
https://integrations-space.github.io/asa-app/?config=https://example.com/my-survey.json
```

Combine with the existing pre-fill params for a complete QR-code-ready link:

```text
https://integrations-space.github.io/asa-app/
  ?config=https://example.com/firmX-survey.json
  &sessionId=ASA-FIRMX-2026-06-01
  &groupName=Firm%20X%20Cohort
```

### Where to host the JSON

The URL must be **publicly accessible over HTTPS** with CORS permitted. Common
options that work out of the box:

| Host | How to get a URL |
|---|---|
| **GitHub Gist** | Create a public gist with your JSON, click "Raw" — the `gist.githubusercontent.com/.../raw/...` URL is CORS-friendly |
| **GitHub repo file** | Push the JSON to any public repo, use `https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path>` |
| **Apps Script web app** | A `doGet` that returns the JSON via `ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)` — same pattern as this app's backend |
| **Cloud Storage (S3, GCS, Azure)** | Public bucket with CORS headers configured for `*` or your Pages origin |

### Behaviour

| Scenario | What the user sees |
|---|---|
| `?config=URL` present and fetches OK + valid schema | The custom survey, end-to-end |
| `?config=URL` present but fetch fails (404, network, CORS) | Red banner explaining the failure, **default bundled survey shown underneath** so the user can still complete *something* |
| `?config=URL` present but JSON has invalid shape | Red banner naming the missing fields, default survey shown |
| No `?config=` param | Default bundled survey, no banner |

### Important caveats

- **The backend stays the same.** Submissions still POST to the Google Apps Script bound to *this* deployment (`VITE_BACKEND_URL`). The runtime config only changes what *questions* the participant sees — not where the data goes. If you want a totally separate backend per survey, you need a separate deployment.
- **Validation is shallow.** The runtime check only verifies that `title`, `registration`, `questions`, and `tiers` exist with the right types. It doesn't deeply validate each question's `type`-specific fields — invalid question objects may render oddly but won't crash the app.
- **Scoring rules on the back-end don't update automatically.** If your custom survey has different `correct` indices than the bundled one, scores stored in the sheet will be computed against the back-end's `QUESTIONS` array (which mirrors the bundled survey). For a fully-custom survey, you also need a back-end deploy that mirrors the new `correct` values — or you accept that the dashboard's score column reflects bundled-survey scoring against custom-survey answers, which is meaningless. **Safest for custom surveys: set all `correct` to `-1` and use the survey purely for data collection, not scoring.**
