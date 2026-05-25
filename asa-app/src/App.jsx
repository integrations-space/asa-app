import { useEffect, useState } from 'react';
import SurveyEngine from './SurveyEngine';
import { config as defaultConfig, buildConfig } from './config/survey.config';

// -----------------------------------------------------------------------------
// App.jsx — entry point
//
// Default: renders the bundled survey from src/config/survey.config.json.
//
// Runtime override: if the URL contains ?config=<URL>, the app fetches that
// JSON (must be publicly accessible, e.g. a GitHub gist raw URL, an S3 link,
// or an Apps Script web app returning JSON), validates its shape, and renders
// that survey instead. On fetch / parse / validation failure, falls back to
// the bundled default and shows an error banner.
//
// See QUESTIONNAIRE_FORMAT.md for the JSON schema.
// -----------------------------------------------------------------------------

function isValidConfigShape(d) {
  return (
    d &&
    typeof d.title === 'string' &&
    Array.isArray(d.registration) &&
    Array.isArray(d.questions) &&
    Array.isArray(d.tiers)
  );
}

// Diagnose common URL mistakes before/after fetch so the error banner gives
// actionable guidance instead of just "Failed to fetch".
function diagnoseConfigUrl(url, err) {
  if (url.includes('/...')) {
    return 'The URL contains "..." which looks like a placeholder from documentation. Replace it with your actual gist ID or file path.';
  }
  if (url.startsWith('https://gist.github.com/')) {
    return 'This is the gist HTML page URL, not the raw JSON URL. Open the gist, click "Raw", and copy the URL from gist.githubusercontent.com.';
  }
  if (url.startsWith('https://github.com/') && url.includes('/blob/')) {
    return 'This is the GitHub HTML preview URL. Replace github.com/<user>/<repo>/blob/<branch>/<path> with raw.githubusercontent.com/<user>/<repo>/<branch>/<path>.';
  }
  if (err && /Failed to fetch|NetworkError/i.test(err.message)) {
    return 'Common causes: (a) the URL is wrong or 404s, (b) the host blocks cross-origin requests (the JSON file must be on a CORS-friendly public host like gist.githubusercontent.com or raw.githubusercontent.com), (c) you are offline.';
  }
  return null;
}

function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const configUrl = params.get('config');
    if (!configUrl) return;

    // Pre-flight check for obvious URL mistakes — no point fetching a
    // placeholder URL just to fail.
    const preCheck = diagnoseConfigUrl(configUrl, null);
    if (preCheck) {
      setError(`Custom survey URL looks wrong: ${preCheck} Showing default survey instead.`);
      return;
    }

    setLoading(true);
    fetch(configUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!isValidConfigShape(data)) {
          throw new Error(
            'JSON is missing required fields. Need: title (string), registration (array), questions (array), tiers (array).'
          );
        }
        setConfig(buildConfig(data));
      })
      .catch((err) => {
        const hint = diagnoseConfigUrl(configUrl, err);
        const tail = hint ? ` ${hint}` : '';
        setError(
          `Could not load custom survey from ${configUrl} — ${err.message}.${tail} Showing default survey instead.`
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <p style={styles.loadingTitle}>Loading survey…</p>
        <p style={styles.loadingHint}>Fetching custom configuration.</p>
      </div>
    );
  }

  return (
    <>
      {error && <div style={styles.errorBanner}>{error}</div>}
      <SurveyEngine config={config} />
    </>
  );
}

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EFE8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loadingTitle: {
    fontSize: '20px',
    color: '#2C2C2A',
    fontWeight: 600,
    marginBottom: '6px',
  },
  loadingHint: {
    fontSize: '14px',
    color: '#888780',
  },
  errorBanner: {
    padding: '12px 20px',
    backgroundColor: '#FFF0ED',
    color: '#712B13',
    fontSize: '13px',
    borderBottom: '1px solid #F0997B',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
};

export default App;
