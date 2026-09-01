import { pipeline, TextStreamer } from '@huggingface/transformers';

class PipelineSingleton {
  static task = 'text-generation';
  static model = 'onnx-community/Llama-3.2-1B-Instruct-ONNX';
  static instance = null;

  static async getInstance(device, dtype, progress_callback) {
    this.instance ??= pipeline(this.task, this.model, { device, dtype, progress_callback });
    return this.instance;
  }
}

async function handleLoad(data) {
  const { device, dtype } = data;
  try {
    await PipelineSingleton.getInstance(device, dtype, (info) => {
      self.postMessage(info);
    });
    self.postMessage({ status: 'ready' });
  } catch (err) {
    self.postMessage({ status: 'error', error: err?.message || String(err) });
  }
}

async function handleGenerate(data) {
  try {
    const generator = await PipelineSingleton.getInstance();
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text) => self.postMessage({ status: 'stream', text }),
    });

    const output = await generator(data.messages, {
      max_new_tokens: data.maxNewTokens ?? 100,
      do_sample: true,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.15,
      streamer,
    });

    const text = output[0]?.generated_text?.at(-1)?.content ?? '';
    self.postMessage({ status: 'complete', text });
  } catch (err) {
    self.postMessage({ status: 'error', error: err?.message || String(err) });
  }
}

self.addEventListener('message', (event) => {
  if (event.data.type === 'load') {
    handleLoad(event.data);
  } else if (event.data.type === 'generate') {
    handleGenerate(event.data);
  }
});
