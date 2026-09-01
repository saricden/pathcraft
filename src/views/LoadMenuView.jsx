import { listSaves } from '../lib/saves';
import './LoadMenuView.css';

function summarize(save) {
  return save.blocks[save.blocks.length - 1]?.narrative ?? '';
}

function LoadMenuView({ onSelect, onBack }) {
  const saves = listSaves();

  return (
    <section className="load-menu">
      <header className="load-menu__header">
        <span className="load-menu__brand">Pathcraft</span>
      </header>

      <div className="load-menu__body">
        <h2 className="load-menu__title">Continue an adventure</h2>

        {saves.length === 0 ? (
          <p className="load-menu__empty">No saved adventures yet.</p>
        ) : (
          <ul className="load-menu__list">
            {saves.map((save) => (
              <li key={save.id}>
                <button type="button" className="load-menu__item" onClick={() => onSelect(save)}>
                  <span className="load-menu__item-text">{summarize(save)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn btn--ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}

export default LoadMenuView;
