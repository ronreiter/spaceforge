import { listFiles, writeFile } from '../sites/files';
import { touchSite } from '../sites/service';
import type { LoopEvent, PlannedFile } from './types';
import type { ModelCalls } from './model';

export type LoopOptions = {
  siteId: string;
  userPrompt: string;
  models: ModelCalls;
  /** Hard cap on iterations (= files written + critic-only passes). */
  maxIterations?: number;
  /** Cap on extra files the critic is allowed to add beyond the plan. */
  maxAddedFiles?: number;
  /** Called for every streaming event. Return false to abort cooperatively. */
  onEvent: (event: LoopEvent) => void | Promise<void>;
  signal?: AbortSignal;
};

export type LoopResult = {
  iterations: number;
  filesWritten: string[];
  reason: 'critic_complete' | 'step_cap' | 'queue_empty_no_critic';
};

// Runs the plan → write one file → review loop until one of:
//   - critic says complete AND queue is empty                (critic_complete)
//   - max iterations reached                                 (step_cap)
//   - queue empty and critic has nothing to add              (queue_empty_no_critic)
//
// Every file write goes through the existing writeFile() primitive so
// the site_files manifest + draft blob stay in sync with the editor's
// normal PUT path.

export async function runGenerationLoop(opts: LoopOptions): Promise<LoopResult> {
  const maxIterations = opts.maxIterations ?? 15;
  const maxAddedFiles = opts.maxAddedFiles ?? 5;

  if (opts.signal?.aborted) throw new Error('aborted');

  const plan = await opts.models.plan({ userPrompt: opts.userPrompt });
  await opts.onEvent({ type: 'plan', plan });

  const queue: PlannedFile[] = [...plan.files];
  const filesWritten: string[] = [];
  const feedback: string[] = [];
  let addedFiles = 0;
  let iter = 0;

  while (iter < maxIterations) {
    if (opts.signal?.aborted) throw new Error('aborted');
    iter += 1;

    const next = queue.shift() ?? null;
    let lastWritten: { path: string; content: string } | null = null;

    if (next) {
      await opts.onEvent({ type: 'step_start', iter, file: next });
      const content = await opts.models.writeFile({
        siteSummary: plan.summary,
        manifest: await listFiles(opts.siteId),
        feedback,
        file: next,
      });
      const entry = await writeFile(opts.siteId, next.path, content);
      filesWritten.push(next.path);
      lastWritten = { path: next.path, content };
      await opts.onEvent({
        type: 'file_written',
        iter,
        path: entry.path,
        size: entry.size,
      });
    }

    const manifest = await listFiles(opts.siteId);
    const verdict = await opts.models.review({
      siteSummary: plan.summary,
      manifest,
      lastWritten,
      queueRemaining: queue,
    });
    await opts.onEvent({ type: 'critic', iter, verdict });

    if (verdict.feedback && verdict.feedback.trim()) {
      feedback.push(verdict.feedback);
    }
    for (const f of verdict.add_files ?? []) {
      if (addedFiles >= maxAddedFiles) break;
      // Don't re-queue a path already written or already queued.
      if (filesWritten.includes(f.path)) continue;
      if (queue.some((q) => q.path === f.path)) continue;
      queue.push(f);
      addedFiles += 1;
    }

    if (verdict.complete && queue.length === 0) {
      await touchSite(opts.siteId);
      await opts.onEvent({
        type: 'done',
        iterations: iter,
        filesWritten,
        reason: 'critic_complete',
      });
      return { iterations: iter, filesWritten, reason: 'critic_complete' };
    }

    if (!next && queue.length === 0) {
      // Nothing to write and critic didn't add anything — nothing more we can do.
      await touchSite(opts.siteId);
      await opts.onEvent({
        type: 'done',
        iterations: iter,
        filesWritten,
        reason: 'queue_empty_no_critic',
      });
      return { iterations: iter, filesWritten, reason: 'queue_empty_no_critic' };
    }
  }

  await touchSite(opts.siteId);
  await opts.onEvent({
    type: 'done',
    iterations: iter,
    filesWritten,
    reason: 'step_cap',
  });
  return { iterations: iter, filesWritten, reason: 'step_cap' };
}
