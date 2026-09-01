import { useCallback, useState } from 'react';
import SetupView from './views/SetupView';
import AdventureView from './views/AdventureView';
import { useModelInstall } from './hooks/useModelInstall';
import { useWakeLock } from './hooks/useWakeLock';
import './App.css';

const PORTAL_DURATION_MS = 650;
const PORTAL_SWAP_MS = 380;

function App() {
  const [view, setView] = useState('setup');
  const [portalActive, setPortalActive] = useState(false);
  const { status, backend, progress, statusText, install, worker, reloadOnCpu } = useModelInstall();

  useWakeLock();

  const handleBeginAdventure = useCallback(() => {
    setPortalActive(true);
    setTimeout(() => setView('adventure'), PORTAL_SWAP_MS);
    setTimeout(() => setPortalActive(false), PORTAL_DURATION_MS);
  }, []);

  return (
    <div className="app-shell">
      {view === 'setup' && (
        <div className={`app-shell__stage ${portalActive ? 'app-shell__stage--leaving' : ''}`}>
          <SetupView
            status={status}
            backend={backend}
            progress={progress}
            statusText={statusText}
            install={install}
            onBeginAdventure={handleBeginAdventure}
          />
        </div>
      )}
      {view === 'adventure' && (
        <div className="app-shell__stage app-shell__stage--entering">
          <AdventureView worker={worker} backend={backend} reloadOnCpu={reloadOnCpu} />
        </div>
      )}
      <div className={`portal-veil ${portalActive ? 'portal-veil--active' : ''}`} aria-hidden="true" />
    </div>
  );
}

export default App;
