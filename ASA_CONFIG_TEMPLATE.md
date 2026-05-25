# AISurveyApp (ASA) Configuration Template

## BEFORE YOU DEPLOY - Fill in these details

### 1. GOOGLE APPS SCRIPT ENDPOINT
After deploying Google Apps Script, copy the URL here:
```
GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/d/[YOUR_PROJECT_ID]/usercontent"
```

### 2. VERCEL APP URL
After deploying React app to Vercel, copy the URL here:
```
REACT_APP_URL = "https://asa-app.vercel.app"  # Or your custom domain
```

### 3. SURVEY CUSTOMIZATION

#### Organization Name
```javascript
ORGANIZATION_NAME = "Your Architecture Firm Name"
```

#### Splash Screen Text
```javascript
SPLASH_TITLE = "AI Literacy Survey"
SPLASH_SUBTITLE = "Assess your AI competency"
SPLASH_DESCRIPTION = "This survey evaluates your understanding and use of AI tools in architectural practice."
```

#### Email Configuration
```javascript
SENDER_EMAIL = "noreply@yourfirm.com"  // Gmail account running the survey
ADMIN_EMAIL = "admin@yourfirm.com"     // Receives copies of all reports
```

---

## DEPLOYMENT CHECKLIST

### Phase 1: Google Setup
- [ ] Create Google Account (or use existing)
- [ ] Create Google Sheet: "ASA_Responses"
- [ ] Share sheet with all admins who need access
- [ ] Note Google Apps Script URL

### Phase 2: Backend (Google Apps Script)
- [ ] Copy `ASA_GoogleAppsScript.gs` content
- [ ] Paste into Apps Script editor
- [ ] Deploy as "Web app"
- [ ] Set permissions to "Anyone"
- [ ] Copy deployment URL
- [ ] Set time-based trigger (every 5 mins)
- [ ] Test email sending (run `testEmailReport()`)

### Phase 3: Frontend (React/Vercel)
- [ ] Create Vercel account
- [ ] Upload `ASA_Complete.jsx` to new React project
- [ ] Update Google Apps Script URL in React code
- [ ] Deploy to Vercel
- [ ] Copy app URL

### Phase 4: Testing
- [ ] Test survey with colleague
- [ ] Verify QR code scans
- [ ] Confirm email reports arrive
- [ ] Check Google Sheets has data
- [ ] Test admin dashboard

### Phase 5: QR Code Generation
- [ ] Install Python: `pip install qrcode[pil]`
- [ ] Run: `python qr_generator.py https://your-app-url.vercel.app`
- [ ] Print QR codes (A5 size or larger)
- [ ] Test scanning before session

### Phase 6: Go Live
- [ ] Schedule first session
- [ ] Distribute QR code to participants
- [ ] Monitor admin dashboard during session
- [ ] Verify automated reports are sent
- [ ] Collect feedback

---

## SURVEY SETTINGS

### Competency Tier Ranges (Edit if needed)
```javascript
COMPETENCY_TIERS = {
  0: { name: 'Foundational Awareness', range: '0–3' },
  1: { name: 'Applied AI Tools', range: '4–6' },
  2: { name: 'AI Strategy & Ethics', range: '7–9' },
  3: { name: 'Peer-led AI Practice', range: '10' },
}
```

### Report Timing
```javascript
REPORT_DELAY_MINUTES = 15  // How long before auto-reports are sent
REPORT_CHECK_INTERVAL = 5  // How often to check for reports to send
```

### Email Report Templates
Located in `ASA_GoogleAppsScript.gs`:
- `generateGroupSummaryReport()` - Part 1 (group stats)
- `generateIndividualReport()` - Part 2 (personal recommendations)

Customize these functions to match your organization's tone.

---

## SESSION MANAGEMENT

### Option 1: Single Session
- One QR code for all participants
- All responses tagged with same Session ID
- Good for: Single class or workshop

### Option 2: Multiple Simultaneous Sessions
- Generate unique QR codes per session
- Add session parameter to URL: `?session=SESSION_CODE`
- Example: 
  ```
  https://asa-app.vercel.app?session=MORNING-CLASS-01
  https://asa-app.vercel.app?session=AFTERNOON-CLASS-02
  ```

### Option 3: Pre/Post Survey
- Run survey twice with same cohort
- Mark responses as "Pre" or "Post" in Google Sheets
- Calculate improvement scores
- Send celebratory "progress" reports

---

## CUSTOMIZATION OPTIONS

### Add Organization Logo
In `ASA_Complete.jsx`, add to splash screen:
```javascript
<img src="logo.png" style={styles.logo} alt="Logo" />
```

### Change Color Scheme
Modify the `styles` object in `ASA_Complete.jsx`:
```javascript
const styles = {
  primaryColor: '#185FA5',    // Main blue
  secondaryColor: '#0F6E56',  // Teal
  accentColor: '#D85A30',     // Coral
  // ... customize all colors
}
```

