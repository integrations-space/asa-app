// Google Apps Script for AISurveyApp (ASA)
// Deploy as a web app to handle form submissions and automated reporting

const SHEET_NAME = 'ASA_Responses';
const ADMIN_SHEET = 'ASA_Sessions';

// Max possible score = number of scored questions in survey.config.js (q1–q9).
// Q10 is unscored self-assessment, so max is 9.
const MAX_SCORE = 9;

// Detect which AI provider to use, based on which Script Property is set.
// Set ONE of these in Project Settings → Script Properties:
//   GROQ_API_KEY     — free forever, ~14,400/day, Llama 3.3 70B (default)
//   GEMINI_API_KEY   — free forever, 1,500/day, Google Gemini 1.5 Flash
//   MISTRAL_API_KEY  — free forever, 1B tokens/month, Mistral Small
//   DEEPSEEK_API_KEY — $10 trial credit (~37k reports) then paid; China-hosted
// Priority: Groq → Gemini → Mistral → DeepSeek. Returns null if none set;
// the email pipeline then falls back to canned (hardcoded) report text.
function detectAIProvider() {
  const props = PropertiesService.getScriptProperties();
  const groqKey = props.getProperty('GROQ_API_KEY');
  if (groqKey) {
    return {
      name: 'Groq (Llama 3.3 70B)',
      call: function (prompt) {
        return callOpenAICompatible(
          groqKey,
          'https://api.groq.com/openai/v1/chat/completions',
          'llama-3.3-70b-versatile',
          prompt
        );
      },
    };
  }
  const geminiKey = props.getProperty('GEMINI_API_KEY');
  if (geminiKey) {
    return {
      name: 'Gemini 1.5 Flash',
      call: function (prompt) { return callGemini(geminiKey, prompt); },
    };
  }
  const mistralKey = props.getProperty('MISTRAL_API_KEY');
  if (mistralKey) {
    return {
      name: 'Mistral Small',
      call: function (prompt) {
        return callOpenAICompatible(
          mistralKey,
          'https://api.mistral.ai/v1/chat/completions',
          'mistral-small-latest',
          prompt
        );
      },
    };
  }
  const deepseekKey = props.getProperty('DEEPSEEK_API_KEY');
  if (deepseekKey) {
    return {
      name: 'DeepSeek V3',
      call: function (prompt) {
        return callOpenAICompatible(
          deepseekKey,
          'https://api.deepseek.com/v1/chat/completions',
          'deepseek-chat',
          prompt
        );
      },
    };
  }
  return null;
}

// Competency tier mapping — must stay in sync with React `tiers` in
// asa-app/src/config/survey.config.js. With 9 scored questions the max
// possible score is 9, so the top tier starts at 9 (not 10).
const COMPETENCY_TIERS = {
  0: { name: 'Foundational Awareness', range: '0–3', emoji: '📚' },
  1: { name: 'Applied Practitioner',   range: '4–6', emoji: '⚙️' },
  2: { name: 'Strategic & Critical',   range: '7–8', emoji: '🎯' },
  3: { name: 'AI Champion',            range: '9+',  emoji: '🏆' },
};

