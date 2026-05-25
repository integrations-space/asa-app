# AISurveyApp (ASA) - Complete Deployment Guide

## Overview
AISurveyApp is an autonomous AI literacy assessment platform for architects. Participants scan a QR code, answer 10 MCQs, get a personal report by email within seconds, and receive a cohort/group report later once their session is complete.

---

## PART 1: DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARTICIPANT FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Scan QR Code → Web App                                      │
│  2. Register (Group, Email, Firm Size)                          │
│  3. Answer 10 MCQs                                              │
│  4. Submit → Google Sheets                                      │
│  5. PERSONAL REPORT (Part 2) emailed within seconds             │
│  6. COHORT REPORT (Part 1) emailed later, once per session:     │
│     • Option 1 — auto at 95% of expected headcount, OR          │
│     • Option 2 — admin clicks "Send Group Report Now" in        │
│       the dashboard                                             │
│  7. All responses logged to Google Sheets                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 2: SETUP INSTRUCTIONS

### Prerequisites
- Google Account (Gmail + Google Drive)
- Vercel/Netlify account (for hosting React app)
- QR code generator (built-in or online)

### Step 1: Create Google Sheet

1. Go to [Google Drive](https://drive.google.com)
2. Create a new spreadsheet: "ASA_Responses"
3. Keep it open — you'll add the script next

### Step 2: Deploy Google Apps Script

1. In Google Sheet, go to **Extensions** → **Apps Script**
2. Delete the default `myFunction()` code
3. Copy and paste the entire content from `ASA_GoogleAppsScript.gs`
4. Save the project: Name it "ASA_Backend"
5. Click **Deploy** (top right)
   - Select "New Deployment"
   - Type: "Web app"
   - Execute as: Your Google Account
   - Who has access: "Anyone"
6. **Copy the deployment URL** — you'll need this for the React app

### Step 3: (Optional) Set Up Daily Fail-Safe Trigger

Personal reports send immediately on submit — no trigger needed. The cohort report sends automatically at 95% (Option 1) or on the admin's button press (Option 2). If you want a belt-and-braces fallback that catches sessions where the admin forgets and the headcount never lands:

1. In Apps Script, go to **Triggers** (left sidebar, clock icon)
2. Click **Create new trigger**
3. Configure:
   - Function: `processStaleSessions`
   - Deployment: Head
   - Event source: Time-driven
   - Type: Day timer (any hour)
4. Click **Save**

`processStaleSessions` scans `ASA_Sessions` once a day and fires the cohort report for any session that has responses but hasn't sent its group report after 7 days (configurable via the `STALE_SESSION_DAYS` Script Property).

### Step 4: Test Google Apps Script

1. In Apps Script, go to **Run** → Select `testEmailReport`
2. First time: Grant permissions (click "Review permissions" and approve)
3. Check Gmail inbox for the test personal report
4. To test the cohort/group report end-to-end: run `testGroupReport('YOUR-SESSION-ID')` after at least one real submission exists for that session.

### Step 5: Deploy React App to Vercel

1. Save the React code (`ASA_Complete.jsx`) locally
2. Create a React project:
   ```bash
   npx create-react-app asa-app
   cd asa-app
   # Replace src/App.js with ASA_Complete.jsx content
   ```
3. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
4. Deploy:
   ```bash
   vercel
   ```
5. Follow prompts, accept defaults
6. **Copy your deployed URL** (e.g., `https://asa-app.vercel.app`)

### Step 6: Update React App with Google Apps Script Endpoint

In `ASA_Complete.jsx`, find the `submitSurvey()` function and add:

```javascript
// After survey submission, send data to Google Apps Script
const response = await fetch('YOUR_GOOGLE_APPS_SCRIPT_URL', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: sessionId,
    sessionName: formData.sessionName,
    firmSize: formData.firmSize,
    email: formData.email,
    mobile: formData.mobile,
    answers: answers,
  }),
});
```

Replace `YOUR_GOOGLE_APPS_SCRIPT_URL` with the deployment URL from Step 2.

### Step 7: Generate QR Code

1. Go to [QR Code Generator](https://www.qr-code-generator.com/) or use the Python script below
2. Input your Vercel app URL
3. Download as PNG (high resolution for printing)
4. Size: A5 or larger for easy scanning

**Python QR Code Generator:**
```python
import qrcode

# Create QR code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=2,
)
qr.add_data('https://asa-app.vercel.app')
qr.make(fit=True)

# Create image
img = qr.make_image(fill_color="black", back_color="white")
img.save("asa_qr_code.png")
print("QR code saved as asa_qr_code.png")
```

### Step 8: Set Up Session Management (Optional)

For multiple simultaneous sessions:

1. Modify the React app to include a **unique session code** (e.g., ASA-MORNING-01)
2. Instructors enter this code at the start of each session
3. All responses are tagged with the session code in Google Sheets
4. Generate unique QR codes per session with unique URLs:
   ```
   https://asa-app.vercel.app?session=ASA-MORNING-01
   ```

---

## PART 3: RUNNING A SURVEY SESSION

### Before the Session
1. Print QR codes (A5 size, display on screen, or distribute as link)
2. Share QR code link or image with participants
3. Have backup: email the direct link if QR fails

### During the Session
1. Participants scan QR code from their mobile devices
2. They register with email and firm size
3. They answer 10 MCQs (~8-10 minutes)
4. Submit responses
5. Receive immediate summary score

### After Each Submission (Immediate)
- **Part 2 — Individual Report**: emailed within seconds of submit
  - Personal score & competency level
  - AI-generated, question-by-question feedback
  - Recommendations + next steps for learning
  - Note that a cohort report will follow once the session is complete
- Response logged to Google Sheets with all metadata

### After the Session is Complete (Cohort Report)
- **Part 1 — Cohort Report**: emailed once to every respondent
  - Cohort size, average / high / low scores, tier distribution
  - AI-generated narrative on collective strengths + gaps
- Two ways it fires (both supported; whichever happens first wins):
  - **Option 1 (auto)** — if `totalParticipants` was set at session creation (e.g. `createSession('ASA-MORNING-01', 'admin@firm.com', 12)`), the email fires once `ceil(total × 0.95)` people have submitted.
  - **Option 2 (manual)** — admin opens the session dashboard and clicks **Send Group Report Now**.
- The send is idempotent (single send per session) — locked by the `Group Report Sent` flag in `ASA_Sessions`.

---

## PART 4: ADMIN DASHBOARD ACCESS

**For instructors to view session results:**

1. In the React app, after survey submission, click **"View Session Dashboard"**
2. Enter the admin key (displayed when session was created)
3. View:
   - Session name & ID
   - Total responses
   - Group statistics (average, min, max scores)
   - Individual participant responses & scores

---

## PART 5: POST-COURSE REPEAT SURVEY

To measure improvement after the AI course:

1. Re-run the survey with same participants
2. Responses are marked as "Post-Survey" in Google Sheets
3. Generate comparison report:
   - Before score vs. After score
   - Improvement percentage
   - Tier progression
   - Celebrate gains!

**Implementation:**
- Add a column "Survey Type" (Pre/Post) in Google Sheets
- Modify React to ask "Is this a repeat survey?" at registration
- Generate comparative reports

---

## PART 6: TROUBLESHOOTING

### Issue: QR Code not scanning
- **Solution:** Ensure high contrast, print larger, use backup link

### Issue: Google Apps Script not receiving data
- **Solution:** Check deployment URL is correct, ensure CORS is enabled

### Issue: Emails not sending
- **Solution:** Check Gmail account hasn't rate-limited, verify email addresses are valid

### Issue: Session data not appearing in Google Sheets
- **Solution:** Verify Google Apps Script was deployed correctly, check logs in Apps Script editor

### Issue: Personal report email didn't arrive
- **Solution:** Check spam folder; in the Apps Script editor open **Executions** and look for failed `sendIndividualReport` runs. Personal reports fire on submit — there is no delay.

### Issue: Cohort/group report never sent
- **Solution:** Open the admin dashboard for the session. If `totalParticipants` was set, check the progress line (need `ceil(total × 0.95)` submissions). Otherwise the admin must press **Send Group Report Now**. The optional daily `processStaleSessions` trigger covers sessions that stall.

---

## PART 7: CUSTOMIZATION OPTIONS

### Change Competency Tiers
Edit in `ASA_GoogleAppsScript.gs`:
```javascript
const COMPETENCY_TIERS = {
  0: { name: 'Foundational Awareness', range: '0–3' },
  1: { name: 'Applied AI Tools', range: '4–6' },
  // ... customize as needed
};
```

### Modify Email Templates
In `generateIndividualReport()` function, customize:
- Report header/footer
- Personalized recommendations
- Tone and voice

### Add Custom Questions
1. Update QUESTIONS array in both files
2. Update scoring logic if needed
3. Redeploy both React app and Google Apps Script

### Branding
- Add your organization logo to splash screen
- Customize colors in React styles
- Add footer with course details

---

## PART 8: DEPLOYMENT CHECKLIST

- [ ] Google Sheet created ("ASA_Responses")
- [ ] Google Apps Script deployed with web app URL
- [ ] *(Optional)* Daily `processStaleSessions` trigger set for stale-session fail-safe
- [ ] `testEmailReport` run successfully (personal report received)
- [ ] React app deployed to GitHub Pages (via the `Deploy to GitHub Pages` workflow on push to master)
- [ ] `VITE_BACKEND_URL` secret set in repo → Settings → Secrets and variables → Actions (points to the Apps Script web app URL)
- [ ] QR code generated and tested
- [ ] QR code prints clearly and scans correctly
- [ ] Per session: `createSession('ASA-XXX', 'admin@firm.com'[, totalParticipants])` run — admin key noted, decided Option 1 vs Option 2
- [ ] First survey session run end-to-end: personal report received within seconds; cohort report received after 95% / button-press
- [ ] Google Sheets updated with responses

---

## PART 9: ONGOING MAINTENANCE

### Weekly
- Review Google Sheets for new responses
- Check spam folder for bounced emails
- Monitor admin dashboard usage

### Monthly
- Export anonymized data for analysis
- Review competency distribution across cohorts
- Share insights with leadership

### Quarterly
- Update question bank if curriculum changes
- Review email templates and recommendations
- Analyze which competency tiers dominate

---

## TECHNICAL SUPPORT

For issues with:
- **React App:** Check browser console for errors
- **Google Apps Script:** Check Apps Script logs (View → Logs)
- **Email Sending:** Check Gmail for send logs, verify email addresses
- **Google Sheets:** Ensure proper permissions and formulas

---

## SECURITY & PRIVACY

- All data stored in Google Sheets (managed by Google)
- Email addresses collected for reporting only
- Consider GDPR/privacy compliance for your region
- Optional: Anonymize responses for analysis
- Optional: Add password protection to admin dashboard

---

## SUCCESS METRICS

Track:
- Total participants surveyed
- Average competency score
- Distribution across tiers
- Pre/Post improvement scores
- Email delivery success rate
- Admin dashboard usage

---

**Ready to deploy? Start with Step 1!**

Questions? Check the troubleshooting section or review the inline code comments.
