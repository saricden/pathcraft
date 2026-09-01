import { useEffect, useRef, useState } from 'react';

function basename(path) {
  return path?.split('/').pop() ?? '';
}

function backendConfig(backend) {
  return backend === 'gpu'
    ? { device: 'webgpu', dtype: 'q4f16' }
    : { device: 'wasm', dtype: 'q8' };
}

async function detectBackend() {
  if (!navigator.gpu) return 'cpu';
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter ? 'gpu' : 'cpu';
  } catch {
    return 'cpu';
  }
}

export function useModelInstall() {
  // checking | idle | installing | ready | error
  const [status, setStatus] = useState('checking');
  const [backend, setBackend] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const workerRef = useRef(null);
  const retriedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    detectBackend().then((detected) => {
      if (cancelled) return;
      setBackend(detected);
      setStatus('idle');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  function runInstall(activeBackend) {
    setProgress(0);
    setStatusText('Waking the storyteller…');

    workerRef.current?.terminate();
    const worker = new Worker(new URL('../workers/llmWorker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const handleFailure = (message) => {
      if (activeBackend === 'gpu' && !retriedRef.current) {
        retriedRef.current = true;
        setBackend('cpu');
        runInstall('cpu');
        return;
      }
      setStatusText(message || 'Something went wrong installing the model.');
      setStatus('error');
    };

    worker.onmessage = (event) => {
      const data = event.data;
      switch (data.status) {
        case 'ready':
          setProgress(1);
          setStatus('ready');
          break;
        case 'error':
          handleFailure(data.error);
          break;
        case 'progress_total':
          setProgress(Math.min(1, data.progress / 100));
          break;
        case 'initiate':
          setStatusText(`Fetching ${basename(data.file)}…`);
          break;
        case 'progress':
          setStatusText(`Fetching ${basename(data.file)} — ${Math.round(data.progress)}%`);
          break;
        default:
          break;
      }
    };

    worker.onerror = (event) => handleFailure(event.message);

    const { device, dtype } = backendConfig(activeBackend);
    worker.postMessage({ type: 'load', device, dtype });
  }

  function install() {
    if (status === 'installing' || status === 'ready') return;
    retriedRef.current = false;
    setStatus('installing');
    runInstall(backend);
  }

  return { status, backend, progress, statusText, install, worker: workerRef };
}
