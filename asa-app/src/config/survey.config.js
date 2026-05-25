// ─────────────────────────────────────────────────────────────────────────────
// survey.config.js  —  THE ONLY FILE YOU NEED TO EDIT TO CHANGE THE SURVEY
//
// Swap out questions, registration fields, tiers, branding, or the backend URL
// here. The SurveyEngine component reads this and handles all rendering logic.
//
// Supported question types:
//   mcq    — multiple-choice, single answer  (set correct: <index>)
//   text   — free-text / open-ended          (set correct: -1)
//   scale  — numeric scale min→max           (set correct: -1, or a target value)
//
// For unscored questions set correct: -1
//
// Supported registration field types:
//   text | email | tel | select | checkbox
//   Any field's value can be pre-filled by a matching URL query string param,
//   e.g. ?sessionId=ASA-MORNING-01&groupName=SIA%20Session%201
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const config = {
  // ── Branding ────────────────────────────────────────────────────────────────
  title: 'SIA AI Literacy Survey',
  subtitle: 'Mapping AI adoption across Singapore architectural practice',
  description:
    '10 questions · about 5–10 minutes · your personalised AI competency report will be emailed to you within 15 minutes.',

  // ── Backend ─────────────────────────────────────────────────────────────────
  // Paste your Google Apps Script deployment URL into .env as VITE_BACKEND_URL
  // Leave empty to run in local-only / demo mode (localStorage only)
  backendUrl: BACKEND_URL,

  // ── Registration fields ─────────────────────────────────────────────────────
  // Field types: text | email | tel | select | checkbox
  //
  // Session ID convention (per ASA Queries Reply doc):
  //   ASA-{IDENTIFIER}-{DATE_OR_NUMBER}
  //   Examples: ASA-MORNING-01, ASA-PRECOURSE-2026-05-25, ASA-SIA-BATCH-2
  //
  // Facilitators should generate a unique Session ID per cohort BEFORE the
  // event and embed it in the QR-code URL as ?sessionId=ASA-MORNING-01 so the
  // form pre-fills it on scan. All responses are then tagged on the Sheet.
  registration: [
    {
      name: 'sessionId',
      label: 'Session ID',
      type: 'text',
      placeholder: 'e.g., ASA-MORNING-01',
      required: true,
      readOnly: true, // pre-filled from URL ?sessionId=...
    },
    {
      name: 'groupName',
      label: 'Cohort / Session Name',
      type: 'text',
      placeholder: 'e.g., SIA Roundtable Session 1',
      required: true,
    },
    {
      name: 'firmName',
      label: 'Firm Name',
      type: 'text',
      placeholder: 'e.g., ABC Architects Pte Ltd',
      required: true,
    },
    {
      name: 'fullName',
      label: 'Your Full Name',
      type: 'text',
      placeholder: '',
      required: true,
    },
    {
      name: 'surveyType',
      label: 'Survey Type',
      type: 'select',
      required: true,
      options: [
        { value: '',           label: 'Select survey type…' },
        { value: 'PRECOURSE',  label: 'Pre-course (before training)' },
        { value: 'POSTCOURSE', label: 'Post-course (after training)' },
        { value: 'STANDALONE', label: 'Standalone assessment' },
      ],
    },
    {
      name: 'yearsInPractice',
      label: 'Years in Practice',
      type: 'select',
      required: true,
      options: [
        { value: '',      label: 'Select years…' },
        { value: '<2',    label: 'Less than 2 years' },
        { value: '2-5',   label: '2–5 years' },
        { value: '6-10',  label: '6–10 years' },
        { value: '11-20', label: '11–20 years' },
        { value: '>20',   label: 'More than 20 years' },
      ],
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'your.email@example.com',
      required: true,
    },
    {
      name: 'mobile',
      label: 'Mobile Number (optional)',
      type: 'tel',
      placeholder: '+65 1234 5678',
      required: false,
    },
    {
      name: 'consent',
      label:
        'I consent to my responses being used by SIA for AI training programme planning, in accordance with PDPA. My email and mobile will not be shared with third parties.',
      type: 'checkbox',
      required: true,
    },
  ],

  // ── Questions ────────────────────────────────────────────────────────────────
  // Each question must have: id (unique), type, category, question, correct
  // MCQ also needs: options[]
  // Scale also needs: min, max  and optionally: labels: { min, max }
  // Text also accepts: placeholder, maxLength
  questions: [
    {
      id: 'q1',
      type: 'mcq',
      category: 'Foundational',
      question: "What does the term 'generative AI' best describe?",
      options: [
        'Software that automates repetitive drafting tasks such as dimensioning and hatching',
        "AI that creates new content — text, images, or designs — based on a user's prompt or instruction",
        'A BIM plugin that generates clash reports automatically',
        'A program that optimises project schedules using historical data',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'mcq',
      category: 'Foundational',
      question:
        'Which of the following is the best example of AI already embedded in tools architects routinely use?',
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
      type: 'mcq',
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
      type: 'mcq',
      category: 'Applied',
      question:
        'An architect wants to rapidly explore 30 different massing configurations for a site. Which AI tool type is most suited to this task?',
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
      type: 'mcq',
      category: 'Critical Thinking',
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
      type: 'mcq',
      category: 'Ethics & Legal',
      question:
        "An architect uses an AI tool to generate a schematic design concept. Who retains legal and professional responsibility for the design's compliance with local building codes?",
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
      type: 'mcq',
      category: 'Foundational',
      question:
        'How do Large Language Models (LLMs) such as ChatGPT or Claude generate their responses?',
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
      type: 'mcq',
      category: 'Critical Thinking',
      question:
        'What is the most significant professional risk when using AI to assist with architectural specification writing?',
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
      type: 'mcq',
      category: 'Applied',
      question:
        'Which statement most accurately describes how AI image generation tools handle architectural spatial requirements?',
      options: [
        'They accurately interpret and enforce spatial constraints, structural logic, and building regulations',
        'They produce visually convincing images but do not understand spatial logic, structure, scale, or code compliance',
        'They are trained specifically on architectural drawings and can produce technically accurate floor plans',
        'They automatically cross-reference outputs with local planning guidelines',
      ],
      correct: 1,
    },

    // ── Self-assessment (unscored) ─────────────────────────────────────────────
    {
      id: 'q10',
      type: 'mcq',
      category: 'Self-Assessment',
      question:
        'Which statement best describes your current level of AI tool use in your architectural practice?',
      options: [
        'I do not use any AI tools and have no immediate plans to explore them',
        'I am aware of AI tools but have not yet tried any in a professional context',
        'I occasionally use AI tools (e.g. ChatGPT, image generators) for specific tasks but not as a regular workflow',
        'I regularly integrate AI tools into my daily practice across multiple project tasks',
      ],
      correct: -1, // unscored — self-assessment
    },
  ],

  // ── Competency tiers ─────────────────────────────────────────────────────────
  // Names and breakpoints match AI_Survey_Workflow_Framework.pdf Section 3.1.
  // Ranges are inclusive. With 9 scored questions (q1–q9) the max score is 9.
  // The Apps Script (ASA_GoogleAppsScript.gs) MUST use the same names.
  tiers: [
    { min: 0, max: 3,        name: 'Foundational Awareness', color: '#1F8A70' },
    { min: 4, max: 6,        name: 'Applied Practitioner',   color: '#2C7BB6' },
    { min: 7, max: 8,        name: 'Strategic & Critical',   color: '#E04E1B' },
    { min: 9, max: Infinity, name: 'AI Champion',            color: '#1A3C5E' },
  ],
};
