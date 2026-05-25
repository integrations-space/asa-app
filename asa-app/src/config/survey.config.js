// ─────────────────────────────────────────────────────────────────────────────
// survey.config.js  —  thin wrapper around survey.config.json
//
// All survey content (questions, registration fields, tiers, branding) lives
// in survey.config.json so non-developers can edit a clean data file without
// touching JavaScript. This wrapper exists only to:
//   1. Inject the runtime-only `backendUrl` from the build-time env variable
//   2. Convert the `9999` sentinel in the top tier back to `Infinity`
//      (JSON has no native Infinity)
//
// Exports:
//   buildConfig(jsonData)  — turn any survey JSON into a runtime config.
//                            Used by both the bundled default and the runtime
//                            ?config=URL loader in App.jsx.
//   config                 — the default config built from the bundled JSON.
//
// To change the bundled survey, edit survey.config.json. To run a *different*
// survey at runtime without redeploying, point the URL at a hosted JSON:
//   https://your-app/?config=https://example.com/my-survey.json
// See QUESTIONNAIRE_FORMAT.md for the full content schema.
// ─────────────────────────────────────────────────────────────────────────────

import data from './survey.config.json';

const SENTINEL_INFINITY = 9999;

export function buildConfig(jsonData) {
  return {
    ...jsonData,
    backendUrl: import.meta.env.VITE_BACKEND_URL || '',
    tiers: (jsonData.tiers || []).map((t) => ({
      ...t,
      max: t.max >= SENTINEL_INFINITY ? Infinity : t.max,
    })),
  };
}

export const config = buildConfig(data);
