import { useCallback, useState } from 'react';
import SetupView from './views/SetupView';
import AdventureView from './views/AdventureView';
import './App.css';

const PORTAL_DURATION_MS = 650;
const PORTAL_SWAP_MS = 380;

function App() {
  const [view, setView] = useState('setup');
  const [portalActive, setPortalActive] = useState(false);

  const handleBeginAdventure = useCallback(() => {
    setPortalActive(true);
    setTimeout(() => setView('adventure'), PORTAL_SWAP_MS);
    setTimeout(() => setPortalActive(false), PORTAL_DURATION_MS);
  }, []);

  return (
    <div className="app-shell">
      {view === 'setup' && (
        <div className={`app-shell__stage ${portalActive ? 'app-shell__stage--leaving' : ''}`}>
          <SetupView onBeginAdventure={handleBeginAdventure} />
        </div>
      )}
      {view === 'adventure' && (
        <div className="app-shell__stage app-shell__stage--entering">
          <AdventureView />
        </div>
      )}
      <div className={`portal-veil ${portalActive ? 'portal-veil--active' : ''}`} aria-hidden="true" />
    </div>
  );
}

export default App;
