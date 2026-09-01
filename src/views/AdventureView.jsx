import { useEffect, useRef, useState } from 'react';
import { useAdventure } from '../hooks/useAdventure';
import { previewNarrative } from '../lib/storyEngine';
import './AdventureView.css';

const SELECT_DELAY_MS = 350;

function StoryBlock({ block, isCurrent, onChoose }) {
  const [selecting, setSelecting] = useState(null);

  function handleClick(index) {
    if (selecting !== null) return;
    setSelecting(index);
    setTimeout(() => onChoose(index), SELECT_DELAY_MS);
  }

  return (
    <div className="story-block">
      <p className="story-block__narrative">{block.narrative}</p>

      {block.chosenIndex != null && (
        <div className="story-block__chosen">
          <span className="story-block__chosen-arrow">➜</span>
          {block.options[block.chosenIndex]}
        </div>
      )}

      {isCurrent && block.chosenIndex == null && (
        <div className="story-block__options">
          {block.options.map((option, index) => (
            <button
              key={option}
              type="button"
              className={`option ${selecting === index ? 'option--selected' : ''} ${
                selecting !== null && selecting !== index ? 'option--dismissed' : ''
              }`}
              onClick={() => handleClick(index)}
              disabled={selecting !== null}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingBlock({ pending, onRetry }) {
  if (pending.phase === 'error') {
    return (
      <div className="story-block pending-block">
        <p className="pending-block__error">
          {pending.error || 'Something went wrong continuing the story.'}
        </p>
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (pending.phase === 'choosing') {
    return (
      <div className="story-block pending-block">
        <p className="story-block__narrative">{pending.text}</p>
        <div className="pending-block__thinking pending-block__thinking--inline">
          <span className="pending-block__dots">
            <span />
            <span />
            <span />
          </span>
          Choosing paths… ({pending.optionsFound ?? 0}/3)
        </div>
      </div>
    );
  }

  if (pending.phase === 'streaming' && pending.text) {
    return (
      <div className="story-block pending-block">
        <p className="story-block__narrative">
          {previewNarrative(pending.text)}
          <span className="pending-block__cursor" />
        </p>
      </div>
    );
  }

  return (
    <div className="story-block pending-block">
      <div className="pending-block__thinking">
        <span className="pending-block__dots">
          <span />
          <span />
          <span />
        </span>
        The story unfolds…
      </div>
    </div>
  );
}

function AdventureView({ worker, backend, reloadOnCpu, saveId, initialBlocks }) {
  const { blocks, pending, choose, retry } = useAdventure(worker, backend, reloadOnCpu, saveId, initialBlocks);
  const logRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [blocks.length, pending?.text, pending?.phase]);

  return (
    <section className="adventure">
      <header className="adventure__header">
        <span className="adventure__brand">Pathcraft</span>
      </header>

      <div className="adventure__log" ref={logRef}>
        {blocks.map((block, i) => (
          <StoryBlock
            key={block.id}
            block={block}
            isCurrent={i === blocks.length - 1 && !pending}
            onChoose={choose}
          />
        ))}
        {pending && <PendingBlock pending={pending} onRetry={retry} />}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

export default AdventureView;
