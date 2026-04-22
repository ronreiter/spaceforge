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
};

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generator: any = await pipeline('text-generation', model.id, {
    device: 'webgpu',
    dtype: model.dtype,
    progress_callback: (p: ProgressInfo) => onProgress(p),
  } as unknown as Record<string, unknown>);

  await ensureChatTemplate(generator.tokenizer, model.id);

  return {
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
        throw err;
      }
    },
  };
}
