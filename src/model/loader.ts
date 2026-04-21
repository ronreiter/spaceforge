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

  return {
    async generate(messages, onToken, signal) {
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => onToken(text),
      });

      await generator(messages, {
        max_new_tokens: 4096,
        do_sample: true,
        temperature: 0.6,
        top_p: 0.9,
        streamer,
        signal,
      });
    },
  };
}
