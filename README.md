# AISurveyApp (ASA) - AI Literacy Survey Platform

**An autonomous, reusable survey platform to assess and improve AI competency in architectural practices.**

---

## What is ASA?

AISurveyApp is a mobile-first web application that:

✅ **Administers** a config-driven MCQ survey on AI literacy (default: 9 scored questions + reflection items)  
✅ **Auto-calculates** competency scores and tiers  
✅ **Sends the individual report** immediately on submit (per-person)  
✅ **Sends the cohort report** separately, once per session: auto-fires at 95% of expected headcount, or admin-triggered from the dashboard  
✅ **Logs data** to Google Sheets for future reference  
✅ **Supports running the same survey** before and after training to track change (pre/post via separate session IDs)  
✅ **Manages multiple sessions** simultaneously with unique session IDs / QR codes  

---

## 📋 Customise the Survey (Bring Your Own Questionnaire)

This app is fully **config-driven**. Swap in any survey by editing a single file — no engine code changes needed.

**📖 [Full Questionnaire Format Guide →](QUESTIONNAIRE_FORMAT.md)**

🔗 Publicly shareable link (renders on GitHub):
<https://github.com/integrations-space/asa-app/blob/master/QUESTIONNAIRE_FORMAT.md>

The guide covers:
- The four supported question types — `mcq`, `mcq_other` (dropdown + "Other" text), `text`, `scale`
- Registration field schema and URL pre-fill behaviour
- Scoring tiers and how `correct: -1` marks unscored reflection questions
- A complete fill-in **JSON template** a non-developer can hand to a maintainer

**Workflow in 3 steps:**

1. Fill in `asa-app/src/config/survey.config.js` (or the JSON template) with your questions, tiers, and registration fields.
2. Commit and push to `master` — GitHub Actions auto-deploys to GitHub Pages within ~1 minute.
3. *(If scoring rules changed)* Update the `QUESTIONS` array in `ASA_GoogleAppsScript.gs` and redeploy as a new Apps Script version.

---

## Key Features

### 📱 Mobile-First Design
- Responsive web app for all devices
- QR code scanning for instant access
- Progress indicator during survey
- Input validation and duplicate prevention

### 📊 Two-Email Reporting Flow

**Individual Report** — sent **immediately** when each participant submits.
- Personal score and competency level
- AI-generated, personalised feedback per question
- Recommendations + next steps tailored to their tier
- Notes that a separate cohort report will follow

**Cohort Report** — sent **at most once per session**, to every respondent. Two triggers, both supported on the same session (whichever fires first wins):
- **Option 1 (auto, 95% threshold)** — set `totalParticipants` at session creation, e.g. `createSession('ASA-MORNING-01', 'admin@firm.com', 12)`. The cohort email fires automatically once `ceil(total × 0.95)` people have submitted.
- **Option 2 (manual)** — omit the headcount, then click **Send Group Report Now** in the admin dashboard whenever ready.

The send is idempotent: a flag in the `ASA_Sessions` sheet locks the session after firing, so subsequent submissions or button presses can't re-send. An optional daily `processStaleSessions` trigger is a belt-and-braces fail-safe for sessions that never hit 95% and where the admin forgets the button.

### 🗂️ Data Management
- Sequentially tagged responses in Google Sheets
- Session IDs for cohort tracking
- Admin dashboard for viewing results
- Export capability for analysis

### 🔄 Pre/Post Comparison
The engine doesn't have built-in pre/post analytics — but because each session has its own Session ID, you can run the same survey config before and after training (e.g. `ASA-PRE-2026Q2` and `ASA-POST-2026Q2`), then compare averages directly from the Google Sheet using a pivot or filter.

---

## System Architecture

```
┌─────────────┐
│   QR Code   │
│  (Print)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   React Web App (ASA)   │
│ - Registration Form     │
│ - 10 MCQ Survey         │
│ - Progress Indicator    │
│ - Score Display         │
│ - Admin Dashboard       │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Google Apps Script      │
│ - Data Validation       │
│ - Score Calculation     │
│ - Report Generation     │
│ - Email Automation      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Google Sheets          │
│  (Data Storage)         │
│  + Gmail (Reports)      │
└─────────────────────────┘
```

---

## Competency Tiers

