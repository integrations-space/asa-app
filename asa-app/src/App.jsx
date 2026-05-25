import SurveyEngine from './SurveyEngine';
import { config } from './config/survey.config';

// -----------------------------------------------------------------------------
// App.jsx — entry point
//
// To run a different survey, swap the config import above.
// To customise questions/branding, edit src/config/survey.config.js.
// -----------------------------------------------------------------------------

function App() {
  return <SurveyEngine config={config} />;
}

export default App;