// Question bank
const QUESTIONS = [
  { id: 'q1', category: 'Foundational', correct: 1 },
  { id: 'q2', category: 'Foundational', correct: 1 },
  { id: 'q3', category: 'Applied', correct: 2 },
  { id: 'q4', category: 'Applied', correct: 1 },
  { id: 'q5', category: 'Critical', correct: 1 },
  { id: 'q6', category: 'Ethics/Legal', correct: 3 },
  { id: 'q7', category: 'Foundational', correct: 2 },
  { id: 'q8', category: 'Critical', correct: 1 },
  { id: 'q9', category: 'Applied', correct: 1 },
  { id: 'q10', category: 'Self-assessment', correct: -1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Session admin keys — backed by the ASA_Sessions sheet
//
// Facilitator workflow (run BEFORE each cohort):
//   1. Open this script in the Apps Script editor
//   2. Add a one-line wrapper at the bottom, e.g.
//        function mintMorning01() { createSession('ASA-MORNING-01', 'me@firm.com'); }
//   3. Select that wrapper from the function dropdown → Run
//   4. Retrieve the key from any of:
//        • the email inbox (if adminEmail passed)
//        • Executions → View logs
//        • the ASA_Sessions sheet
//
// The key is required for the in-app "Session Administrator" dashboard.
// Survey submissions still work for any sessionId regardless of pre-creation —
// pre-creating only unlocks the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
function createSession(sessionId, adminEmail) {
  if (!sessionId) throw new Error('sessionId is required, e.g. createSession("ASA-MORNING-01")');

  const sheet = ensureAdminSheet_();
  const existing = findSessionRow_(sheet, sessionId);
  if (existing) {
    Logger.log('Session "' + sessionId + '" already exists — admin key: ' + existing.adminKey);
    return existing.adminKey;
  }

  const adminKey = generateAdminKey_();
  const createdAt = new Date().toISOString();
  sheet.appendRow([sessionId, adminKey, createdAt, adminEmail || '']);

  Logger.log('Session created.');
  Logger.log('  Session ID: ' + sessionId);
  Logger.log('  Admin Key:  ' + adminKey);
  Logger.log('  Created At: ' + createdAt);

  if (adminEmail) {
    try {
      GmailApp.sendEmail(
        adminEmail,
        'ASA Admin Key — ' + sessionId,
        'Session ID: ' + sessionId + '\n' +
          'Admin Key:  ' + adminKey + '\n\n' +
          'Use this key on the survey "Session Administrator" form to view the live cohort dashboard.\n' +
          'Keep it private — anyone with the key can see participant responses for this session.'
      );
      Logger.log('  Emailed to: ' + adminEmail);
    } catch (e) {
      Logger.log('  WARNING: could not email key (' + e + ')');
    }
  }
  return adminKey;
}

// Create the ASA_Sessions sheet with headers on first use.
// If the sheet was pre-created manually (without headers), auto-heal it by
// inserting the expected header row above the existing data. Without this,
// findSessionRow_ skips row 1 (treats it as headers) and validation fails.
const ADMIN_HEADERS = ['Session ID', 'Admin Key', 'Created At', 'Admin Email'];
function ensureAdminSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ADMIN_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ADMIN_SHEET);
    sheet.appendRow(ADMIN_HEADERS);
    return sheet;
  }
  ensureHeaderRow_(sheet, ADMIN_HEADERS);
  return sheet;
}

// If row 1 doesn't match the expected header (first cell check), insert a
// header row above existing data so the rest of the code's i=1 iteration
// works correctly. Idempotent — won't double-insert if headers already present.
function ensureHeaderRow_(sheet, expectedHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(expectedHeaders);
    return;
  }
  const firstCell = sheet.getRange(1, 1).getValue();
  if (firstCell === expectedHeaders[0]) return; // headers already correct
  sheet.insertRowBefore(1);
  sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
}

function findSessionRow_(sheet, sessionId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      return { row: i + 1, adminKey: data[i][1], createdAt: data[i][2], adminEmail: data[i][3] };
    }
  }
  return null;
}

function generateAdminKey_() {
  // 8-char uppercase alphanumeric. Sufficient for low-stakes cohort access
  // (~2.8 trillion combos); not a banking-grade secret.
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function verifyAdminKey_(sessionId, adminKey) {
  if (!sessionId || !adminKey) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ADMIN_SHEET);
  if (!sheet) return false;
  const found = findSessionRow_(sheet, sessionId);
  return !!(found && found.adminKey === adminKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET endpoint — serves the in-app admin dashboard.
//   ?action=getSessionData&sessionId=X&adminKey=Y → { success, responses, stats }
// Apps Script web apps deployed as "Anyone" attach Access-Control-Allow-Origin
// on GETs, so the React app can fetch + read JSON cross-origin without preflight.
// ─────────────────────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (action === 'getSessionData') return handleGetSessionData_(e.parameter);
    return jsonResponse_({ success: false, message: 'Unknown action' });
  } catch (err) {
    Logger.log('doGet error: ' + err);
    return jsonResponse_({ success: false, message: err.toString() });
  }
}