Max score in the default config is **9** (10 questions, 1 unscored self-assessment). Tier breakpoints are defined in [survey.config.json](asa-app/src/config/survey.config.json) and mirrored in [ASA_GoogleAppsScript.gs](ASA_GoogleAppsScript.gs#L77) — keep them in sync if you customise.

| Tier | Name | Score | Emoji |
|------|------|-------|-------|
| 0 | Foundational Awareness | 0–3 | 📚 |
| 1 | Applied Practitioner | 4–6 | ⚙️ |
| 2 | Strategic & Critical | 7–8 | 🎯 |
| 3 | AI Champion | 9+ | 🏆 |

---

## 🚀 QUICK START

### Step 1: Create the Google Sheet
1. Go to [Google Drive](https://drive.google.com)
2. Create a new spreadsheet (any name; the script creates the `ASA_Responses` and `ASA_Sessions` tabs on first use)

### Step 2: Deploy the Apps Script backend
1. In your sheet → **Extensions** → **Apps Script**
2. Paste the full contents of [ASA_GoogleAppsScript.gs](ASA_GoogleAppsScript.gs) → **`Ctrl+S`** to save
3. *(Optional — enables AI-narrated reports)* **Project Settings → Script Properties** → add one of: `GROQ_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, or `DEEPSEEK_API_KEY`. Without any of these, reports fall back to canned templates.
4. **Deploy → New deployment → Type: Web app → Execute as: Me → Who has access: Anyone → Deploy**
5. **Copy the Web app URL** (`https://script.google.com/macros/s/AKfyc…/exec`) — you need it for the next step.

### Step 3: Wire the frontend to the backend
1. In this GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `VITE_BACKEND_URL`, Value: paste the Apps Script web app URL from Step 2
3. *(Trigger first build)* push any commit to `master`. The `Deploy to GitHub Pages` workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds and publishes to `https://<user>.github.io/<repo>/` in ~30 seconds.

### Step 4: Create your first session
In the Apps Script editor, add a wrapper at the bottom of the file:
```js
function mintFirstSession() {
  // Args: sessionId, adminEmail, totalParticipants (optional)
  return createSession('ASA-FIRST-RUN', 'you@firm.com', 10);
}
```
Save → pick `mintFirstSession` from the function dropdown → **Run**. The admin key arrives by email.

### Step 5: Distribute the survey
Build the participant URL — `sessionId` and `groupName` auto-fill the registration form:
```
https://<user>.github.io/<repo>/?sessionId=ASA-FIRST-RUN&groupName=Your%20Cohort
```
*(`%20` = URL-encoded space.)* Generate a QR code:
```powershell
python qr_generator.py "https://<user>.github.io/<repo>/?sessionId=ASA-FIRST-RUN&groupName=Your%20Cohort"
```

**Done.** Scan the QR, submit a test response, check inbox.

---

## 📋 Files & Folders

| Path | Purpose |
|------|---------|
| [asa-app/](asa-app/) | Vite + React frontend — survey engine, registration form, admin dashboard. Built and deployed automatically by GitHub Actions. |
| [asa-app/src/SurveyEngine.jsx](asa-app/src/SurveyEngine.jsx) | The generic, config-driven survey component (no domain content) |
| [asa-app/src/config/survey.config.json](asa-app/src/config/survey.config.json) | The bundled questionnaire — edit to swap in your own |
| [asa-app/src/config/survey.config.js](asa-app/src/config/survey.config.js) | Loader for the JSON config + the `buildConfig` helper for runtime `?config=URL` overrides |
| [ASA_GoogleAppsScript.gs](ASA_GoogleAppsScript.gs) | Backend — Sheets ingestion, scoring, email automation, admin endpoints, AI provider fan-out |
| [qr_generator.py](qr_generator.py) | QR code generator (single or batch) |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | CI: builds the frontend and publishes to GitHub Pages on every push to `master` |
| [QUESTIONNAIRE_FORMAT.md](QUESTIONNAIRE_FORMAT.md) | Full schema reference for `survey.config.json` |
| [ASA_DEPLOYMENT_GUIDE.md](ASA_DEPLOYMENT_GUIDE.md) | Long-form deployment walkthrough |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | One-page cheat sheet for facilitators |
| [README.md](README.md) | This file |

---

## 🎯 How It Works

### From Participant Perspective

1. **Scans QR code** → Opens survey in mobile browser
2. **Enters details** → Group/Session, Firm Size, Email, Mobile (optional)
3. **Answers 10 questions** → Sees progress bar (Q1/10, Q2/10, etc.)
4. **Gets immediate score** → "You scored 7/10"
5. **Receives personal report email within seconds** — score, tier, AI-generated feedback, recommendations.
6. **Receives cohort report email later** — once 95% of the cohort has submitted (Option 1) or the admin presses the dashboard button (Option 2).

### From Administrator Perspective

1. **Creates session** → Gets unique Session ID & Admin Key
2. **Prints/displays QR code** → Participants scan
3. **Monitors in real-time** → Admin dashboard shows live responses
4. **Views group stats** → Average score, distribution, insights
5. **Exports data** → Google Sheets with all responses tagged

### From Organization Perspective

1. **Runs pre-course survey** → Baseline competency level
2. **Runs AI course/workshop** → Training on AI tools
3. **Runs post-course survey** → Measures improvement
4. **Analyzes impact** → Tracks competency gains
5. **Plans next steps** → Targeted follow-up learning

---

## 🔧 Configuration

### Customise the survey content (questions, tiers, registration fields)
The frontend is **fully config-driven** — read [QUESTIONNAIRE_FORMAT.md](QUESTIONNAIRE_FORMAT.md) for the full schema. Two ways to swap in your own survey:
- **Bundle it**: edit [asa-app/src/config/survey.config.json](asa-app/src/config/survey.config.json), commit, push. GitHub Actions rebuilds + redeploys automatically.
- **Hot-swap at runtime**: host a JSON config publicly (e.g. a GitHub gist raw URL) and append `?config=<URL>` to the app URL. No rebuild needed — useful for one-off events.

### Keep the backend scoring in sync
[ASA_GoogleAppsScript.gs](ASA_GoogleAppsScript.gs) has its own copies of:
- `QUESTIONS` (line ~84) — for scoring on the backend
- `COMPETENCY_TIERS` (line ~76) — for tier names in emails
- `MAX_SCORE` (line ~9) — the denominator on the canned report

If you change question count or tier boundaries in the JSON config, update these three constants in the .gs file too. Then bump the Apps Script version (**Deploy → Manage deployments → ✏️ → New version**).

### Customise the email reports
- **AI-generated reports (primary path)**: edit `buildAIIndividualPrompt_` / `buildAIGroupPrompt_` in [ASA_GoogleAppsScript.gs](ASA_GoogleAppsScript.gs) to change tone, length, focus areas, or constraints sent to the LLM.
- **Canned fallback reports (used when no AI key is set)**: edit `generateIndividualReport` / `generateGroupSummaryReport` / `getRecommendations` / `getCompetencyDescription`.
- **Email shell (branding, header, footer)**: edit `buildIndividualEmailBody_` / `buildGroupEmailBody_`.

### Add branding to the survey UI
In the React app:
- Update `title` / `subtitle` / `description` in [survey.config.json](asa-app/src/config/survey.config.json) (these appear on the splash screen)
- Modify colours/typography in the `styles` object at the bottom of [asa-app/src/SurveyEngine.jsx](asa-app/src/SurveyEngine.jsx)

---

## 📊 Data Structure (Google Sheets)

Two sheets, both auto-created and auto-migrated by the Apps Script on first use.

### `ASA_Responses` — one row per submission
| Column | Content |
|--------|---------|
| Timestamp | When response was submitted (ISO 8601) |
| Session ID | Unique session code (matches a row in `ASA_Sessions`) |
| Session Name | Group/cohort name from the registration form |
| Email | Participant email |
| Mobile | Optional phone number |
| Firm Size | Per registration config (default: `a` / `b` / `c` = <10 / <20 / >20) |
| Score | 0–MAX_SCORE (default max: 9) |
| Competency Level | Tier name |
| Answers (JSON) | Per-question answers, stringified |
| Report Sent | true once the individual email fired |
| Report Timestamp | When the individual email fired |

### `ASA_Sessions` — one row per session
| Column | Content |
|--------|---------|
| Session ID | Unique session code |
| Admin Key | Required to open the admin dashboard for this session |
| Created At | ISO timestamp |
| Admin Email | Audit field only — not consumed by runtime code |
| Total Participants | Optional headcount; enables 95% auto-trigger for the cohort report when set |
| Group Report Sent | `true` once the cohort report has fired (lock) |
| Group Report Sent At | When the cohort report fired |

---

## ⏱️ Timing & Automation

| Event | Timing | Action |
|-------|--------|--------|
| Participant submits | Immediate | Response stored in Sheets |
| Individual report | Immediate | Emailed to that participant within seconds of submit |
| Cohort report — Option 1 (auto) | The moment 95% of `totalParticipants` have submitted | One-shot email to all respondents; flag locks the session so it can't fire again |
| Cohort report — Option 2 (manual) | When admin clicks **Send Group Report Now** | Same one-shot email; flag locks the session so it can't fire again |
| Stale-cohort fail-safe *(optional)* | Daily, when set up as a time-based trigger on `processStaleSessions` | Sends the cohort report for any session ≥ `STALE_SESSION_DAYS` (default 7) that has responses but hasn't fired yet |

**Idempotency model:** the cohort report fires **at most once per session**, regardless of trigger. Once the `Group Report Sent` flag in `ASA_Sessions` flips to `TRUE`, all three trigger paths (auto, manual, stale fail-safe) see it and skip. To force a resend, set that cell back to `FALSE` and clear `Group Report Sent At`.

---

## 🔐 Security & Privacy

- Data stored in Google Sheets under the owning Google account (encryption at rest is Google-managed). HIPAA/SOC 2 coverage requires explicit Workspace contracts — don't assume by default.
- Emails sent via the Apps Script owner's Gmail account, subject to Gmail's daily send quota (~100/day on free Workspace, 1500/day on paid).
- Admin dashboard is gated by a per-session key in the `ASA_Sessions` sheet. Keys are 8-char alphanumeric (~2.8 trillion combos) when minted via `createSession()`; if you hand-write a row, pick something equally unguessable — anyone with the key can read the full cohort.
- Apps Script web app is deployed `Anyone` (required for the React app to POST/GET cross-origin without preflight). The `doPost` accepts any submission; the `doGet` endpoints require a valid `adminKey`.
- Participant data is used only for the report email and the admin dashboard. Consider GDPR / PDPA disclosures if your cohort includes residents of regulated jurisdictions.

**Hardening suggestions:**
- Mint admin keys via `createSession()` rather than typing recognisable words into the sheet.
- Review retention quarterly; archive or delete old `ASA_Responses` rows as appropriate.
- For sensitive cohorts, consider a Workspace account with a stricter privacy baseline.

---

## 📱 Mobile & Browser Compatibility

✅ **Tested on:**
- iPhone 12+ (Safari)
- Android 11+ (Chrome)
- iPad/Tablets
- Desktop browsers (Firefox, Chrome, Safari, Edge)

✅ **Features:**
- Responsive design (320px - 2560px)
- Touch-friendly buttons
- Mobile keyboard handling
- Offline capability (local storage fallback)

---

## 🐛 Troubleshooting

### "QR Code won't scan"
→ Increase print size (A5 minimum), ensure high contrast, use backup link

### "Emails not sending"
→ Check Gmail rate limits, verify email addresses, review Apps Script logs

### "Survey data not appearing in Sheets"
→ Confirm `VITE_BACKEND_URL` (GitHub repo secret) matches the **currently deployed** Apps Script web app URL. If you redeployed Apps Script as a *new deployment* (not a new version of an existing one), the URL changed and the secret needs updating — then rebuild the React app by pushing any commit.

### "Personal report didn't arrive"
→ Check Gmail rate limits + spam folder; review Apps Script Executions for `sendIndividualReport` errors. Personal reports fire on submit, not on a delay.

### "Cohort/group report never sent"
→ Check the **Cohort Group Report** panel in the admin dashboard. If `totalParticipants` was set, confirm enough people have submitted (need `ceil(total × 0.95)`); otherwise the admin needs to press **Send Group Report Now**. The optional `processStaleSessions` daily trigger catches sessions that fall through the cracks.

### "Admin dashboard not loading"
→ Verify admin key is correct, check browser cookies/storage

---

## 📈 Analytics & Reporting

### Built-in Metrics
- Total responses by session
- Average score per cohort
- Distribution across competency tiers
- Email delivery success rate

### Custom Analysis
Export Google Sheets data to:
- **Google Data Studio** → Visual dashboards
- **Excel/CSV** → Further analysis
- **Tableau** → Advanced visualizations

---

## 🔄 Repeat Survey (Pre/Post)

There's no built-in pre/post comparison, but session IDs make it straightforward:

1. **Pre-course session**: `createSession('ASA-COURSE-PRE', ...)` → share QR with cohort → results land in `ASA_Responses` tagged `ASA-COURSE-PRE`.
2. **Run training.**
3. **Post-course session**: `createSession('ASA-COURSE-POST', ...)` → same QR template, new session ID → results tagged `ASA-COURSE-POST`.
4. **Compare in the sheet**: pivot on `Session ID`, average `Score`, count tier transitions. Or paste both filtered ranges into a chart in Sheets.

Same email for participants identifies them across sessions; pivot-by-email to track individual deltas.

---

## 🎓 Use Cases

### Scenario 1: Architecture Firm Training
- Week 1: Pre-course survey → baseline
- Weeks 2-4: AI course/workshops
- Week 5: Post-course survey → measure impact
- Report to leadership: "Team AI competency improved 40%"

### Scenario 2: University Course
- Day 1: Baseline assessment
- Course runs (4-8 weeks)
- Final week: Post-assessment
- Analytics: Show student progress by tier

### Scenario 3: Professional Development Program
- Monthly cohorts
- Each cohort takes survey
- Track cohort-to-cohort trends
- Identify which training modules are most effective

---

## 💡 Tips for Success

1. **Test first**: Run a test survey with colleagues before going live
2. **Print QR codes**: Display on screen or print for distribution
3. **Backup link**: Always have URL backup if QR fails
4. **Email testing**: Verify test email arrives before live session
5. **Mobile testing**: Test on actual mobile devices
6. **Timing**: Personal reports go out within seconds; the cohort report waits for 95% completion (Option 1) or your dashboard button (Option 2) — plan the session debrief accordingly
7. **Batch sessions**: Run multiple sessions with unique QR codes per group
8. **Data backup**: Export Google Sheets monthly as CSV backup

---

## 🚀 Advanced Features (Optional Enhancements)

- [ ] **Multi-language support** → Add i18n
- [ ] **PDF report export** → Generate downloadable PDFs
- [ ] **SMS notifications** → Alert participants when report ready
- [ ] **Team comparison** → Benchmark across firms
- [ ] **Certificate generation** → Auto-create certificates for top tiers
- [ ] **API integration** → Connect to LMS (Moodle, Canvas, Blackboard)
- [ ] **Slack notifications** → Admin alerts on new responses
- [ ] **Custom branding** → Logo, colors, domain customization

---

## 📞 Support & FAQs

**Q: Can I modify the questions?**
A: Yes — edit [asa-app/src/config/survey.config.json](asa-app/src/config/survey.config.json) (and `QUESTIONS` / `MAX_SCORE` in [ASA_GoogleAppsScript.gs](ASA_GoogleAppsScript.gs) if scoring rules change). Push to master; Pages rebuilds automatically. Apps Script needs a manual version bump.

**Q: How do I run multiple sessions simultaneously?**
A: Generate unique QR codes per session with unique URLs, e.g.
`?sessionId=ASA-MORNING-01&groupName=Morning%20Group` and
`?sessionId=ASA-AFTERNOON-02&groupName=Afternoon%20Group`.

**Q: Can participants redo the survey?**
A: Yes — the same email can submit multiple times. Use distinct session IDs (e.g. `…-PRE` / `…-POST`) so the responses don't collapse into one cohort.

**Q: How long does data stay in Google Sheets?**
A: Indefinitely. You own retention.

**Q: Can I export responses?**
A: Yes — Google Sheets → `File` → `Download` → CSV / Excel.

**Q: What if someone doesn't receive the email?**
A: Check spam; verify the email address in `ASA_Responses`; check Apps Script **Executions** for failed `sendIndividualReport` runs. To manually resend the individual report, run `testEmailReport` from the editor after editing the test payload's email.

**Q: Why does the email say my score is X/9, but my survey had 12 questions?**
A: Q10–Q12 are reflection / self-assessment items (`correct: -1` in the question definitions). They're stored but not scored. `MAX_SCORE` reflects the number of scored items only.

---

## 📄 License & Attribution

This survey system is based on **10 MCQs assessing AI literacy in architectural practice** (from SIA training curriculum).

Feel free to:
- ✅ Use, modify, share
- ✅ Customize for your organization
- ✅ Run multiple sessions
- ✅ Extract data for analysis

Please credit: "Based on AISurveyApp framework"

---

## 📧 Questions?

Refer to `ASA_DEPLOYMENT_GUIDE.md` for detailed step-by-step instructions.

---

**Status:** Production — currently running real cohorts.
**Last substantive update:** 2026-05-26 (decoupled cohort/individual reports, 95% auto-trigger + manual button, docs sweep).

---

**Ready to launch? Start with the QUICK START section above!** 🎯
