import { useEffect, useRef, useState } from 'react';
import {
  NARRATIVE_MAX_TOKENS,
  OPTIONS_MAX_TOKENS,
  FALLBACK_NARRATIVE,
  buildOpeningNarrativeMessages,
  buildNarrativeMessages,
  buildOptionsMessages,
  cleanNarrative,
  extractOptions,
  padOptions,
} from '../lib/storyEngine';

const FRIENDLY_GENERATION_ERROR =
  'Something interrupted the story on this device. Tap Try Again to continue.';

export function useAdventure(workerRef, backend, reloadOnCpu) {
  const [blocks, setBlocks] = useState([]);
  const [pending, setPending] = useState({ phase: 'thinking', text: '', error: null });
  const nextIdRef = useRef(0);
  const lastTurnRef = useRef(null); // { blocks, isOpening }
  const openingStartedRef = useRef(false);
  const fallbackAttemptedRef = useRef(false);
  const narrativeRetriedRef = useRef(false);
  const optionsRetriedRef = useRef(false);

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

  function runOptionsStage(updatedBlocks, sentence) {
    setPending({ phase: 'choosing', text: sentence, error: null });

    const worker = workerRef.current;
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.status === 'complete') {
        const extracted = extractOptions(data.text);
        // Content-level retry: a completely empty result is worth one more
        // attempt before settling for generic fallback options.
        if (extracted.length === 0 && !optionsRetriedRef.current) {
          optionsRetriedRef.current = true;
          runOptionsStage(updatedBlocks, sentence);
          return;
        }
        const options = padOptions(extracted);
        const block = { id: nextIdRef.current++, narrative: sentence, options, chosenIndex: null };
        setBlocks((prev) => [...prev, block]);
        setPending(null);
      } else if (data.status === 'error') {
        withGpuFallback(() => runOptionsStage(updatedBlocks, sentence));
      }
    };

    worker.postMessage({
      type: 'generate',
      messages: buildOptionsMessages(updatedBlocks, sentence),
      maxNewTokens: OPTIONS_MAX_TOKENS,
    });
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
    optionsRetriedRef.current = false;
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
    beginOpening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { blocks, pending, choose, retry };
}