function handleGetSessionData_(params) {
  const sessionId = params.sessionId;
  const adminKey = params.adminKey;

  if (!verifyAdminKey_(sessionId, adminKey)) {
    return jsonResponse_({ success: false, message: 'Invalid session ID or admin key' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return jsonResponse_({
      success: true, sessionId: sessionId, responses: [], stats: emptyStats_(),
    });
  }

  const data = sheet.getDataRange().getValues();
  const responses = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] !== sessionId) continue;
    let answersObj = {};
    try { answersObj = JSON.parse(row[8] || '{}'); } catch (_e) { /* malformed JSON, skip */ }
    responses.push({
      timestamp: row[0],
      sessionName: row[2],
      email: row[3],
      mobile: row[4],
      firmSize: row[5],
      score: row[6],
      competencyLevel: row[7],
      answers: answersObj,
      reportSent: row[9],
      reportTimestamp: row[10],
    });
  }

  return jsonResponse_({
    success: true,
    sessionId: sessionId,
    maxScore: MAX_SCORE,
    responses: responses,
    stats: computeStats_(responses),
  });
}

function computeStats_(responses) {
  if (!responses.length) return emptyStats_();
  const scores = responses
    .map((r) => Number(r.score))
    .filter((s) => !isNaN(s));
  const tiers = {};
  responses.forEach((r) => {
    const tier = r.competencyLevel || 'Unknown';
    tiers[tier] = (tiers[tier] || 0) + 1;
  });
  return {
    totalResponses: responses.length,
    averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    tiers: tiers,
  };
}

