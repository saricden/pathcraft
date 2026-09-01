import './SetupView.css';

const STATUS_COPY = {
  checking: 'Checking your device…',
  idle: 'Model not ready',
  installing: 'Preparing…',
  ready: 'Model prepared',
  error: 'Preparation failed',
};

const BACKEND_COPY = {
  gpu: 'GPU accelerated',
  cpu: 'CPU mode — responses may be a little slower',
};

function SetupView({ status, backend, progress, statusText, install, onNewAdventure, onLoadAdventure }) {
  const percent = Math.round(progress * 100);

  return (
    <section className="setup">
      <div className="brand">
        <svg
          className="brand__glyph"
          viewBox="0 0 24 24"
          fill="none"
          role="presentation"
          aria-hidden="true"
        >
          <path
            d="M12 2 14.2 9.8 22 12 14.2 14.2 12 22 9.8 14.2 2 12 9.8 9.8 12 2Z"
            fill="currentColor"
          />
        </svg>
        <h1 className="brand__title">Pathcraft</h1>
        <p className="brand__tagline">An AI-crafted text adventure, built as you play</p>
      </div>

      <div className="card">
        <div className="card__heading">
          <h2>Prepare your journey</h2>
          <p>
            Pathcraft tells its story using a small AI model that runs entirely in
            your browser. Prepare it once, offline play from then on.
          </p>
        </div>

        <div className={`model-status model-status--${status}`} data-status={status}>
          <span className="model-status__dot" />
          <span>{STATUS_COPY[status]}</span>
          {status === 'installing' && (
            <span className="model-status__percent">{percent}%</span>
          )}
        </div>

        {status !== 'checking' && backend && (
          <p className="card__backend">{BACKEND_COPY[backend]}</p>
        )}

        {status === 'installing' && (
          <div className="progress">
            <div className="progress__fill" style={{ width: `${percent}%` }} />
          </div>
        )}

        {status === 'installing' && statusText && (
          <p className="card__detail">{statusText}</p>
        )}

        {status === 'error' && <p className="card__detail card__detail--error">{statusText}</p>}

        <div className="card__actions">
          {status !== 'ready' && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={install}
              disabled={status === 'installing' || status === 'checking'}
            >
              {status === 'checking' && 'Checking…'}
              {status === 'idle' && 'Prepare Model'}
              {status === 'installing' && 'Preparing…'}
              {status === 'error' && 'Try Again'}
            </button>
          )}
          <button
            type="button"
            className={`btn ${status === 'ready' ? 'btn--primary' : 'btn--ghost'}`}
            disabled={status !== 'ready'}
            onClick={onNewAdventure}
          >
            Start New Adventure
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={status !== 'ready'}
            onClick={onLoadAdventure}
          >
            Load Adventure
          </button>
        </div>

        {status !== 'ready' && (
          <p className="card__hint">Adventure options unlock once the model finishes preparing.</p>
        )}
      </div>
    </section>
  );
}

export default SetupView;
