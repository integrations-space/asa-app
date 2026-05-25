# AISurveyApp (ASA) - Quick Reference Card

**Print this for quick access during deployment & sessions**

---

## 🚀 DEPLOYMENT QUICK STEPS (Copy-Paste)

### Step 1: Create Google Sheet
Visit: https://drive.google.com
- Create new spreadsheet
- Name: "ASA_Responses"
- Share with admins

### Step 2: Deploy Google Apps Script
1. Open Google Sheet → **Extensions** → **Apps Script**
2. Delete default code
3. Paste entire content from: `ASA_GoogleAppsScript.gs`
4. Click **Deploy** → **New Deployment** → **Web app**
5. **COPY THIS URL** (you'll need it next):
```
https://script.google.com/macros/d/[ID]/usercontent
```

### Step 3: Deploy React App
```bash
npm install -g vercel
vercel
# Follow prompts, copy your URL
# Example: https://asa-app.vercel.app
```

### Step 4: Connect Them
Find `submitSurvey()` in React code, add:
```javascript
await fetch('YOUR_GOOGLE_APPS_SCRIPT_URL', {...})
```

### Step 5: Generate QR Code
```bash
python qr_generator.py https://asa-app.vercel.app
# Print the generated PNG
```

### Step 6: Test & Go Live
- Scan QR with phone
- Complete survey
- Check email (wait 15 mins)
- Verify Google Sheets has data

---

## 📱 PARTICIPANT JOURNEY

```
Scan QR
    ↓
Register (Email, Firm Size)
    ↓
Answer 10 Questions (8 mins)
    ↓
Submit & See Score
    ↓
Wait 15 Minutes
    ↓
Receive Email Report
  Part 1: Group Summary
  Part 2: Personal Recommendations
    ↓
Data Logged to Google Sheets
```

---

## 📊 COMPETENCY TIERS

| Score | Tier | Action |
|-------|------|--------|
| 0–3 | Foundational | Start learning |
| 4–6 | Applied | Apply in practice |
| 7–9 | Strategy | Lead adoption |
| 10 | Peer-led | Mentor others |

---

## 🔧 KEY ENDPOINTS

| Component | Purpose | URL/Location |
|-----------|---------|--------------|
| React App | Survey UI | https://asa-app.vercel.app |
| Google Apps Script | Backend | https://script.google.com/.../usercontent |
| Google Sheet | Data | https://sheets.google.com/... |
| QR Code | Mobile access | Print/scan/display |

---

## ⏱️ AUTOMATION TIMELINE

| Time | Action |
|------|--------|
| 0 mins | User submits survey |
| Immediate | Response saved to Sheets |
| 15 mins | Reports generated |
| 20 mins | Emails sent to participants |
| +5 mins buffer | All reports delivered |

---

## 🎯 RUNNING A SESSION

### Before Session
```
□ Print/display QR codes
□ Test QR scanning
□ Share backup link
□ Set time reminder (15 mins post-survey)
```

### During Session
```
□ Participants scan QR
□ Complete survey (~8-10 mins each)
□ Monitor admin dashboard
□ Note any issues
```

### After Session
```
□ Wait 15 minutes
□ Check participant emails
□ Review Google Sheets data
□ View admin dashboard statistics
```

---

## 🚨 COMMON ISSUES & FIXES

| Issue | Fix |
|-------|-----|
| QR won't scan | Increase size, ensure contrast |
| Email not arriving | Check spam, verify Gmail limits |
| Survey data missing | Verify Apps Script URL in code |
| Delayed reports | Check time-based trigger active |
| Admin login fails | Verify admin key correct |

---

## 📂 FILES CHECKLIST

```
✓ ASA_Complete.jsx              React frontend
✓ ASA_GoogleAppsScript.gs       Backend & automation
✓ qr_generator.py               QR code generator
✓ README.md                     Full documentation
✓ ASA_DEPLOYMENT_GUIDE.md       Detailed instructions
✓ ASA_CONFIG_TEMPLATE.md        Configuration settings
✓ QUICK_REFERENCE.md            This card
```

---

## 🔐 ADMIN DASHBOARD ACCESS

After survey submission, click **"View Session Dashboard"**

Enter: **Admin Key** (auto-generated, displayed at session start)

View:
- Total responses
- Average score
- Score distribution
- Individual participant data

---

## 📧 EMAIL REPORT PARTS

### Part 1: Group Summary
- Cohort size
- Average score
- Tier distribution (% in each level)
- Key insights about group

### Part 2: Individual Report
- Personal score & tier
- What tier means
- Personalized recommendations
- Next steps for learning

---

## 🎓 PRE/POST SURVEY WORKFLOW

```
Week 1: Pre-Survey
    ↓
Weeks 2-4: AI Training/Course
    ↓
Week 5: Post-Survey (same participants)
    ↓
Compare: Score improvement, tier progression
    ↓
Report: "Team improved from 4.2 avg → 7.1 avg"
```

---

## 💾 DATA EXPORT & ANALYSIS

Export from Google Sheets:
- File → Download → CSV or Excel
- Use for: Pivot tables, charts, reports
- Share with: Managers, leadership, participants

---

## 📞 QUICK TROUBLESHOOTING

**Q: How long does email take?**
A: ~20 minutes (15 min wait + 5 min send)

**Q: Can same person retake?**
A: Yes, but use Pre/Post tags to distinguish

**Q: How many people simultaneously?**
A: Unlimited (Google handles scale)

**Q: Can I change questions?**
A: Yes, redeploy both apps after editing

**Q: Where's my data?**
A: Google Sheets, tagged by session ID

---

## 🔑 IMPORTANT CODES & LINKS

```
Session ID Format:     ASA-[TIMESTAMP]-[RANDOM]
Admin Key Format:      8 random alphanumeric
QR Code Format:        PNG, high resolution
Email Format:          HTML with links
```

---

## 🎬 FIRST SESSION CHECKLIST

- [ ] Google Sheet created & shared
- [ ] Apps Script deployed & tested
- [ ] React app deployed to Vercel
- [ ] Google Apps Script URL in React code
- [ ] QR code generated & printed
- [ ] QR code scans successfully
- [ ] Test survey completed
- [ ] Test email received (wait 20 mins)
- [ ] Google Sheets has test data
- [ ] Admin dashboard loads correctly
- [ ] All systems go → LAUNCH! 🚀

---

## 📈 SUCCESS METRICS

Track these over time:
- Total participants surveyed
- Average competency score
- % in each tier
- Pre/Post improvement %
- Email delivery success rate
- Session admin dashboard usage

---

## 🎯 NEXT STEPS

1. **Week 1:** Deploy & test with 5 people
2. **Week 2:** Run with 1 class/cohort
3. **Week 3:** Gather feedback, refine
4. **Week 4:** Scale to multiple sessions
5. **Month 2:** Analyze trends, optimize

---

## 📖 FULL DOCUMENTATION

For detailed help, see:
- **Setup:** `ASA_DEPLOYMENT_GUIDE.md`
- **Overview:** `README.md`
- **Config:** `ASA_CONFIG_TEMPLATE.md`

---

## 🆘 SUPPORT CONTACTS

Setup issues?
→ See `ASA_DEPLOYMENT_GUIDE.md` (Part 6: Troubleshooting)

Code questions?
→ Check comments in `.gs` and `.jsx` files

Feature requests?
→ See `README.md` (Advanced Features section)

---

**Print & Laminate This Card!** 💳

---

**AISurveyApp v1.0 | 2026 | Ready for Deployment ✅**