function emptyStats_() {
  return { totalResponses: 0, averageScore: 0, maxScore: 0, minScore: 0, tiers: {} };
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Main function: Handle form submission from web app
function doPost(e) {
  try {
    // Browser sends Content-Type: text/plain (no-cors mode) to avoid CORS
    // preflight. The body is still JSON — parse from postData.contents.
    const raw = e.postData.contents;
    const data = JSON.parse(raw);
    
    // Validate incoming data. The React app's registration field is called
    // `groupName` (see survey.config.js), so accept that — fall back to
    // `sessionName` for backwards-compat with any legacy clients.
    const groupName = data.groupName || data.sessionName;
    if (!data.email || !groupName) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: 'Missing required fields' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Calculate score
    const score = calculateScore(data.answers);
    const tier = getCompetencyTier(score);

    // Add to spreadsheet
    const row = [
      new Date().toISOString(),
      data.sessionId,
      groupName,
      data.email,
      data.mobile || '',
      data.firmSize,
      score,
      COMPETENCY_TIERS[tier].name,
      JSON.stringify(data.answers),
      false, // Report sent
      '', // Report timestamp
    ];

    appendToSheet(SHEET_NAME, row);

    // Schedule email report (runs after 15 minutes)
    scheduleEmailReport(data, score, tier);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Response recorded successfully',
        score: score,
        tier: COMPETENCY_TIERS[tier].name,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost: ' + error);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Calculate score from answers
function calculateScore(answers) {
  let score = 0;
  QUESTIONS.forEach((q) => {
    if (q.correct !== -1 && answers[q.id] === q.correct) {
      score += 1;
    }
  });
  return score;
}

// Get competency tier — breakpoints match React `tiers` in survey.config.js
function getCompetencyTier(score) {
  if (score >= 9) return 3;
  if (score >= 7) return 2;
  if (score >= 4) return 1;
  return 0;
}

// Append row to sheet. Auto-heals missing header row (same pattern as
// ensureAdminSheet_) so a pre-existing sheet without headers still works.
const RESPONSE_HEADERS = [
  'Timestamp',
  'Session ID',
  'Session Name',
  'Email',
  'Mobile',
  'Firm Size',
  'Score',
  'Competency Level',
  'Answers (JSON)',
  'Report Sent',
  'Report Timestamp',
];
function appendToSheet(sheetName, row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(RESPONSE_HEADERS);
  } else if (sheetName === SHEET_NAME) {
    ensureHeaderRow_(sheet, RESPONSE_HEADERS);
  }
  sheet.appendRow(row);
}

// Send the email report immediately. The old PropertiesService queue +
// time-based trigger pattern was removed — the trigger was never set up in
// practice, so reports silently never went out. Each respondent now gets
// their report within seconds. Group stats accumulate naturally: the first
// person in a cohort sees a thin "group report" (themselves), each
// subsequent person sees more.
function scheduleEmailReport(data, score, tier) {
  try {
    sendEmailReport(data, score, tier);
  } catch (err) {
    Logger.log('sendEmailReport failed: ' + err);
  }
}

// Send email report (Part 1: Group Summary, Part 2: Individual).
// Tries an AI provider first for personalised, narrative reports;
// falls back to the canned templates below if no API key is set or the
// call fails — the participant always gets *something*.
function sendEmailReport(data, score, tier) {
  const tier_info = COMPETENCY_TIERS[tier];
  const groupStats = getGroupStatistics(data.sessionId);

  let part1Html;
  let part2Html;

  const aiResult = tryGenerateAIReport(data, score, tier_info, groupStats);
  if (aiResult) {
    // AI mode: wrap the model's prose in branded HTML.
    part1Html = `<h2>Part 1 — Group Report</h2><div>${aiResult.part1.replace(/\n/g, '<br>')}</div>`;
    part2Html = `<h2>Part 2 — Your Individual Report</h2><div>${aiResult.part2.replace(/\n/g, '<br>')}</div>`;
  } else {
    // Fallback mode: the canned generators (kept for offline/no-key safety).
    part1Html = generateGroupSummaryReport(data, groupStats);
    part2Html = generateIndividualReport(data, score, tier_info);
  }

  const fullEmail = buildEmailBody(data, part1Html, part2Html);

  GmailApp.sendEmail(
    data.email,
    `Your SIA AI Literacy Report — ${data.groupName || data.sessionName || 'SIA'}`,
    'Your personalised AI competency report is attached. Please view this email in an HTML-capable client.',
    { htmlBody: fullEmail, name: 'SIA AI Literacy Survey' }
  );

  markReportAsSent(data.email);
}

// Try the AI provider. Returns { part1, part2 } on success, null on any failure
// (no key configured, network error, malformed response). Caller falls back
// to canned text whenever this returns null.
function tryGenerateAIReport(data, score, tier_info, groupStats) {
  const provider = detectAIProvider();
  if (!provider) return null;

  try {
    const prompt = buildAIPrompt(data, score, tier_info, groupStats);
    const aiText = provider.call(prompt);

    const p1 = aiText.match(/\[PART 1[^\]]*\]([\s\S]*?)\[PART 2/i);
    const p2 = aiText.match(/\[PART 2[^\]]*\]([\s\S]*)/i);
    if (!p1 || !p2) {
      Logger.log(provider.name + ' response missing PART markers; falling back to canned text.');
      return null;
    }
    Logger.log('AI report generated via ' + provider.name);
    return { part1: p1[1].trim(), part2: p2[1].trim() };
  } catch (err) {
    Logger.log(provider.name + ' AI call failed (' + err + '); falling back to canned text.');
    return null;
  }
}

// Builds the structured prompt per AI_Survey_Workflow_Framework Section 5.
function buildAIPrompt(data, score, tier_info, groupStats) {
  const tierDist = Object.entries(groupStats.tiers)
    .map(([t, c]) => `${COMPETENCY_TIERS[t] ? COMPETENCY_TIERS[t].name : t}: ${c}`)
    .join(', ');

  const qLabels = [
    'Q1 Generative AI', 'Q2 AI in BIM', 'Q3 Prompt engineering',
    'Q4 Generative design', 'Q5 Hallucination', 'Q6 Ethics & legal',
    'Q7 How LLMs work', 'Q8 Spec-writing risk', 'Q9 Image-gen limits',
  ];
  const answerKey = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'];
  const qDetail = answerKey
    .map((qid, i) => {
      const got = data.answers && data.answers[qid];
      const correct = QUESTIONS.find((q) => q.id === qid).correct;
      const mark = got === correct ? '✓ correct' : `✗ chose option ${got}, correct was ${correct}`;
      return `${qLabels[i]}: ${mark}`;
    })
    .join('\n');

  return `You are an expert AI literacy evaluator for architects in Singapore. Write a constructive, encouraging report for one survey respondent.

=== GROUP DATA ===
Group: ${data.groupName || data.sessionName || 'SIA Cohort'}
Group size so far: ${groupStats.totalResponses}
Group average score: ${groupStats.averageScore.toFixed(1)} / ${MAX_SCORE}
Tier distribution: ${tierDist}

=== PARTICIPANT DATA ===
Name: ${data.fullName || data.email}
Firm: ${data.firmName || 'not provided'}
Years in practice: ${data.yearsInPractice || 'not provided'}
Survey type: ${data.surveyType || 'standalone'}
Total score: ${score} / ${MAX_SCORE}
Competency tier: ${tier_info.name}
Q10 frequency-of-use self-assessment (option index): ${data.answers && data.answers.q10}
Q11 most-wanted improvement area: ${(data.answers && data.answers.q11) || 'not provided'}
Q12 perceived usefulness today (1–5 scale): ${(data.answers && data.answers.q12) || 'not provided'}

Question-by-question results:
${qDetail}

=== INSTRUCTIONS ===
Write two clearly-separated sections, each starting with the exact bracketed marker:

[PART 1 - GROUP REPORT]
- Address the whole group by name (${data.groupName || 'the cohort'}).
- State the average score and overall competency tier.
- Describe the tier distribution.
- Highlight 2 areas the group collectively did well, 2 areas to improve.
- End with one encouraging sentence about the group's learning journey.
- 150–200 words. Professional, warm, constructive tone.

[PART 2 - INDIVIDUAL REPORT]
- Address ${data.fullName || 'the participant'} personally.
- Acknowledge their score (${score}/${MAX_SCORE}) and tier (${tier_info.name}).
- Highlight 2–3 specific questions they answered correctly — explain why those concepts matter.
- For any incorrect answers, gently explain the correct concept (no shaming).
- Recommend 1–2 concrete next steps tailored to their tier and years in practice.
- Reference their Q10 self-assessment naturally if it adds insight.
- End with a motivating closing sentence.
- 200–250 words. Encouraging, specific, professional tone.`;
}

// Used by both OpenAI and Groq — both speak the same /v1/chat/completions
// shape. Pass the URL and model name; everything else is identical.
function callOpenAICompatible(apiKey, url, model, prompt) {
  const payload = {
    model: model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 900,
  };
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('HTTP ' + code + ': ' + res.getContentText().slice(0, 200));
  }
  const json = JSON.parse(res.getContentText());
  return json.choices[0].message.content;
}

