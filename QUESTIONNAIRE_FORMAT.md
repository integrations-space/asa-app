# Questionnaire Format Guide

This app is **fully config-driven**. To change the survey — questions, registration
fields, branding, scoring tiers — you only edit one file:

```
asa-app/src/config/survey.config.js
```

The `SurveyEngine.jsx` component reads this config and renders everything from it.
No other code change is needed for a new survey, as long as the new questions use
the supported question types documented below.

> **For non-developers**: you can give your facilitator/developer a filled-in copy
> of this format (or the JSON equivalent at the bottom of this doc) and they will
> drop it into the codebase, commit, and redeploy. The whole process takes ~5
> minutes once the format is correct.

---

## Top-level shape

```js
export const config = {
  title:       '...',          // Splash-screen H1
  subtitle:    '...',          // One-line description under the title
  description: '...',          // Longer blurb — sets expectations on length/output

  backendUrl: import.meta.env.VITE_BACKEND_URL || '',
  //          ^ leave as-is — the Apps Script URL is injected at build time

  registration: [ /* fields shown before the survey starts */ ],
  questions:    [ /* survey questions */ ],
  tiers:        [ /* scoring bands for the final result */ ],
};
```

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

```
https://example.github.io/asa-app/?sessionId=ASA-MORNING-01&groupName=SIA%20S1
```

then `sessionId` and `groupName` fields are pre-filled. Users can still edit
them unless you set `readOnly: true`.

### Examples

