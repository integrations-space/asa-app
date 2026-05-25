import React, { useState, useEffect } from 'react';

const AISurveyApp = () => {
  const [screen, setScreen] = useState('splash');
  const [sessionId, setSessionId] = useState(null);
  const [adminKey, setAdminKey] = useState(null);
  const [formData, setFormData] = useState({
    sessionName: '',
    firmSize: '',
    email: '',
    mobile: '',
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');

  const QUESTIONS = [
    {
      id: 'q1',
      category: 'Foundational',
      question: "What does the term 'generative AI' best describe?",
      options: [
        'Software that automates repetitive drafting tasks such as dimensioning and hatching',
        'AI that creates new content — text, images, or designs — based on a user\'s prompt or instruction',
        'A BIM plugin that generates clash reports automatically',
        'A program that optimises project schedules using historical data',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      category: 'Foundational',
      question: 'Which of the following is the best example of AI already embedded in tools architects routinely use?',
      options: [
        'Exporting a PDF from Revit',
        'Automated clash detection and coordination checking in BIM platforms',
        'Creating a new layer in AutoCAD',
        'Compressing a large drawing file for email',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      category: 'Applied',
      question: "'Prompt engineering' in the context of using AI tools means:",
      options: [
        'Writing code in Python to build a custom AI system',
        'Designing structural load prompts for engineering consultants',
        'Crafting clear, specific instructions to guide an AI tool towards the output you need',
        'Engineering the physical hardware that powers AI servers',
      ],
      correct: 2,
    },
    {
      id: 'q4',
      category: 'Applied',
      question: 'An architect wants to rapidly explore 30 different massing configurations for a site. Which AI tool type is most suited to this task?',
      options: [
        'A grammar and spell-checking AI',
        'Generative design or AI-assisted parametric tools that can produce and evaluate multiple options simultaneously',
        'An AI email summariser',
        'A PDF text extraction tool',
      ],
      correct: 1,
    },
    {
      id: 'q5',
      category: 'Critical',
      question: "What is 'AI hallucination'?",
      options: [
        'An AI-generated photorealistic rendering that looks too real to be a visualisation',
        'When an AI confidently produces information that is incorrect, fabricated, or nonsensical',
        'A VR walkthrough experience powered by AI',
        'When an AI model runs too slowly due to insufficient computing power',
      ],
      correct: 1,
    },
    {
      id: 'q6',
      category: 'Ethics/Legal',
      question: 'An architect uses an AI tool to generate a schematic design concept. Who retains legal and professional responsibility for the design\'s compliance with local building codes?',
      options: [
        'The company that developed the AI tool',
        'The client who commissioned the design',
        'The cloud platform hosting the AI',
        'The architect of record',
      ],
      correct: 3,
    },
    {
      id: 'q7',
      category: 'Foundational',
      question: 'How do Large Language Models (LLMs) such as ChatGPT or Claude generate their responses?',
      options: [
        'They search the live internet and compile up-to-date facts in real time',
        'They access a continuously updated database of all published books and articles',
        'They predict the most statistically likely next word or phrase based on patterns learned from vast training data',
        'They connect directly to your files and documents to produce personalised answers',
      ],
      correct: 2,
    },
    {
      id: 'q8',
      category: 'Critical',
      question: 'What is the most significant professional risk when using AI to assist with architectural specification writing?',
      options: [
        'AI cannot type quickly enough to meet project deadlines',
        'AI may confidently generate outdated, inaccurate, or jurisdiction-specific clauses that require expert verification before use',
        'AI-generated specifications are more expensive to print and distribute',
        'AI tools require specialist hardware that most practices cannot afford',
      ],
      correct: 1,
    },
    {
      id: 'q9',
      category: 'Applied',
      question: 'Which statement most accurately describes how AI image generation tools handle architectural spatial requirements?',
      options: [
        'They accurately interpret and enforce spatial constraints, structural logic, and building regulations',
        'They produce visually convincing images but do not understand spatial logic, structure, scale, or code compliance',
        'They are trained specifically on architectural drawings and can produce technically accurate floor plans',
        'They automatically cross-reference outputs with local planning guidelines',
      ],
      correct: 1,
    },
    {
      id: 'q10',
      category: 'Self-assessment',
      question: 'Which statement best describes your current level of AI tool use in your architectural practice?',
      options: [
        'I do not use any AI tools and have no immediate plans to explore them',
        'I am aware of AI tools but have not yet tried any in a professional context',
        'I occasionally use AI tools (e.g. ChatGPT, image generators) for specific tasks but not as a regular workflow',
        'I regularly integrate AI tools into my daily practice across multiple project tasks',
      ],
      correct: -1,
    },
  ];

  const competencyTiers = {
    0: { name: 'Foundational Awareness', range: '0–3', color: '#0F6E56' },
    1: { name: 'Applied AI Tools', range: '4–6', color: '#185FA5' },
    2: { name: 'AI Strategy & Ethics', range: '7–9', color: '#993C1D' },
    3: { name: 'Peer-led AI Practice', range: '10', color: '#3C3489' },
  };

  const generateSessionId = () => {
    return 'ASA-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  };

  const generateAdminKey = () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  const calculateScore = (answerObj) => {
    let score = 0;
    QUESTIONS.forEach((q) => {
      if (q.correct !== -1 && answerObj[q.id] === q.correct) {
        score += 1;
      }
    });
    return score;
  };

  const getCompetencyTier = (score) => {
    if (score >= 10) return 3;
    if (score >= 7) return 2;
    if (score >= 4) return 1;
    return 0;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.sessionName || !formData.firmSize || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }
    const newSessionId = generateSessionId();
    const newAdminKey = generateAdminKey();
    setSessionId(newSessionId);
    setAdminKey(newAdminKey);
    
    // Store session data in localStorage for demo (would be Google Sheets in production)
    const sessionData = {
      sessionId: newSessionId,
      adminKey: newAdminKey,
      sessionName: formData.sessionName,
      createdAt: new Date().toISOString(),
      responses: [],
    };
    localStorage.setItem(`session_${newSessionId}`, JSON.stringify(sessionData));
    
    setScreen('survey');
  };

  const handleAnswerSelect = (optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [QUESTIONS[currentQuestion].id]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (answers[QUESTIONS[currentQuestion].id] === undefined) {
      alert('Please select an answer before continuing');
      return;
    }
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      submitSurvey();
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const submitSurvey = () => {
    const score = calculateScore(answers);
    const tier = getCompetencyTier(score);
    
    const responseData = {
      timestamp: new Date().toISOString(),
      respondentName: formData.sessionName,
      firmSize: formData.firmSize,
      email: formData.email,
      mobile: formData.mobile,
      answers: answers,
      score: score,
      competencyLevel: competencyTiers[tier].name,
      tier: tier,
    };

    const sessionData = JSON.parse(localStorage.getItem(`session_${sessionId}`));
    sessionData.responses.push(responseData);
    localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));

    setSubmitted(true);
    setScreen('result');
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === adminKey) {
      const sessionData = JSON.parse(localStorage.getItem(`session_${sessionId}`));
      setAdminData(sessionData);
      setScreen('adminDashboard');
    } else {
      alert('Invalid admin key');
    }
  };

  return (
    <div style={styles.container}>
      {screen === 'splash' && (
        <div style={styles.splashScreen}>
          <div style={styles.splashContent}>
            <h1 style={styles.splashTitle}>AI Literacy Survey</h1>
            <p style={styles.splashSubtitle}>Assess your AI competency level</p>
            <p style={styles.splashDesc}>
              This survey evaluates your understanding and use of AI tools in architectural practice. Takes approximately 10 minutes.
            </p>
            <button
              onClick={() => {
                setSessionId(generateSessionId());
                setAdminKey(generateAdminKey());
                setScreen('registration');
              }}
              style={styles.primaryButton}
            >
              Start Survey
            </button>
          </div>
        </div>
      )}

      {screen === 'registration' && (
        <div style={styles.formScreen}>
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Registration</h2>
            <p style={styles.sessionInfo}>Session ID: <code style={styles.code}>{sessionId}</code></p>
            <form onSubmit={handleFormSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Group / Session Name *</label>
                <input
                  type="text"
                  name="sessionName"
                  value={formData.sessionName}
                  onChange={handleFormChange}
                  placeholder="e.g., Morning Architecture Class"
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Firm Size *</label>
                <select
                  name="firmSize"
                  value={formData.firmSize}
                  onChange={handleFormChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select firm size</option>
                  <option value="a">Less than 10 employees</option>
                  <option value="b">Less than 20 employees</option>
                  <option value="c">More than 20 employees</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="your.email@example.com"
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Mobile Number (Optional)</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleFormChange}
                  placeholder="+65 1234 5678"
                  style={styles.input}
                />
              </div>
              <button type="submit" style={styles.primaryButton}>
                Begin Survey
              </button>
            </form>
          </div>
        </div>
      )}

      {screen === 'survey' && (
        <div style={styles.surveyScreen}>
          <div style={styles.surveyHeader}>
            <h2 style={styles.surveyTitle}>AI Literacy Survey</h2>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%`,
                }}
              />
            </div>
            <p style={styles.progressText}>
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </p>
          </div>

          <div style={styles.questionCard}>
            <p style={styles.categoryBadge}>{QUESTIONS[currentQuestion].category}</p>
            <h3 style={styles.questionText}>{QUESTIONS[currentQuestion].question}</h3>

            <div style={styles.optionsContainer}>
              {QUESTIONS[currentQuestion].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  style={{
                    ...styles.optionButton,
                    ...(answers[QUESTIONS[currentQuestion].id] === idx && styles.optionButtonSelected),
                  }}
                >
                  <span style={styles.optionLabel}>{String.fromCharCode(65 + idx)}.</span>
                  <span style={styles.optionText}>{option}</span>
                </button>
              ))}
            </div>

            <div style={styles.navigationButtons}>
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                style={{
                  ...styles.secondaryButton,
                  opacity: currentQuestion === 0 ? 0.5 : 1,
                  cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Previous
              </button>
              <button onClick={handleNext} style={styles.primaryButton}>
                {currentQuestion === QUESTIONS.length - 1 ? 'Submit Survey' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'result' && (
        <div style={styles.resultScreen}>
          <div style={styles.resultCard}>
            <h2 style={styles.resultTitle}>Survey Complete!</h2>
            <p style={styles.resultMessage}>
              Your responses have been recorded. A detailed report will be sent to {formData.email} within 15 minutes.
            </p>

            <div style={styles.scoreBox}>
              <p style={styles.scoreLabel}>Your Score</p>
              <p style={styles.scoreValue}>{calculateScore(answers)} / 10</p>
            </div>

            <div
              style={{
                ...styles.competencyBox,
                borderColor: competencyTiers[getCompetencyTier(calculateScore(answers))].color,
              }}
            >
              <p style={styles.competencyLabel}>Competency Level</p>
              <p style={styles.competencyValue}>
                {competencyTiers[getCompetencyTier(calculateScore(answers))].name}
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
                <button type="submit" style={styles.adminButton}>
                  View Session Dashboard
                </button>
              </form>
            </div>

            <button
              onClick={() => {
                setScreen('splash');
                setFormData({ sessionName: '', firmSize: '', email: '', mobile: '' });
                setCurrentQuestion(0);
                setAnswers({});
                setSubmitted(false);
                setAdminPassword('');
              }}
              style={styles.secondaryButton}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {screen === 'adminDashboard' && adminData && (
        <div style={styles.dashboardScreen}>
          <div style={styles.dashboardCard}>
            <h2 style={styles.dashboardTitle}>Session Dashboard</h2>
            <div style={styles.sessionInfo}>
              <p>
                <strong>Session:</strong> {adminData.sessionName}
              </p>
              <p>
                <strong>Session ID:</strong> <code style={styles.code}>{adminData.sessionId}</code>
              </p>
              <p>
                <strong>Total Responses:</strong> {adminData.responses.length}
              </p>
            </div>

            {adminData.responses.length > 0 && (
              <div style={styles.statsSection}>
                <h3 style={styles.statsTitle}>Group Statistics</h3>
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <p style={styles.statLabel}>Average Score</p>
                    <p style={styles.statValue}>
                      {(adminData.responses.reduce((sum, r) => sum + r.score, 0) / adminData.responses.length).toFixed(1)}
                      /10
                    </p>
                  </div>
                  <div style={styles.statCard}>
                    <p style={styles.statLabel}>Highest Score</p>
                    <p style={styles.statValue}>
                      {Math.max(...adminData.responses.map((r) => r.score))}/10
                    </p>
                  </div>
                  <div style={styles.statCard}>
                    <p style={styles.statLabel}>Lowest Score</p>
                    <p style={styles.statValue}>
                      {Math.min(...adminData.responses.map((r) => r.score))}/10
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.responsesSection}>
              <h3 style={styles.responsesTitle}>Individual Responses</h3>
              {adminData.responses.length === 0 ? (
                <p style={styles.noData}>No responses yet</p>
              ) : (
                <div style={styles.responsesList}>
                  {adminData.responses.map((response, idx) => (
                    <div key={idx} style={styles.responseItem}>
                      <div style={styles.responseHeader}>
                        <p style={styles.responseName}>{response.email}</p>
                        <p style={styles.responseScore}>Score: {response.score}/10</p>
                      </div>
                      <p style={styles.responseLevel}>{response.competencyLevel}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setScreen('result')}
              style={styles.secondaryButton}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F1EFE8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  splashScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
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
  formScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  formCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '450px',
    width: '100%',
    border: '1px solid #D3D1C7',
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#2C2C2A',
  },
  sessionInfo: {
    fontSize: '13px',
    color: '#888780',
    marginBottom: '24px',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#F1EFE8',
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#2C2C2A',
  },
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
  },
  select: {
    padding: '12px',
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  surveyScreen: {
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#F1EFE8',
  },
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
    backgroundColor: '#185FA5',
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
    backgroundColor: '#FFF',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
  },
  optionButtonSelected: {
    borderColor: '#185FA5',
    backgroundColor: '#E6F1FB',
  },
  optionLabel: {
    fontWeight: '600',
    color: '#185FA5',
    minWidth: '20px',
  },
  optionText: {
    color: '#2C2C2A',
    lineHeight: '1.5',
    flex: 1,
  },
  navigationButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#185FA5',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
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
    transition: 'all 0.2s',
  },
  resultScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#F1EFE8',
  },
  resultCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    border: '1px solid #D3D1C7',
  },
  resultTitle: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#2C2C2A',
  },
  resultMessage: {
    fontSize: '14px',
    color: '#888780',
    marginBottom: '28px',
    lineHeight: '1.6',
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
    border: '2px solid #185FA5',
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
    color: '#2C2C2A',
  },
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
    gap: '8px',
    flexDirection: 'column',
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
  dashboardScreen: {
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#F1EFE8',
  },
  dashboardCard: {
    background: 'white',
    border: '1px solid #D3D1C7',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '700px',
    margin: '0 auto',
  },
  dashboardTitle: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#2C2C2A',
  },
  statsSection: {
    marginBottom: '32px',
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#2C2C2A',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statCard: {
    backgroundColor: '#E6F1FB',
    border: '1px solid #B5D4F4',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#0C447C',
    fontWeight: '500',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#185FA5',
  },
  responsesSection: {
    marginBottom: '28px',
  },
  responsesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#2C2C2A',
  },
  responsesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  responseItem: {
    border: '1px solid #D3D1C7',
    borderRadius: '8px',
    padding: '16px',
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
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
    color: '#185FA5',
    fontWeight: '500',
  },
  noData: {
    textAlign: 'center',
    color: '#888780',
    padding: '20px',
    fontSize: '14px',
  },
};

export default AISurveyApp;
