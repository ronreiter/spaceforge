import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import {
  planSchema,
  criticVerdictSchema,
  type Plan,
  type CriticVerdict,
  type PlannedFile,
} from './types';
import {
  PLANNER_SYSTEM,
  executorSystem,
  executorPrompt,
  criticSystem,
  criticPrompt,
} from './prompts';
import type { FileEntry } from '../sites/files';

// Thin wrappers over the three model roles. All three route through the
// Vercel AI Gateway via a model string — no provider-specific import — so
// the same code path works in preview and production without a client
// swap, and the executor/critic can be pointed at different models via env
// (useful when the executor is intentionally small and fast).
//
// The ModelCalls interface lets tests substitute deterministic fakes.

export type ModelCalls = {
  plan(opts: { userPrompt: string }): Promise<Plan>;
  writeFile(opts: {
    siteSummary: string;
    manifest: FileEntry[];
    feedback: string[];
    file: PlannedFile;
  }): Promise<string>;
  review(opts: {
    siteSummary: string;
    manifest: FileEntry[];
    lastWritten: { path: string; content: string } | null;
    queueRemaining: PlannedFile[];
  }): Promise<CriticVerdict>;
};

export type ModelConfig = {
  plannerModel?: string;
  executorModel?: string;
  criticModel?: string;
};

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

export function gatewayModelCalls(cfg: ModelConfig = {}): ModelCalls {
  const planner = cfg.plannerModel ?? DEFAULT_MODEL;
  const executor = cfg.executorModel ?? DEFAULT_MODEL;
  const critic = cfg.criticModel ?? DEFAULT_MODEL;

  return {
    async plan({ userPrompt }) {
      const { object } = await generateObject({
        model: planner,
        schema: planSchema as unknown as z.ZodType<Plan>,
        system: PLANNER_SYSTEM,
        prompt: userPrompt,
      });
      return object;
    },

    async writeFile({ siteSummary, manifest, feedback, file }) {
      const { text } = await generateText({
        model: executor,
        system: executorSystem({ siteSummary, manifest, feedback }),
        prompt: executorPrompt(file),
      });
      return stripCodeFence(text);
    },

    async review({ siteSummary, manifest, lastWritten, queueRemaining }) {
      const { object } = await generateObject({
        model: critic,
        schema: criticVerdictSchema as unknown as z.ZodType<CriticVerdict>,
        system: criticSystem(siteSummary),
        prompt: criticPrompt({ manifest, lastWritten, queueRemaining }),
      });
      return object;
    },
  };
}

// Small models sometimes wrap their one-file output in a ``` fence despite
// the system prompt. Strip a single leading/trailing fence if we see one,
// otherwise return the text unchanged.
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/;
  const m = fence.exec(trimmed);
  return m ? m[1] : text;
}
