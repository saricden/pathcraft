import { pipeline } from '@huggingface/transformers';

class PipelineSingleton {
  static task = 'text-generation';
  static model = 'onnx-community/Llama-3.2-1B-Instruct-ONNX';
  static instance = null;

  static async getInstance(device, dtype, progress_callback) {
    this.instance ??= pipeline(this.task, this.model, { device, dtype, progress_callback });
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  if (event.data.type !== 'load') return;

  const { device, dtype } = event.data;

  try {
    await PipelineSingleton.getInstance(device, dtype, (info) => {
      self.postMessage(info);
    });
    self.postMessage({ status: 'ready' });
  } catch (err) {
    self.postMessage({ status: 'error', error: err?.message || String(err) });
  }
});