// Gemini uses a different request shape and authenticates via query string.
function callGemini(apiKey, prompt) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' +
    encodeURIComponent(apiKey);
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
  };
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('HTTP ' + code + ': ' + res.getContentText().slice(0, 200));
  }
  const json = JSON.parse(res.getContentText());
  return json.candidates[0].content.parts[0].text;
}

// Wraps two HTML sections in a branded email shell. Used for both AI and
// canned outputs so the participant experience is identical either way.
function buildEmailBody(data, part1Html, part2Html) {
  const name = data.fullName || (data.email || '').split('@')[0];
  return `<html><body style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#2C2C2A;">
    <div style="background:#E04E1B;padding:24px;text-align:center;color:#fff;">
      <h2 style="margin:0;">SIA AI Literacy Assessment</h2>
      <p style="color:#FDEEE6;margin:4px 0 0;">Your Personalised Competency Report</p>
    </div>
    <div style="padding:28px;">
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you for completing the survey. Below is your group report followed by your individual assessment.</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
      <div style="background:#FFF8F3;padding:16px;border-radius:8px;line-height:1.7;">${part1Html}</div>
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
      <div style="background:#F9F9F9;padding:16px;border-radius:8px;line-height:1.7;">${part2Html}</div>
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
      <p style="font-size:12px;color:#888;">This report was generated for the SIA AI Literacy initiative. For queries, contact your training coordinator.</p>
    </div>
  </body></html>`;
}

