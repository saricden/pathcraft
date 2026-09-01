import './App.css';

function App() {
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
            your browser. Install it once, offline play from then on.
          </p>
        </div>

        <div className="model-status">
          <span className="model-status__dot" />
          <span>Model not installed</span>
        </div>

        <div className="card__actions">
          <button type="button" className="btn btn--primary">
            Install Model
          </button>
          <button type="button" className="btn btn--ghost" disabled>
            Begin Adventure
          </button>
        </div>

        <p className="card__hint">Begin Adventure unlocks once the model finishes installing.</p>
      </div>
    </section>
  );
}

export default App;
