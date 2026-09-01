import { useCallback, useState } from 'react';
import SetupView from './views/SetupView';
import LoadMenuView from './views/LoadMenuView';
import AdventureView from './views/AdventureView';
import { useModelInstall } from './hooks/useModelInstall';
import { useWakeLock } from './hooks/useWakeLock';
import { createSaveId } from './lib/saves';
import './App.css';

const PORTAL_DURATION_MS = 650;
const PORTAL_SWAP_MS = 380;

function App() {
  const [view, setView] = useState('setup');
  const [portalActive, setPortalActive] = useState(false);
  const [activeSave, setActiveSave] = useState(null); // { id, blocks }
  const { status, backend, progress, statusText, install, worker, reloadOnCpu } = useModelInstall();

  useWakeLock();

  const enterAdventure = useCallback((save) => {
    setActiveSave(save);
    setPortalActive(true);
    setTimeout(() => setView('adventure'), PORTAL_SWAP_MS);
    setTimeout(() => setPortalActive(false), PORTAL_DURATION_MS);
  }, []);

  const handleNewAdventure = useCallback(() => {
    enterAdventure({ id: createSaveId(), blocks: undefined });
  }, [enterAdventure]);

  const handleLoadAdventure = useCallback(() => {
    setView('loadMenu');
  }, []);

  const handleSelectSave = useCallback(
    (save) => {
      enterAdventure({ id: save.id, blocks: save.blocks });
    },
    [enterAdventure],
  );

  const handleBackFromLoadMenu = useCallback(() => {
    setView('setup');
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
            onNewAdventure={handleNewAdventure}
            onLoadAdventure={handleLoadAdventure}
          />
        </div>
      )}
      {view === 'loadMenu' && <LoadMenuView onSelect={handleSelectSave} onBack={handleBackFromLoadMenu} />}
      {view === 'adventure' && (
        <div className="app-shell__stage app-shell__stage--entering">
          <AdventureView
            worker={worker}
            backend={backend}
            reloadOnCpu={reloadOnCpu}
            saveId={activeSave?.id}
            initialBlocks={activeSave?.blocks}
          />
        </div>
      )}
      <div className={`portal-veil ${portalActive ? 'portal-veil--active' : ''}`} aria-hidden="true" />
    </div>
  );
}

export default App;
