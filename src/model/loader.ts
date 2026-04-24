import { pipeline, TextStreamer, env } from '@huggingface/transformers';
import type { ModelEntry } from './registry';

env.allowLocalModels = false;

export type ProgressInfo = {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  file?: string;
  loaded?: number;
  total?: number;
};

export type Generator = {
  generate: (
    messages: { role: string; content: string }[],
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
  /** Present when model loading or generation hit a device we had to
   *  fall back from. The UI should surface this so the user knows
   *  why tokens are coming out slowly. */
  warning?: string;
};

// Classify errors the WebGPU backend throws when it can't compile a
// shader. We retry these on the wasm backend (CPU) — much slower but
// always correct. Chrome 136+ is stricter about storage-buffer
// alignment and some transformers.js compute graphs trip it.
const WEBGPU_FATAL_RE =
  /unaligned access|storage buffer|shader|compile|WGSL|not support|adapter|WebGPU is not supported/i;

function isWebGpuFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return WEBGPU_FATAL_RE.test(msg);
}

// Some repos (e.g. onnx-community/gemma-4-E*B-it-ONNX) keep their chat
// template in a sidecar chat_template.jinja file instead of embedding it
// in tokenizer_config.json. transformers.js only looks at the embedded
// field, so apply_chat_template() blows up. Fetch the sidecar when the
// tokenizer loaded without a template.
async function ensureChatTemplate(tokenizer: {
  chat_template?: string;
}, modelId: string): Promise<void> {
  if (tokenizer.chat_template) return;
  const url = `https://huggingface.co/${modelId}/resolve/main/chat_template.jinja`;
  const resp = await fetch(url);
  if (!resp.ok) return; // leave it unset; generate() will raise a clear error
  tokenizer.chat_template = await resp.text();
}

export async function loadModel(
  model: ModelEntry,
  onProgress: (p: ProgressInfo) => void,
): Promise<Generator> {
  const opts = {
    dtype: model.dtype,
    progress_callback: (p: ProgressInfo) => onProgress(p),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let generator: any;
  let deviceUsed: 'webgpu' | 'wasm' = 'webgpu';
  let warning: string | undefined;
  try {
    generator = await pipeline('text-generation', model.id, {
      device: 'webgpu',
      ...opts,
    } as unknown as Record<string, unknown>);
  } catch (err) {
    if (!isWebGpuFailure(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[loader] WebGPU failed for ${model.id}: ${msg}. Retrying on wasm (CPU).`,
    );
    deviceUsed = 'wasm';
    warning =
      'WebGPU is not usable on this browser right now (shader compile failed). Running on CPU — expect multi-second pauses between tokens. Update Chrome to 136+ or try a different model for the usual GPU-backed speed.';
    generator = await pipeline('text-generation', model.id, {
      device: 'wasm',
      ...opts,
    } as unknown as Record<string, unknown>);
  }

  await ensureChatTemplate(generator.tokenizer, model.id);

  return {
    warning,
    async generate(messages, onToken, signal) {
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => onToken(text),
      });

      try {
        await generator(messages, {
          max_new_tokens: 32768,
          do_sample: true,
          temperature: 0.6,
          top_p: 0.9,
          streamer,
          signal,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/chat_template/i.test(msg)) {
          throw new Error(
            `"${model.label}" (${model.id}) has no chat template in its tokenizer — pick a different model from the dropdown (instruction-tuned variants end in "-it" or "-Instruct").`,
          );
        }
        // A WebGPU-specific failure that escaped pipeline init and
        // only showed up at generate time — surface a friendlier
        // error than the raw WGSL validation message.
        if (deviceUsed === 'webgpu' && isWebGpuFailure(err)) {
          throw new Error(
            `This model hit a WebGPU shader error on your browser. Refresh the page and try a different model, or update Chrome to 136+. Raw error: ${msg}`,
          );
        }
        throw err;
      }
    },
  };
}
