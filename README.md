# AISurveyApp (ASA) - AI Literacy Survey Platform

**A autonomous, reusable survey platform to assess and improve AI competency in architectural practices.**

---

## What is ASA?

AISurveyApp is a mobile-first web application that:

✅ **Administers** 10 MCQ survey on AI literacy (from your PDF)  
✅ **Auto-calculates** competency scores and tiers  
✅ **Generates Reports** automatically after 15 minutes  
✅ **Sends Emails** with group summary + individual recommendations  
✅ **Logs Data** to Google Sheets for future reference  
✅ **Supports Repeat Surveys** to measure post-course improvement  
✅ **Manages Multiple Sessions** simultaneously with unique QR codes  

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

### 📊 Automatic Reporting
**Part 1: Group Summary** (sent to all participants)
- Cohort size and average score
- Score distribution by competency tier
- Key insights about group performance

**Part 2: Individual Report** (personalized to each participant)
- Personal score and competency level
- Personalized recommendations to level up
- Next steps and encouragement

### 🗂️ Data Management
- Sequentially tagged responses in Google Sheets
- Session IDs for cohort tracking
- Admin dashboard for viewing results
- Export capability for analysis

### 🔄 Repeat Survey Capability
- Pre/Post survey comparison
- Improvement tracking
- Celebratory reports showing progress

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

| Tier | Name | Score | Description |
|------|------|-------|-------------|
| 0 | Foundational Awareness | 0–3 | Just beginning AI literacy journey |
| 1 | Applied AI Tools | 4–6 | Can use AI tools effectively |
| 2 | AI Strategy & Ethics | 7–9 | Understands implications & limitations |
| 3 | Peer-led AI Practice | 10 | Leader & mentor in AI adoption |

---

## 🚀 QUICK START (5 Steps)