// Generate group summary for Part 1
function generateGroupSummaryReport(data, groupStats) {
  return `
<h2>Part 1: Your Cohort's AI Literacy Overview</h2>
<p>Session: <strong>${data.groupName || data.sessionName}</strong></p>

<h3>Group Statistics</h3>
<ul>
  <li><strong>Total Participants:</strong> ${groupStats.totalResponses}</li>
  <li><strong>Average Score:</strong> ${groupStats.averageScore.toFixed(1)}/10</li>
  <li><strong>Highest Score:</strong> ${groupStats.maxScore}/10</li>
  <li><strong>Lowest Score:</strong> ${groupStats.minScore}/10</li>
</ul>

<h3>Competency Breakdown</h3>
${generateCompetencyBreakdown(groupStats.tiers)}

<h3>Key Insights</h3>
${generateGroupInsights(groupStats)}
`;
}

// Generate individual report for Part 2
function generateIndividualReport(data, score, tier_info) {
  return `
<h2>Part 2: Your Personal AI Competency Report</h2>

<h3>Your Results</h3>
<p><strong>Score:</strong> ${score}/10</p>
<p><strong>Competency Level:</strong> ${tier_info.emoji} ${tier_info.name}</p>

<h3>What This Means</h3>
${getCompetencyDescription(score)}

<h3>Recommendations to Level Up</h3>
${getRecommendations(score)}

<h3>Next Steps</h3>
<p>Your AI literacy journey has just begun! Continue exploring these tools and consider:</p>
<ul>
  <li>Experimenting with prompt engineering on real project scenarios</li>
  <li>Evaluating AI outputs critically before using them professionally</li>
  <li>Staying informed about emerging AI tools in architecture</li>
  <li>Sharing your learnings with colleagues</li>
</ul>

<p><strong>Keep learning! 🚀</strong></p>
`;
}

// Get group statistics
function getGroupStatistics(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const sessionResponses = data
    .slice(1)
    .filter((row) => row[1] === sessionId);

  const scores = sessionResponses.map((row) => row[6]);

  const tiers = { 0: 0, 1: 0, 2: 0, 3: 0 };
  sessionResponses.forEach((row) => {
    const competencyLevel = row[7];
    const tier = Object.values(COMPETENCY_TIERS).findIndex(
      (t) => t.name === competencyLevel
    );
    tiers[tier]++;
  });

  return {
    totalResponses: sessionResponses.length,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores),
    tiers: tiers,
  };
}

// Generate competency breakdown HTML
function generateCompetencyBreakdown(tiers) {
  let html = '<ul>';
  Object.entries(tiers).forEach(([key, count]) => {
    const tier = COMPETENCY_TIERS[parseInt(key)];
    html += `<li>${tier.emoji} ${tier.name}: ${count} participant(s)</li>`;
  });
  html += '</ul>';
  return html;
}

// Generate group insights
function generateGroupInsights(stats) {
  let insights = '<ul>';

  if (stats.averageScore < 4) {
    insights +=
      '<li>Your cohort is just beginning their AI literacy journey. Consider structured training.</li>';
  } else if (stats.averageScore < 7) {
    insights +=
      '<li>Strong foundational knowledge across the group. Focus on applied skills and real-world integration.</li>';
  } else {
    insights +=
      '<li>Your cohort shows advanced AI understanding. Excellent positioning for advanced applications!</li>';
  }

  insights += '</ul>';
  return insights;
}

// Get description for competency level
function getCompetencyDescription(score) {
  if (score <= 3) {
    return `
      <p>You are at the <strong>Foundational Awareness</strong> stage. You have basic understanding of what AI is and where it's used in architecture, but haven't yet integrated AI tools into your practice. This is a great starting point!</p>
    `;
  } else if (score <= 6) {
    return `
      <p>You are at the <strong>Applied Practitioner</strong> stage. You understand how to use AI tools effectively and can apply prompt engineering to get better results. You're actively exploring AI in your architectural workflow.</p>
    `;
  } else if (score <= 8) {
    return `
      <p>You are at the <strong>Strategic & Critical</strong> stage. You understand both the capabilities and limitations of AI, plus the ethical and legal implications. You can make informed decisions about when and how to use AI responsibly.</p>
    `;
  } else {
    return `
      <p>You are at the <strong>AI Champion</strong> stage. You are a leader in AI adoption and understanding. Consider mentoring colleagues and sharing your expertise with your team!</p>
    `;
  }
}

