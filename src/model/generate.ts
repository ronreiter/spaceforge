import { StreamParser, type ParserEvent } from '../parser/streamParser';
import type { Generator } from './loader';
import { buildGemmaSystemPrompt } from './systemPrompt.gemma';
import { buildQwenSystemPrompt } from './systemPrompt.qwen';
import type { ModelEntry } from './registry';
import type { SiteState, ChatMessage } from '../storage/files';

export type GenerateHandlers = {
  onProse: (chunk: string) => void;
  onFileStart: (path: string) => void;
  onFileChunk: (path: string, text: string) => void;
  onFileEnd: (path: string) => void;
  onFileTruncated: (path: string) => void;
  onComplete: () => void;
  onError: (err: Error) => void;
};

export async function runGeneration(
  generator: Generator,
  model: ModelEntry,
  state: SiteState,
  userMessage: string,
  handlers: GenerateHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const systemPrompt =
    model.family === 'gemma' ? buildGemmaSystemPrompt(state) : buildQwenSystemPrompt(state);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...state.chatHistory,
    { role: 'user', content: userMessage },
  ];

  const parser = new StreamParser((e: ParserEvent) => {
    switch (e.type) {
      case 'prose':
        handlers.onProse(e.text);
        break;
      case 'file-start':
        handlers.onFileStart(e.path);
        break;
      case 'file-chunk':
        handlers.onFileChunk(e.path, e.text);
        break;
      case 'file-end':
        handlers.onFileEnd(e.path);
        break;
      case 'file-truncated':
        handlers.onFileTruncated(e.path);
        break;
    }
  });

  try {
    await generator.generate(messages, (token) => parser.feed(token), signal);
    parser.end();
    handlers.onComplete();
  } catch (err) {
    handlers.onError(err as Error);
  }
}
