import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SurveyEngine — generic config-driven survey component
//
// Props:
//   config  (object)  — imported from src/config/survey.config.js
//
// Supported question types: mcq | text | scale
// To change the survey content, edit survey.config.js — not this file.
// ─────────────────────────────────────────────────────────────────────────────

// Build the initial registration form values. Any field whose `name` matches a
// URL query-string param is pre-filled — facilitators encode session metadata
// in the QR-code URL, e.g.
//   https://app.example.com/?sessionId=ASA-MORNING-01&groupName=SIA%20S1
// For backwards-compat, legacy `?group=` also fills `groupName`.
const buildInitialFormData = (config) => {
  const init = {};
  config.registration.forEach((f) => {
    init[f.name] = f.type === 'checkbox' ? false : '';
  });
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    config.registration.forEach((f) => {
      const val = params.get(f.name);
      if (val !== null) init[f.name] = f.type === 'checkbox' ? val === 'true' : val;
    });
    const legacyGroup = params.get('group');
    if (legacyGroup && 'groupName' in init && !init.groupName) {
      init.groupName = legacyGroup;
    }
  }
  return init;
};

const SurveyEngine = ({ config }) => {
  const [screen, setScreen] = useState('splash');
  const [sessionId, setSessionId] = useState('');
  const [formData, setFormData] = useState(() => buildInitialFormData(config));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [adminData, setAdminData] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSessionId, setAdminSessionId] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [finalScore, setFinalScore] = useState(null);

  // ── Derived values from config ──────────────────────────────────────────────
  const scoredQuestions = config.questions.filter((q) => q.correct !== -1);
  const maxScore = scoredQuestions.length;

  const getTier = (score) =>
    config.tiers.find((t) => score >= t.min && score <= t.max) ?? config.tiers[0];

  const calcScore = (ans) =>
    scoredQuestions.reduce((sum, q) => sum + (ans[q.id] === q.correct ? 1 : 0), 0);

  const makeId = (prefix = 'SID') =>
    `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

  // ── Form handlers ───────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const missing = config.registration.filter((f) => {
      if (!f.required) return false;
      const val = formData[f.name];
      if (f.type === 'checkbox') return val !== true;
      if (typeof val !== 'string') return val === undefined || val === null || val === '';
      return val.trim() === '';
    });
    if (missing.length) {
      const labels = missing.map((f) =>
        f.type === 'checkbox' ? 'consent / acknowledgement' : f.label
      );
      alert(`Please complete: ${labels.join(', ')}`);
      return;
    }
    // Use the registration sessionId as-is if provided; otherwise fall back to
    // an auto-generated one so the response is still attributable.
    setSessionId(formData.sessionId || makeId('SID'));
    setScreen('survey');
  };

  // ── Survey handlers ─────────────────────────────────────────────────────────
  const handleAnswerSelect = (value) => {
    const qId = config.questions[currentQuestion].id;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const isCurrentAnswered = () => {
    const q = config.questions[currentQuestion];
    if (q.required === false) return true; // explicitly optional
    const ans = answers[q.id];
    if (q.type === 'text') return typeof ans === 'string' && ans.trim().length > 0;
    if (q.type === 'mcq_other') {
      if (ans === undefined || ans === '') return false;
      if (ans === '__OTHER__') {
        const txt = answers[q.id + '_other'];
        return typeof txt === 'string' && txt.trim().length > 0;
      }
      return true;
    }
    return ans !== undefined && ans !== '';
  };

  const handleNext = () => {
    if (!isCurrentAnswered()) {
      alert('Please answer this question before continuing.');
      return;
    }
    if (currentQuestion < config.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      submitSurvey();
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion((prev) => prev - 1);
  };

  // ── Submission ──────────────────────────────────────────────────────────────
  const submitSurvey = async () => {
    setSubmitting(true);
    setSubmitError('');

    const score = calcScore(answers);
    const tier = getTier(score);
    setFinalScore(score);

    // Use a local sid in case React state hasn't propagated yet (safety)
    const sid = sessionId || makeId('SID');

    // Flatten mcq_other answers: replace the __OTHER__ sentinel with the
    // user-typed text, and drop the helper `<qid>_other` key. The sheet then
    // stores a clean single-value response per question.
    const flatAnswers = { ...answers };
    config.questions.forEach((q) => {
      if (q.type !== 'mcq_other') return;
      const otherKey = `${q.id}_other`;
      if (flatAnswers[q.id] === '__OTHER__') {
        flatAnswers[q.id] = flatAnswers[otherKey] || '';
      }
      delete flatAnswers[otherKey];
    });

    const payload = {
      sessionId: sid,
      ...formData,
      answers: flatAnswers,
      score,
      maxScore,
      competencyLevel: tier.name,
      timestamp: new Date().toISOString(),
    };

    // Persist locally as an offline fallback only. The admin dashboard is
    // now server-backed (Apps Script ASA_Sessions + doGet) so this cache is
    // not used for admin views.
    try {
      const all = JSON.parse(localStorage.getItem('asa_responses') || '[]');
      all.push(payload);
      localStorage.setItem('asa_responses', JSON.stringify(all));
    } catch {
      // localStorage unavailable (private browsing) — non-fatal
    }

    // POST to backend if a URL is configured.
    // Google Apps Script requires no-cors mode — the response is opaque but
    // the data reaches the sheet. If the fetch itself throws (network down,
    // URL missing), we fall back gracefully.
    if (config.backendUrl) {
      try {
        await fetch(config.backendUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
        // With no-cors the response is opaque — no error thrown means success.
      } catch {
        setSubmitError(
          'Could not reach the server — your response is saved locally and will not trigger an email report.'
        );
      }
    }

    setSubmitting(false);
    setScreen('result');
  };

  // ── Admin login ─────────────────────────────────────────────────────────────
  // Validates against the Apps Script doGet endpoint, which checks the admin
  // key against the ASA_Sessions sheet. The facilitator obtains the key by
  // running createSession('ASA-XXX', 'their@email') in the Apps Script editor.
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');

    const sid = (adminSessionId || formData.sessionId || sessionId || '').trim();
    const key = (adminPassword || '').trim();

    if (!sid || !key) {
      setAdminError('Both Session ID and admin key are required.');
      return;
    }
    if (!config.backendUrl) {
      setAdminError('Backend URL not configured — set VITE_BACKEND_URL and rebuild.');
      return;
    }

    setAdminLoading(true);
    try {
      const url =
        `${config.backendUrl}?action=getSessionData` +
        `&sessionId=${encodeURIComponent(sid)}` +
        `&adminKey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        setAdminError(data.message || 'Invalid session ID or admin key.');
        setAdminLoading(false);
        return;
      }
      setAdminData({
        label: sid,
        adminKey: key,
        responses: data.responses || [],
        stats: data.stats || null,
        maxScore: data.maxScore ?? maxScore,
        sessionInfo: data.sessionInfo || {
          totalParticipants: 0,
          groupReportSent: false,
          groupReportSentAt: '',
        },
      });
      setAdminPassword('');
      setScreen('adminDashboard');
    } catch (err) {
      setAdminError(`Could not reach the server: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  // ── Group report controls ───────────────────────────────────────────────────
  // Manually triggers the cohort-wide report from the dashboard (Option 2).
  // Confirms first, then re-fetches session data so the UI reflects the new
  // "sent" state without requiring a full re-login.
  const [groupReportSending, setGroupReportSending] = useState(false);
  const [groupReportNotice, setGroupReportNotice] = useState('');

  const handleSendGroupReport = async () => {
    if (!adminData) return;
    const responseCount = adminData.responses.length;
    const expected = adminData.sessionInfo?.totalParticipants || 0;
    const pct = expected > 0 ? Math.round((responseCount / expected) * 100) : null;
    const warning =
      pct !== null && pct < 50
        ? `\n\nOnly ${responseCount} of ${expected} (${pct}%) have submitted — the report will reflect a partial cohort.`
        : '';
    const ok = window.confirm(
      `Send the group report to all ${responseCount} respondents now? This can only be done once.${warning}`
    );
    if (!ok) return;

    setGroupReportSending(true);
    setGroupReportNotice('');
    try {
      const url =
        `${config.backendUrl}?action=sendGroupReport` +
        `&sessionId=${encodeURIComponent(adminData.label)}` +
        `&adminKey=${encodeURIComponent(adminData.adminKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        setGroupReportNotice(data.message || 'Could not send group report.');
        return;
      }
      setGroupReportNotice(`Group report sent to ${data.sentTo} recipient(s).`);
      // Refresh session info so the button locks itself out.
      const refreshUrl =
        `${config.backendUrl}?action=getSessionData` +
        `&sessionId=${encodeURIComponent(adminData.label)}` +
        `&adminKey=${encodeURIComponent(adminData.adminKey)}`;
      const r2 = await fetch(refreshUrl);
      const d2 = await r2.json();
      if (d2.success) {
        setAdminData((prev) =>
          prev ? { ...prev, sessionInfo: d2.sessionInfo, responses: d2.responses || prev.responses } : prev
        );
      }
    } catch (err) {
      setGroupReportNotice(`Could not reach the server: ${err.message}`);
    } finally {
      setGroupReportSending(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetApp = () => {
    setFormData(buildInitialFormData(config));
    setCurrentQuestion(0);
    setAnswers({});
    setAdminPassword('');
    setAdminSessionId('');
    setAdminError('');
    setAdminData(null);
    setSubmitError('');
    setFinalScore(null);
    setSessionId('');
    setGroupReportNotice('');
    setScreen('splash');
  };

  // ── Question renderers ──────────────────────────────────────────────────────
  const renderQuestion = (q) => {
    const val = answers[q.id];

    if (q.type === 'text') {
      return (
        <textarea
          value={val || ''}
          onChange={(e) => handleAnswerSelect(e.target.value)}
          placeholder={q.placeholder || 'Type your response here…'}
          maxLength={q.maxLength || 1000}
          style={styles.textarea}
        />
      );
    }

    if (q.type === 'scale') {
      const points = Array.from(
        { length: q.max - q.min + 1 },
        (_, i) => q.min + i
      );
      return (
        <div>
          <div style={styles.scaleLabels}>
            <span style={styles.scaleLabel}>{q.labels?.min ?? q.min}</span>
            <span style={styles.scaleLabel}>{q.labels?.max ?? q.max}</span>
          </div>
          <div style={styles.scaleRow}>
            {points.map((n) => (
              <button
                key={n}
                onClick={() => handleAnswerSelect(n)}
                style={{
                  ...styles.scalePoint,
                  ...(val === n ? styles.scalePointSelected : {}),
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === 'mcq_other') {
      const otherKey = `${q.id}_other`;
      const otherVal = answers[otherKey] || '';
      const isOther = val === '__OTHER__';
      return (
        <div style={styles.mcqOtherContainer}>
          <select
            value={val ?? ''}
            onChange={(e) => handleAnswerSelect(e.target.value)}
            style={styles.select}
          >
            <option value="">{q.placeholder || 'Select an option…'}</option>
            {q.options.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
            <option value="__OTHER__">{q.otherLabel || 'Other (please specify)'}</option>
          </select>
          {isOther && (
            <textarea
              value={otherVal}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [otherKey]: e.target.value }))
              }
              placeholder={q.otherPlaceholder || 'Type your response…'}
              maxLength={q.maxLength || 400}
              style={{ ...styles.textarea, marginTop: '12px', marginBottom: '0' }}
            />
          )}
        </div>
      );
    }

    // Default: mcq
    return (
      <div style={styles.optionsContainer}>
        {q.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswerSelect(idx)}
            style={{
              ...styles.optionButton,
              ...(val === idx ? styles.optionButtonSelected : {}),
            }}
          >
            <span style={styles.optionLabel}>{String.fromCharCode(65 + idx)}.</span>
            <span style={styles.optionText}>{option}</span>
          </button>
        ))}
      </div>
    );
  };

  // ── Computed display values ─────────────────────────────────────────────────
  const displayScore = finalScore ?? 0;
  const displayTier = getTier(displayScore);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>

      {/* ── SPLASH ─────────────────────────────────────────────────────────── */}
      {screen === 'splash' && (
        <div style={styles.centeredScreen}>
          <div style={styles.splashContent}>
            <h1 style={styles.splashTitle}>{config.title}</h1>
            <p style={styles.splashSubtitle}>{config.subtitle}</p>
            <p style={styles.splashDesc}>{config.description}</p>
            <button onClick={() => setScreen('registration')} style={styles.primaryButton}>
              Start Survey
            </button>
            <p style={styles.splashAdminLink}>
              <button
                type="button"
                onClick={() => { setAdminError(''); setScreen('adminLogin'); }}
                style={styles.linkButton}
              >
                Session administrator? View dashboard →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── ADMIN LOGIN ────────────────────────────────────────────────────── */}
      {screen === 'adminLogin' && (
        <div style={styles.centeredScreen}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Session Dashboard</h2>
            <p style={styles.resultMessage}>
              Enter your Session ID and admin key to view live cohort data.
              Don't have a key? Run <code>createSession('YOUR-SESSION-ID', 'your@email')</code> in
              the Apps Script editor — the key arrives by email.
            </p>
            <form onSubmit={handleAdminLogin} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Session ID</label>
                <input
                  type="text"
                  placeholder="e.g., ASA-MORNING-01"
                  value={adminSessionId}
                  onChange={(e) => setAdminSessionId(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Admin Key</label>
                <input
                  type="password"
                  placeholder="Enter admin key"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              {adminError && <p style={styles.errorBanner}>{adminError}</p>}
              <button type="submit" disabled={adminLoading} style={styles.primaryButton}>
                {adminLoading ? 'Verifying…' : 'View Dashboard'}
              </button>
              <button
                type="button"
                onClick={() => { setAdminError(''); setAdminPassword(''); setScreen('splash'); }}
                style={styles.secondaryButton}
              >
                ← Back
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── REGISTRATION ───────────────────────────────────────────────────── */}
      {screen === 'registration' && (
        <div style={styles.centeredScreen}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Registration</h2>
            <form onSubmit={handleFormSubmit} style={styles.form}>
              {config.registration.map((field) => {
                if (field.type === 'checkbox') {
                  return (
                    <label key={field.name} style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={formData[field.name] === true}
                        onChange={handleFormChange}
                        required={field.required}
                        style={styles.checkboxInput}
                      />
                      <span style={styles.checkboxLabel}>
                        {field.label}
                        {field.required && ' *'}
                      </span>
                    </label>
                  );
                }
                return (
                  <div key={field.name} style={styles.formGroup}>
                    <label style={styles.label}>
                      {field.label}
                      {field.required && ' *'}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleFormChange}
                        style={styles.select}
                        required={field.required}
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleFormChange}
                        placeholder={field.placeholder || ''}
                        style={{
                          ...styles.input,
                          ...(field.readOnly ? styles.inputReadOnly : {}),
                        }}
                        required={field.required}
                        readOnly={field.readOnly || false}
                      />
                    )}
                  </div>
                );
              })}
              <button type="submit" style={styles.primaryButton}>
                Begin Survey
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SURVEY ─────────────────────────────────────────────────────────── */}
      {screen === 'survey' && (
        <div style={styles.surveyScreen}>
          <div style={styles.surveyHeader}>
            <h2 style={styles.surveyTitle}>{config.title}</h2>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((currentQuestion + 1) / config.questions.length) * 100}%`,
                }}
              />
            </div>
            <p style={styles.progressText}>
              Question {currentQuestion + 1} of {config.questions.length}
            </p>
          </div>

          <div style={styles.questionCard}>
            <p style={styles.categoryBadge}>
              {config.questions[currentQuestion].category}
            </p>
            <h3 style={styles.questionText}>
              {config.questions[currentQuestion].question}
            </h3>

            {renderQuestion(config.questions[currentQuestion])}

            <div style={styles.navigationButtons}>
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                style={{
                  ...styles.secondaryButton,
                  opacity: currentQuestion === 0 ? 0.4 : 1,
                  cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Previous
              </button>
              <button
                onClick={handleNext}
                disabled={submitting}
                style={{
                  ...styles.primaryButton,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting
                  ? 'Submitting…'
                  : currentQuestion === config.questions.length - 1
                  ? 'Submit Survey'
                  : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULT ─────────────────────────────────────────────────────────── */}
      {screen === 'result' && (
        <div style={styles.centeredScreen}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Survey Complete!</h2>
            <p style={styles.resultMessage}>
              {config.backendUrl
                ? `A detailed report will be sent to ${formData.email || 'your email'} within 15 minutes.`
                : 'Your responses have been recorded.'}
            </p>

            {submitError && <p style={styles.errorBanner}>{submitError}</p>}

            <div style={styles.scoreBox}>
              <p style={styles.scoreLabel}>Your Score</p>
              <p style={styles.scoreValue}>
                {displayScore} / {maxScore}
              </p>
            </div>

            <div
              style={{
                ...styles.competencyBox,
                borderColor: displayTier.color,
              }}
            >
              <p style={styles.competencyLabel}>Competency Level</p>
              <p style={{ ...styles.competencyValue, color: displayTier.color }}>
                {displayTier.name}
              </p>
            </div>

            <div style={styles.adminSection}>
              <h3 style={styles.adminTitle}>Session Administrator?</h3>
              <form onSubmit={handleAdminLogin} style={styles.adminForm}>
                <input
                  type="password"
                  placeholder="Enter admin key"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={styles.input}
                />
                {adminError && <p style={styles.errorBanner}>{adminError}</p>}
                <button type="submit" disabled={adminLoading} style={styles.adminButton}>
                  {adminLoading ? 'Verifying…' : 'View Session Dashboard'}
                </button>
              </form>
            </div>

            <button onClick={resetApp} style={styles.secondaryButton}>
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ── ADMIN DASHBOARD ────────────────────────────────────────────────── */}
      {screen === 'adminDashboard' && adminData && (() => {
        const responses = adminData.responses;
        const dashMax = adminData.maxScore ?? maxScore;
        const scores = responses.map((r) => r.score);
        const avg = scores.length
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          : '—';
        const high = scores.length ? Math.max(...scores) : '—';
        const low = scores.length ? Math.min(...scores) : '—';

        const tierCounts = config.tiers.map((t) => ({
          ...t,
          count: responses.filter((r) => getTier(r.score).name === t.name).length,
        }));

        // Where to go on "Back": from the splash-side admin entry point we
        // return to splash; from the post-survey path we return to the result.
        const backTarget = finalScore == null ? 'splash' : 'result';

        const sessionInfo = adminData.sessionInfo || {};
        const expected = sessionInfo.totalParticipants || 0;
        const groupSent = !!sessionInfo.groupReportSent;
        const submissionPct = expected > 0
          ? Math.round((responses.length / expected) * 100)
          : null;

        return (
          <div style={styles.surveyScreen}>
            <div style={styles.dashboardCard}>
              <h2 style={styles.cardTitle}>Session Dashboard</h2>
              <p style={styles.metaLine}>
                <strong>Session ID:</strong> {adminData.label}
              </p>
              <p style={styles.metaLine}>
                <strong>Total Responses:</strong> {responses.length}
                {expected > 0 && (
                  <> {' / '} {expected} ({submissionPct}%)</>
                )}
              </p>

              {/* Group report controls — Option 1 (auto at 95%) shows progress,
                  Option 2 (manual) shows the trigger button. Both render the
                  "already sent" lock-out once fired. */}
              <div style={styles.groupReportPanel}>
                <h3 style={styles.sectionTitle}>Cohort Group Report</h3>
                {groupSent ? (
                  <p style={styles.groupReportSentNote}>
                    ✓ Group report sent
                    {sessionInfo.groupReportSentAt
                      ? ` at ${new Date(sessionInfo.groupReportSentAt).toLocaleString()}`
                      : ''}
                    .
                  </p>
                ) : (
                  <>
                    <p style={styles.groupReportHint}>
                      {expected > 0
                        ? `Will auto-send to all participants once ${Math.ceil(expected * 0.95)} of ${expected} have submitted. You can also send it manually below.`
                        : 'No participant count was set for this session — the group report will only send when you trigger it manually.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleSendGroupReport}
                      disabled={groupReportSending || responses.length === 0}
                      style={{
                        ...styles.primaryButton,
                        opacity: groupReportSending || responses.length === 0 ? 0.6 : 1,
                        cursor:
                          groupReportSending || responses.length === 0
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                    >
                      {groupReportSending ? 'Sending…' : 'Send Group Report Now'}
                    </button>
                  </>
                )}
                {groupReportNotice && (
                  <p style={styles.groupReportNotice}>{groupReportNotice}</p>
                )}
              </div>

              {responses.length > 0 && (
                <>
                  <div style={styles.statsGrid}>
                    {[
                      { label: 'Average Score', value: `${avg} / ${dashMax}` },
                      { label: 'Highest', value: `${high} / ${dashMax}` },
                      { label: 'Lowest',  value: `${low} / ${dashMax}` },
                    ].map((s) => (
                      <div key={s.label} style={styles.statCard}>
                        <p style={styles.statLabel}>{s.label}</p>
                        <p style={styles.statValue}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div style={styles.tierBreakdown}>
                    <h3 style={styles.sectionTitle}>Competency Breakdown</h3>
                    {tierCounts.map((t) => (
                      <div key={t.name} style={styles.tierRow}>
                        <span
                          style={{ ...styles.tierDot, backgroundColor: t.color }}
                        />
                        <span style={styles.tierName}>{t.name}</span>
                        <span style={styles.tierCount}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={styles.responsesSection}>
                <h3 style={styles.sectionTitle}>Individual Responses</h3>
                {responses.length === 0 ? (
                  <p style={styles.noData}>No responses yet</p>
                ) : (
                  responses.map((r, i) => (
                    <div key={i} style={styles.responseItem}>
                      <div style={styles.responseHeader}>
                        <p style={styles.responseName}>
                          {r.email || `Respondent ${i + 1}`}
                        </p>
                        <p style={styles.responseScore}>
                          {r.score} / {dashMax}
                        </p>
                      </div>
                      <p
                        style={{
                          ...styles.responseLevel,
                          color: getTier(r.score).color,
                        }}
                      >
                        {r.competencyLevel}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <button onClick={() => setScreen(backTarget)} style={styles.secondaryButton}>
                ← Back
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F1EFE8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // ── Layouts ──────────────────────────────────────────────────────────────
  centeredScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  surveyScreen: {
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#F1EFE8',
  },

  // ── Splash ───────────────────────────────────────────────────────────────
  splashContent: {
    textAlign: 'center',
    maxWidth: '500px',
  },
  splashTitle: {
    fontSize: '44px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#2C2C2A',
  },
  splashSubtitle: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#5F5E5A',
    marginBottom: '16px',
  },
  splashDesc: {
    fontSize: '16px',
    color: '#888780',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  splashAdminLink: {
    marginTop: '24px',
    fontSize: '13px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#888780',
    fontSize: '13px',
    fontFamily: 'inherit',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '460px',
    width: '100%',
    border: '1px solid #D3D1C7',
  },
  cardTitle: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#2C2C2A',
  },

  // ── Form ─────────────────────────────────────────────────────────────────
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#2C2C2A',
    marginBottom: '8px',
  },
  input: {
    padding: '12px',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  inputReadOnly: {
    backgroundColor: '#F1EFE8',
    color: '#5F5E5A',
    cursor: 'not-allowed',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    backgroundColor: '#FAFAF7',
    cursor: 'pointer',
  },
  checkboxInput: {
    marginTop: '3px',
    width: '16px',
    height: '16px',
    flexShrink: 0,
    accentColor: '#E04E1B',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#2C2C2A',
    lineHeight: '1.5',
  },
  select: {
    padding: '12px',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: 'white',
  },
  textarea: {
    padding: '12px',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    minHeight: '120px',
    resize: 'vertical',
    marginBottom: '32px',
    width: '100%',
    boxSizing: 'border-box',
  },

  // ── MCQ-with-other ────────────────────────────────────────────────────────
  mcqOtherContainer: {
    marginBottom: '32px',
  },

  // ── Scale question ────────────────────────────────────────────────────────
  scaleLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  scaleLabel: {
    fontSize: '12px',
    color: '#888780',
  },
  scaleRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  scalePoint: {
    width: '48px',
    height: '48px',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    backgroundColor: 'white',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  scalePointSelected: {
    borderColor: '#E04E1B',
    backgroundColor: '#FDEEE6',
    color: '#E04E1B',
  },

  // ── Survey header & question card ─────────────────────────────────────────
  surveyHeader: {
    maxWidth: '600px',
    margin: '0 auto 30px',
  },
  surveyTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: '20px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#D3D1C7',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E04E1B',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '13px',
    color: '#888780',
  },
  questionCard: {
    background: 'white',
    border: '1px solid #D3D1C7',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  categoryBadge: {
    display: 'inline-block',
    backgroundColor: '#E1F5EE',
    color: '#0F6E56',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  questionText: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: '28px',
    lineHeight: '1.5',
  },

  // ── MCQ options ───────────────────────────────────────────────────────────
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  optionButton: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '16px',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  optionButtonSelected: {
    borderColor: '#E04E1B',
    backgroundColor: '#FDEEE6',
  },
  optionLabel: {
    fontWeight: '600',
    color: '#E04E1B',
    minWidth: '20px',
  },
  optionText: {
    color: '#2C2C2A',
    lineHeight: '1.5',
    flex: 1,
  },

  // ── Navigation buttons ────────────────────────────────────────────────────
  navigationButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#E04E1B',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: 'white',
    color: '#2C2C2A',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // ── Result screen ─────────────────────────────────────────────────────────
  resultMessage: {
    fontSize: '14px',
    color: '#888780',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  errorBanner: {
    backgroundColor: '#FFF0ED',
    border: '1px solid #F0997B',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#712B13',
    marginBottom: '16px',
  },
  scoreBox: {
    backgroundColor: '#E1F5EE',
    border: '1px solid #9FE1CB',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  scoreLabel: {
    fontSize: '13px',
    color: '#0F6E56',
    fontWeight: '500',
    marginBottom: '8px',
  },
  scoreValue: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#0F6E56',
  },
  competencyBox: {
    border: '2px solid',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '28px',
  },
  competencyLabel: {
    fontSize: '13px',
    color: '#888780',
    fontWeight: '500',
    marginBottom: '8px',
  },
  competencyValue: {
    fontSize: '22px',
    fontWeight: '600',
  },

  // ── Admin section (on result screen) ─────────────────────────────────────
  adminSection: {
    backgroundColor: '#FAEDE7',
    border: '1px solid #F0997B',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  adminTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#712B13',
    marginBottom: '12px',
  },
  adminForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  adminButton: {
    padding: '10px 16px',
    backgroundColor: '#D85A30',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // ── Admin dashboard ───────────────────────────────────────────────────────
  dashboardCard: {
    background: 'white',
    border: '1px solid #D3D1C7',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '700px',
    margin: '0 auto',
  },
  metaLine: {
    fontSize: '14px',
    color: '#5F5E5A',
    marginBottom: '8px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    margin: '24px 0',
  },
  statCard: {
    backgroundColor: '#FDEEE6',
    border: '1px solid #F4C9B5',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#1A3C5E',
    fontWeight: '500',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#E04E1B',
  },
  tierBreakdown: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: '12px',
  },
  tierRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid #F1EFE8',
  },
  tierDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  tierName: {
    fontSize: '14px',
    color: '#2C2C2A',
    flex: 1,
  },
  tierCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#5F5E5A',
  },
  responsesSection: {
    marginBottom: '24px',
  },
  groupReportPanel: {
    backgroundColor: '#FFF8F3',
    border: '1px solid #F4C9B5',
    borderRadius: '8px',
    padding: '16px',
    margin: '20px 0',
  },
  groupReportHint: {
    fontSize: '13px',
    color: '#5F5E5A',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  groupReportSentNote: {
    fontSize: '13px',
    color: '#0F6E56',
    fontWeight: '500',
    margin: '4px 0',
  },
  groupReportNotice: {
    fontSize: '13px',
    color: '#2C2C2A',
    marginTop: '10px',
  },
  responseItem: {
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '8px',
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  responseName: {
    fontWeight: '600',
    color: '#2C2C2A',
    fontSize: '14px',
  },
  responseScore: {
    fontSize: '13px',
    color: '#888780',
  },
  responseLevel: {
    fontSize: '13px',
    fontWeight: '500',
  },
  noData: {
    textAlign: 'center',
    color: '#888780',
    padding: '20px',
    fontSize: '14px',
  },
};

export default SurveyEngine;