// Get personalized recommendations
function getRecommendations(score) {
  if (score <= 3) {
    return `
      <ul>
        <li>Take time to experiment with ChatGPT or Claude for simple architectural tasks</li>
        <li>Watch tutorials on prompt engineering basics</li>
        <li>Explore how BIM tools already embed AI for clash detection</li>
        <li>Join online communities discussing AI in architecture</li>
      </ul>
    `;
  } else if (score <= 6) {
    return `
      <ul>
        <li>Practice advanced prompt engineering techniques on complex design scenarios</li>
        <li>Experiment with AI image generation tools (DALL-E, Midjourney) for concept sketches</li>
        <li>Evaluate AI-generated content critically before using in client deliverables</li>
        <li>Explore generative design and parametric AI tools</li>
      </ul>
    `;
  } else if (score <= 8) {
    return `
      <ul>
        <li>Develop your firm's AI governance and ethical guidelines</li>
        <li>Lead conversations about AI limitations and hallucinations in your team</li>
        <li>Mentor junior colleagues on responsible AI use</li>
        <li>Stay updated on emerging AI regulations affecting architecture</li>
      </ul>
    `;
  } else {
    return `
      <ul>
        <li>Share your expertise through speaking engagements or workshops</li>
        <li>Contribute to industry discussions on AI best practices in architecture</li>
        <li>Explore cutting-edge AI applications in your architectural niche</li>
        <li>Consider mentoring other practices in AI adoption</li>
      </ul>
    `;
  }
}

// Mark report as sent
function markReportAsSent(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === email) {
      sheet.getRange(i + 1, 10).setValue(true); // Mark as sent
      sheet.getRange(i + 1, 11).setValue(new Date().toISOString()); // Timestamp
    }
  }
}

// Trigger function (run this as a time-based trigger every 5 minutes)
function processReportQueue() {
  const props = PropertiesService.getScriptProperties();
  const reportQueue = JSON.parse(props.getProperty('reportQueue') || '[]');

  const now = new Date();
  const stillPending = [];

  reportQueue.forEach((item) => {
    const scheduledTime = new Date(item.scheduledTime);
    if (scheduledTime <= now) {
      sendEmailReport(item.respondent, item.score, item.tier);
    } else {
      stillPending.push(item);
    }
  });

  props.setProperty('reportQueue', JSON.stringify(stillPending));
}

// Helper: Initialize sheet with headers
function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const headers = [
    'Timestamp',
    'Session ID',
    'Session Name',
    'Email',
    'Mobile',
    'Firm Size',
    'Score',
    'Competency Level',
    'Answers (JSON)',
    'Report Sent',
    'Report Timestamp',
  ];

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  sheet.appendRow(headers);

  Logger.log('ASA_Responses sheet initialized');
}

// Helper: Get session admin info
function getSessionInfo(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const sessionData = data.filter((row) => row[1] === sessionId);
  if (sessionData.length === 0) return null;

  return {
    sessionId: sessionId,
    sessionName: sessionData[0][2],
    totalResponses: sessionData.length,
    averageScore:
      sessionData.reduce((sum, row) => sum + row[6], 0) / sessionData.length,
    responses: sessionData.map((row) => ({
      email: row[3],
      score: row[6],
      competencyLevel: row[7],
      timestamp: row[0],
    })),
  };
}

// Export function to test email sending
function testEmailReport() {
  const testData = {
    sessionId: 'TEST-123',
    groupName: 'Test Session',
    email: 'your-email@example.com', // Change this!
    mobile: '+65 1234 5678',
    firmSize: 'a',
    answers: { q1: 1, q2: 1, q3: 2, q4: 1, q5: 1, q6: 3, q7: 2, q8: 1, q9: 1, q10: 0 },
  };

  const score = calculateScore(testData.answers);
  const tier = getCompetencyTier(score);

  sendEmailReport(testData, score, tier);
  Logger.log('Test email sent to ' + testData.email);
}
