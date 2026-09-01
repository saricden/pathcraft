import { useEffect, useRef, useState } from 'react';
import {
  NARRATIVE_MAX_TOKENS,
  SINGLE_OPTION_MAX_TOKENS,
  FALLBACK_NARRATIVE,
  buildOpeningNarrativeMessages,
  buildNarrativeMessages,
  buildSingleOptionMessages,
  cleanNarrative,
  cleanOption,
  fallbackOption,
} from '../lib/storyEngine';
import { saveGame } from '../lib/saves';

const FRIENDLY_GENERATION_ERROR =
  'Something interrupted the story on this device. Tap Try Again to continue.';

export function useAdventure(workerRef, backend, reloadOnCpu, saveId, initialBlocks) {
  const isResuming = Boolean(initialBlocks && initialBlocks.length > 0);
  const [blocks, setBlocks] = useState(initialBlocks ?? []);
  const [pending, setPending] = useState(isResuming ? null : { phase: 'thinking', text: '', error: null });
  const nextIdRef = useRef(isResuming ? initialBlocks[initialBlocks.length - 1].id + 1 : 0);
  const lastTurnRef = useRef(null); // { blocks, isOpening }
  const openingStartedRef = useRef(false);
  const fallbackAttemptedRef = useRef(false);
  const narrativeRetriedRef = useRef(false);

  function showError() {
    setPending((prev) => (prev ? { ...prev, phase: 'error', error: FRIENDLY_GENERATION_ERROR } : prev));
  }

  function withGpuFallback(retryFn) {
    if (backend === 'gpu' && !fallbackAttemptedRef.current) {
      fallbackAttemptedRef.current = true;
      reloadOnCpu().then(retryFn).catch(showError);
    } else {
      showError();
    }
  }

  function finishTurn(updatedBlocks, sentence, options) {
    const block = { id: nextIdRef.current++, narrative: sentence, options, chosenIndex: null };
    const next = [...updatedBlocks, block];
    setBlocks(next);
    saveGame(saveId, next);
    setPending(null);
  }

  function collectOption(updatedBlocks, sentence, collected, retried = false) {
    setPending((prev) => (prev ? { ...prev, optionsFound: collected.length } : prev));

    const worker = workerRef.current;
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.status === 'complete') {
        const option = cleanOption(data.text);
        // Content-level retry: an empty/truncated-looking option is worth
        // one more attempt for this slot before settling for a fallback.
        if (!option && !retried) {
          collectOption(updatedBlocks, sentence, collected, true);
          return;
        }
        const next = [...collected, option || fallbackOption(collected.length)];
        if (next.length < 3) {
          collectOption(updatedBlocks, sentence, next);
        } else {
          finishTurn(updatedBlocks, sentence, next);
        }
      } else if (data.status === 'error') {
        withGpuFallback(() => collectOption(updatedBlocks, sentence, collected, retried));
      }
    };

    worker.postMessage({
      type: 'generate',
      messages: buildSingleOptionMessages(updatedBlocks, sentence, collected),
      maxNewTokens: SINGLE_OPTION_MAX_TOKENS,
    });
  }

  function runOptionsStage(updatedBlocks, sentence) {
    setPending({ phase: 'choosing', text: sentence, error: null, optionsFound: 0 });
    collectOption(updatedBlocks, sentence, []);
  }

  function runNarrativeStage(updatedBlocks, isOpening) {
    setPending({ phase: 'thinking', text: '', error: null });

    const worker = workerRef.current;
    worker.onmessage = (event) => {
      const data = event.data;
      switch (data.status) {
        case 'stream':
          setPending((prev) => (prev ? { ...prev, phase: 'streaming', text: prev.text + data.text } : prev));
          break;
        case 'complete': {
          const cleaned = cleanNarrative(data.text);
          // Content-level retry: an empty sentence is worth one more
          // attempt before falling back to generic filler text.
          if (!cleaned && !narrativeRetriedRef.current) {
            narrativeRetriedRef.current = true;
            runNarrativeStage(updatedBlocks, isOpening);
            return;
          }
          runOptionsStage(updatedBlocks, cleaned || FALLBACK_NARRATIVE);
          break;
        }
        case 'error':
          withGpuFallback(() => runNarrativeStage(updatedBlocks, isOpening));
          break;
        default:
          break;
      }
    };

    worker.postMessage({
      type: 'generate',
      messages: isOpening ? buildOpeningNarrativeMessages() : buildNarrativeMessages(updatedBlocks),
      maxNewTokens: NARRATIVE_MAX_TOKENS,
    });
  }

  function resetRetryState() {
    fallbackAttemptedRef.current = false;
    narrativeRetriedRef.current = false;
  }

  function beginOpening() {
    lastTurnRef.current = { blocks: [], isOpening: true };
    resetRetryState();
    runNarrativeStage([], true);
  }

  function choose(index) {
    if (pending) return;

    const last = blocks[blocks.length - 1];
    const updated = [...blocks.slice(0, -1), { ...last, chosenIndex: index }];
    setBlocks(updated);
    lastTurnRef.current = { blocks: updated, isOpening: false };
    resetRetryState();
    runNarrativeStage(updated, false);
  }

  function retry() {
    if (!lastTurnRef.current) return;
    const { blocks: turnBlocks, isOpening } = lastTurnRef.current;
    resetRetryState();
    runNarrativeStage(turnBlocks, isOpening);
  }

  useEffect(() => {
    if (openingStartedRef.current) return;
    openingStartedRef.current = true;
    if (isResuming) return;
    beginOpening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { blocks, pending, choose, retry };
}