### Step 1: Create Google Sheet
1. Go to [Google Drive](https://drive.google.com)
2. Create new spreadsheet: "ASA_Responses"
3. Keep open for next step

### Step 2: Deploy Google Apps Script
1. In Google Sheet → **Extensions** → **Apps Script**
2. Copy & paste code from `ASA_GoogleAppsScript.gs`
3. **Deploy** as "Web app"
4. **Copy the deployment URL** (you'll need this soon)

### Step 3: Deploy React App
1. Clone or download `ASA_Complete.jsx`
2. Deploy to Vercel (free hosting):
   ```bash
   npm install -g vercel
   vercel
   ```
3. **Copy your app URL** (e.g., https://asa-app.vercel.app)

### Step 4: Connect the Two
In `ASA_Complete.jsx`, find `submitSurvey()` and add:
```javascript
await fetch('YOUR_GOOGLE_APPS_SCRIPT_URL', {
  method: 'POST',
  body: JSON.stringify({...})
});
```

### Step 5: Generate QR Code
```bash
python qr_generator.py https://asa-app.vercel.app
```

**Done!** Test by scanning the QR code from your phone.

---

## 📋 Files Included

| File | Purpose |
|------|---------|
| `ASA_Complete.jsx` | React frontend (registration + survey + admin portal) |
| `ASA_GoogleAppsScript.gs` | Backend (Sheets + email automation + scoring) |
| `qr_generator.py` | QR code generator (single or batch) |
| `ASA_DEPLOYMENT_GUIDE.md` | Detailed step-by-step deployment instructions |
| `README.md` | This file |

---

## 🎯 How It Works

### From Participant Perspective

1. **Scans QR code** → Opens survey in mobile browser
2. **Enters details** → Group/Session, Firm Size, Email, Mobile (optional)
3. **Answers 10 questions** → Sees progress bar (Q1/10, Q2/10, etc.)
4. **Gets immediate score** → "You scored 7/10"
5. **Waits 15 minutes** → Receives detailed reports via email:
   - **Part 1**: How their cohort performed
   - **Part 2**: Personal recommendations

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

### Customize Questions
Edit `QUESTIONS` array in both `ASA_Complete.jsx` and `ASA_GoogleAppsScript.gs`:
```javascript
const QUESTIONS = [
  { id: 'q1', category: 'Foundational', correct: 1 },
  // ... add your custom questions
];
```

### Customize Competency Tiers
Edit `COMPETENCY_TIERS` in `ASA_GoogleAppsScript.gs`:
```javascript
const COMPETENCY_TIERS = {
  0: { name: 'Foundational', range: '0–3' },
  1: { name: 'Applied', range: '4–6' },
  // ... customize scoring thresholds
};
```

### Customize Email Templates
Edit `generateIndividualReport()` in `ASA_GoogleAppsScript.gs`:
- Change recommendations
- Modify report tone
- Add organization branding

### Add Branding
In `ASA_Complete.jsx`:
- Update `splashTitle` and `splashSubtitle`
- Modify colors in `styles` object
- Add logo/footer with organization info

---

## 📊 Data Structure (Google Sheets)

| Column | Content |
|--------|---------|
| Timestamp | When response was submitted |
| Session ID | Unique session code |
| Session Name | Group/Class name |
| Email | Participant email |
| Mobile | Optional phone number |
| Firm Size | a/b/c (< 10 / < 20 / > 20) |
| Score | 0–10 |
| Competency Level | Tier name |
| Answers (JSON) | Detailed answer array |
| Report Sent | true/false |
| Report Timestamp | When email was sent |

---

## ⏱️ Timing & Automation

| Event | Timing | Action |
|-------|--------|--------|
| Participant submits | Immediate | Response stored in Sheets |
| Auto-report trigger | After 15 mins | Report queued |
| Email Part 1 & 2 | Within 5 mins of trigger | Sent to participant email |
| Data log | Concurrent | Saved to Sheets with timestamp |

---

## 🔐 Security & Privacy

- ✅ Google Sheets manages all data (encrypted, HIPAA/SOC2 compliant)
- ✅ Emails sent via Gmail (authenticated)
- ✅ Admin key required to access session dashboard
- ✅ Participant data only used for reporting
- ⚠️ Consider GDPR compliance if EU users

**Recommendations:**
- Use service account for email sending (optional enhancement)
- Anonymize data for analysis
- Add password protection to admin portal (optional)
- Review data retention policy quarterly

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
→ Verify Apps Script deployment URL is correct, check browser console

### "Automated reports delayed"
→ Check time-based trigger in Apps Script, verify Gmail isn't rate-limited

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

To measure improvement after AI training:

1. Run survey before course → "Pre-survey"
2. Run course/workshop
3. Re-run same survey → "Post-survey"
4. Compare results:
   - Score improvement: `Post - Pre`
   - Tier progression (e.g., "Applied" → "Strategy & Ethics")
   - Competency gains by category

**Implementation:** Add "Survey Type" column in Sheets (Pre/Post)

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
6. **Timing**: Allow 15 mins buffer after survey for report generation
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
A: Yes! Edit QUESTIONS array in both files and redeploy.

**Q: How do I run multiple sessions simultaneously?**
A: Generate unique QR codes per session with unique URLs (e.g., ?session=MORNING-01, ?session=AFTERNOON-02)

**Q: Can participants redo the survey?**
A: Yes. Same email can submit multiple times, but recommend unique session codes to distinguish pre/post.

**Q: How long does data stay in Google Sheets?**
A: Indefinitely. You control retention policy.

**Q: Can I export responses?**
A: Yes! Google Sheets → File → Download → CSV/Excel

**Q: What if someone doesn't receive the email?**
A: Check spam folder, verify email address, manually resend from Google Sheets.

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

**Version:** 1.0  
**Last Updated:** 2026  
**Status:** Production-Ready ✅

---

**Ready to launch? Start with the QUICK START section above!** 🎯
