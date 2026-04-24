import { z } from 'zod';

// Planner output: an ordered list of files to generate, each with a brief
// intent string the executor uses as the per-file spec.

export const plannedFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      'Site-relative file path. Content pages use .md; layouts/partials use .njk (names starting with "_"); styles use .css.',
    ),
  intent: z
    .string()
    .min(1)
    .describe('One to two sentences describing what this file should contain.'),
});

export const planSchema = z.object({
  summary: z
    .string()
    .describe('A one-paragraph summary of the site being built.'),
  templateId: z
    .string()
    .describe(
      'Id of a pre-made visual template from the catalog (preferred), or "custom" only if no template fits. Default to picking a template.',
    ),
  files: z
    .array(plannedFileSchema)
    .min(1)
    .max(20)
    .describe(
      'Files to generate in order. Start with layout partials, then content pages. Skip styles.css when a pre-made template is chosen — the template provides it.',
    ),
});

export type Plan = z.infer<typeof planSchema>;
export type PlannedFile = z.infer<typeof plannedFileSchema>;

// Critic output: reviewed after each file is written. If the critic returns
// `complete: true` AND the todo queue is empty, the loop stops. Otherwise it
// can mutate the queue (add files, change intent) and emit feedback the
// executor sees on the next iteration.

export const criticVerdictSchema = z.object({
  complete: z
    .boolean()
    .describe(
      'True if the site is fully built and every page renders standalone. False if anything is missing, broken, or inconsistent.',
    ),
  feedback: z
    .string()
    .describe(
      'Short (1-3 sentence) note the executor will see on its next iteration. Empty string if everything is fine.',
    ),
  add_files: z
    .array(plannedFileSchema)
    .default([])
    .describe(
      'Files the critic wants added to the queue (e.g. a missing partial). Empty if nothing needs adding.',
    ),
});

export type CriticVerdict = z.infer<typeof criticVerdictSchema>;

// SSE events streamed back to the client. The shape is deliberately narrow
// so the UI can render a timeline without doing any interpretation.

export type LoopEvent =
  | { type: 'plan'; plan: Plan }
  | { type: 'step_start'; iter: number; file: PlannedFile }
  | {
      type: 'file_written';
      iter: number;
      path: string;
      size: number;
    }
  | { type: 'critic'; iter: number; verdict: CriticVerdict }
  | { type: 'error'; message: string }
  | {
      type: 'done';
      iterations: number;
      filesWritten: string[];
      reason: 'critic_complete' | 'step_cap' | 'queue_empty_no_critic';
    };