### Modify Email Recommendations
In `ASA_GoogleAppsScript.gs`, customize function:
```javascript
function getRecommendations(score) {
  if (score <= 3) {
    return `
      <ul>
        <li>Your custom recommendation 1</li>
        <li>Your custom recommendation 2</li>
      </ul>
    `;
  }
  // ... add for each tier
}
```

### Add Questions
1. Add new object to QUESTIONS array in both files
2. Update scoring logic if needed
3. Redeploy both React app and Google Apps Script

Example new question:
```javascript
{
  id: 'q11',
  category: 'Applied',
  question: 'Your custom question text',
  options: [
    'Option A',
    'Option B',
    'Option C',
    'Option D',
  ],
  correct: 1,  // Index of correct answer
}
```

---

## EMAIL CUSTOMIZATION

### Report Subject Lines
Current:
```
Subject: Your AI Competency Survey Results
```

Customize in `sendEmailReport()` function.

### Report Tone & Language
Modify strings in:
- `generateGroupSummaryReport()` - Group-focused language
- `generateIndividualReport()` - Individual-focused
- `getRecommendations()` - Motivational/technical tone
- `getCompetencyDescription()` - Tier explanations

### Signature & Footer
Add to email template:
```html
<p>---</p>
<p>For questions about this survey, contact: admin@yourfirm.com</p>
<p>Learn more about our AI training program: https://yourfirm.com/ai-training</p>
```

---

## GOOGLE SHEETS SETUP

### Sheet Naming Convention
```
ASA_Responses       = Main response data
ASA_Sessions        = Session metadata
ASA_Reports         = Archived reports (optional)
ASA_Analysis        = Analytics & pivots (optional)
```

### Data Retention Policy
Recommendation:
- Keep responses indefinitely in Google Sheets
- Archive to CSV quarterly
- Review GDPR/privacy compliance
- Annual data cleanup per policy

### Sharing & Permissions
- **View Only:** Instructors, managers
- **Edit:** Admin, data analyst
- **Owner:** Primary administrator

---

## MONITORING & MAINTENANCE

### Weekly Checks
- [ ] Review new responses
- [ ] Check for bounced emails
- [ ] Monitor admin dashboard usage
- [ ] Verify no errors in logs

### Monthly Tasks
- [ ] Export data to CSV
- [ ] Review competency trends
- [ ] Update documentation
- [ ] Plan next survey cohort

### Quarterly Review
- [ ] Analyze competency distribution
- [ ] Update recommendations if needed
- [ ] Review email templates
- [ ] Plan enhancements

---

## TROUBLESHOOTING QUICK REFERENCE

| Problem | Solution |
|---------|----------|
| QR won't scan | Increase size, use backup link |
| Email not sent | Check Gmail limits, verify email address |
| No sheet data | Verify Apps Script URL in React code |
| Reports delayed | Check time-based trigger setup |
| Admin login fails | Verify correct admin key |

See `ASA_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.

---

## SECURITY NOTES

### Production Recommendations
- [ ] Use service account for email (instead of personal Gmail)
- [ ] Enable 2FA on Google Account
- [ ] Rotate admin keys quarterly
- [ ] Audit access logs monthly
- [ ] Encrypt sensitive data fields

### Privacy Compliance
- [ ] Review GDPR if EU participants
- [ ] Add privacy notice to registration form
- [ ] Maintain data retention policy
- [ ] Allow data deletion requests
- [ ] Document consent (if required)

---

## PERFORMANCE OPTIMIZATION

### For Large Cohorts (100+ participants)
- Increase Apps Script timeout: `advancedParameters: { maxRuntime: 30 }`
- Enable Sheets batch operations for faster writes
- Use caching for repeated calculations
- Consider migrating to Cloud Firestore for real-time sync

### For Email Delays
- Use Gmail API instead of GmailApp
- Implement exponential backoff for retries
- Queue reports in Cloud Tasks
- Monitor quota limits

---

## FUTURE ENHANCEMENTS

Priority features to consider:
1. [ ] SMS notifications
2. [ ] PDF report export
3. [ ] Integration with learning platforms (Canvas, Moodle)
4. [ ] Team/firm comparison dashboards
5. [ ] Automated certificate generation
6. [ ] Mobile app (native iOS/Android)
7. [ ] Multi-language support
8. [ ] Advanced analytics & ML-based recommendations

---

## DEPLOYMENT SUMMARY TEMPLATE

After deployment, fill in this for your records:

```
Organization: ______________________
Deployment Date: __________________
React App URL: ____________________
Google Apps Script URL: ____________
Admin Email: _______________________
Support Contact: ___________________

First Session Date: ________________
Cohort Size: _______________________
Session Code: ______________________
QR Code Filename: __________________

Status: [ ] Testing [ ] Live [ ] Paused [ ] Archived
Notes: ______________________________
```

---

## NEXT STEPS

1. Fill in configuration above
2. Follow `ASA_DEPLOYMENT_GUIDE.md`
3. Test with small group first
4. Gather feedback
5. Scale to larger cohorts
6. Measure impact & iterate

---

**Configuration Last Updated:** 2026  
**Status:** Ready for Deployment ✅