```js
{ name: 'fullName', label: 'Your Full Name', type: 'text',  required: true },
{ name: 'email',    label: 'Email Address',  type: 'email', required: true },
{ name: 'mobile',   label: 'Mobile (optional)', type: 'tel', required: false },
{
  name: 'yearsInPractice', label: 'Years in Practice', type: 'select', required: true,
  options: [
    { value: '',    label: 'Select years…' },
    { value: '<2',  label: 'Less than 2 years' },
    { value: '2-5', label: '2–5 years' },
    { value: '>5',  label: 'More than 5 years' },
  ],
},
{
  name: 'consent',
  label: 'I consent to my responses being used for...',
  type: 'checkbox', required: true,
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

```js
{
  id: 'q1',
  type: 'mcq',
  category: 'Foundational',
  question: "What does 'generative AI' best describe?",
  options: [
    'Software that automates drafting tasks',                 // index 0
    'AI that creates new content from a prompt',              // index 1  ← correct
    'A BIM plugin for clash reports',                         // index 2
    'A scheduling optimiser',                                 // index 3
  ],
  correct: 1, // zero-based index into options[]
}
```

- Renders as a list of clickable cards.
- `correct: -1` makes it unscored (still shown, still recorded, just not graded).

### Type 2 — `mcq_other` (dropdown with optional free-text "Other")

For self-reflection questions where you want to *guide* with common answers but
let the participant type their own if none fit.

```js
{
  id: 'q11',
  type: 'mcq_other',
  category: 'Self-Reflection',
  question: 'Which area would you most like to improve?',
  placeholder: 'Select an area…',
  options: [
    'Understanding what AI can and cannot do',
    'Writing effective prompts',
    'Critically evaluating AI outputs',
    'Ethics, IP, and professional liability',
    'Integrating AI into daily workflow',
  ],
  otherLabel:       'Other (please specify)',     // optional, has a sensible default
  otherPlaceholder: 'Describe your area…',        // optional
  maxLength: 400,                                  // applies only to the "Other" text box
  correct: -1,                                     // always unscored — this is a reflection
}
```

- Renders as a `<select>` dropdown. Last item is the "Other" option.
- When "Other" is picked, a text field appears below.
- The final answer stored in the sheet is **either the picked option text or the
  user-typed text** — never the internal `__OTHER__` sentinel.

### Type 3 — `text` (free-response, multi-line)

```js
{
  id: 'q11_free',
  type: 'text',
  category: 'Self-Reflection',
  question: 'In your own words, what is your biggest concern about AI in your practice?',
  placeholder: 'Type your reflection…',           // optional
  maxLength: 600,                                  // optional, defaults to 1000
  correct: -1,                                     // always unscored
}
```

- Renders as a `<textarea>`. Always unscored.

### Type 4 — `scale` (numeric scale, min → max)

```js
{
  id: 'q12',
  type: 'scale',
  category: 'Self-Reflection',
  question: 'How useful do you find AI tools in your current practice?',
  min: 1,
  max: 5,
  labels: { min: 'Not useful', max: 'Very useful' },   // optional anchor labels
  correct: -1,                                          // unscored
  // or, to score a specific value:
  // correct: 4
}
```

- Renders as a row of clickable numbered buttons from `min` to `max`.
- Set `correct: 4` (for example) to score the answer if and only if they pick `4`.
- Set `correct: -1` for a pure rating with no "right answer".

---

## Tiers

Once the score is computed (number of questions with `correct !== -1` that the
participant got right), the tier engine maps it to a competency band shown on the
result screen.

```js
tiers: [
  { min: 0, max: 3,        name: 'Foundational Awareness', color: '#1F8A70' },
  { min: 4, max: 6,        name: 'Applied Practitioner',   color: '#2C7BB6' },
  { min: 7, max: 8,        name: 'Strategic & Critical',   color: '#E04E1B' },
  { min: 9, max: Infinity, name: 'AI Champion',            color: '#1A3C5E' },
]
```

- Ranges are **inclusive** on both ends.
- The last band should use `Infinity` for `max` to catch any high score.
- `color` is any CSS colour — used for the tier badge border and accent.

> ⚠️ **The Apps Script must mirror this.** If you rename a tier, you must also
> update `COMPETENCY_TIERS` in `ASA_GoogleAppsScript.gs` because the back-end
> uses tier names to group respondents in the dashboard and email report.

---

## Scoring — what counts as "correct"

The max score is computed dynamically from the questions list:

```js
maxScore = questions.filter(q => q.correct !== -1).length
```

If you add 9 scored questions + 3 unscored reflections, the headline score will
read `X / 9`.

### Mirror the `correct` index on the back-end

`ASA_GoogleAppsScript.gs` has its own minimal questions array used only for
scoring (the question text doesn't live on the back-end — only the index of the
right answer). If you change a question's correct answer, also update:

```js
// ASA_GoogleAppsScript.gs, near the top
const QUESTIONS = [
  { id: 'q1', category: 'Foundational',  correct: 1 },
  { id: 'q2', category: 'Foundational',  correct: 1 },
  // …
];
```

For `mcq_other`, `text`, and `scale` questions with `correct: -1`, you can omit
them from the back-end array entirely (scoring ignores them) — but mirroring them
is harmless.

---

## Adding a new question — full walkthrough

Let's say you want to add a Q13: "What size project are you working on?" as an
unscored MCQ.

1. **Append to `questions[]` in `survey.config.js`:**
   ```js
   {
     id: 'q13',
     type: 'mcq',
     category: 'Context',
     question: 'What size of project are you currently working on?',
     options: [
       'Small (< $1M)',
       'Medium ($1M – $20M)',
       'Large ($20M – $100M)',
       'Mega (> $100M)',
     ],
     correct: -1,                       // unscored — pure cohort segmentation
   },
   ```

2. **Update the splash description** if the question count changed:
   ```js
   description: '13 questions · about 5–10 minutes · …',
   ```

3. **(Optional)** Mirror in `ASA_GoogleAppsScript.gs` for completeness:
   ```js
   { id: 'q13', category: 'Context', correct: -1 },
   ```

4. **Commit, push.** GH Actions auto-builds and deploys.

5. **(Optional)** If you also added back-end changes, paste the updated `.gs`
   into the Apps Script editor → Manage deployments → ✏️ → "New version" → Deploy.

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

## Future: runtime config loader (not yet built)

Right now, swapping the survey requires a git commit + GH Pages redeploy.
If you'd like end-users to point the *same deployed app* at a different survey
config (e.g., via a URL like `?config=https://hosted-config.json`), tell me and
I'll add the loader. Trade-offs:

- ➕ No redeploy required per new survey
- ➕ Same domain, different surveys (different QR codes for different cohorts)
- ➖ Adds runtime validation (the config has to be checked before render)
- ➖ Public hosting required for the config JSON (or an Apps Script that returns it)

Currently this is unbuilt. The build-time config is faster to iterate on for a
single survey and avoids the validation surface.
