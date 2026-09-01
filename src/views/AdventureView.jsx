import './AdventureView.css';

const OPENING_SCENE = `The forest gate closes behind you with a sound like a held breath being
let go. Moss-choked stones lean out of the mist, and somewhere ahead a
single lantern burns low over a fork in the path.`;

const OPTIONS = [
  'Follow the lantern light down the left path',
  'Kneel and read the runes carved into the nearest stone',
  'Call out into the mist and see what answers',
];

function AdventureView() {
  return (
    <section className="adventure">
      <header className="adventure__header">
        <span className="adventure__brand">Pathcraft</span>
      </header>

      <div className="adventure__story">
        <p>{OPENING_SCENE}</p>
      </div>

      <div className="adventure__options">
        {OPTIONS.map((option) => (
          <button key={option} type="button" className="option">
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

export default AdventureView;
