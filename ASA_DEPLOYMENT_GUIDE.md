# AISurveyApp (ASA) - Complete Deployment Guide

## Overview
AISurveyApp is an autonomous AI literacy assessment platform for architects. Participants scan a QR code, answer 10 MCQs, and receive automated competency reports within 15 minutes.

---

## PART 1: DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    PARTICIPANT FLOW                         │
├─────────────────────────────────────────────────────────────┤
│  1. Scan QR Code → Web App                                  │
│  2. Register (Group, Email, Firm Size)                      │
│  3. Answer 10 MCQs                                          │
│  4. Submit → Google Sheets                                  │
│  5. Auto-trigger Reports (15 mins)                          │
│  6. Email Part 1 (Group Summary) + Part 2 (Individual)      │
│  7. Logged to Google Sheets for future reference            │
└─────────────────────────────────────────────────────────────┘
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

### Step 3: Set Up Time-based Trigger (for automated email sending)

1. In Apps Script, go to **Triggers** (left sidebar, clock icon)
2. Click **Create new trigger**
3. Configure:
   - Function: `processReportQueue`
   - Deployment: Head
   - Event source: Time-driven
   - Type: Minutes timer
   - Interval: Every 5 minutes
4. Click **Save**

This ensures emails are sent every 5 minutes to anyone waiting in the queue.

### Step 4: Test Google Apps Script

1. In Apps Script, go to **Run** → Select `testEmailReport`
2. First time: Grant permissions (click "Review permissions" and approve)
3. Check Gmail inbox for test email
4. If successful, you're ready to integrate with React app

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

### After the Session (Auto 15 mins)
- Part 1 (Group Summary): Emailed to all participants
  - Cohort size, average score, tier distribution
  - Key insights about the group
  
- Part 2 (Individual Report): Emailed to each participant
  - Personal score & competency level
  - Personalized recommendations
  - Next steps for learning

- Responses logged to Google Sheets with all metadata

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

### Issue: Automated emails not arriving after 15 mins
- **Solution:** Verify time-based trigger is set up correctly, check spam folder

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
- [ ] Time-based trigger set (processReportQueue every 5 mins)
- [ ] Test email sent successfully
- [ ] React app deployed to Vercel
- [ ] Google Apps Script URL updated in React app
- [ ] QR code generated and tested
- [ ] QR code prints clearly and scans correctly
- [ ] Admin key copied and secured
- [ ] First survey session run successfully
- [ ] Emails sent and received correctly
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
