import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runGenerationLoop } from '../../lib/generate/loop';
import type { ModelCalls } from '../../lib/generate/model';
import type { LoopEvent, Plan, CriticVerdict } from '../../lib/generate/types';
import type { FileEntry } from '../../lib/sites/files';

// Stub the two service-layer side-effects the loop performs. We test the
// orchestration here; the file-I/O primitives have their own tests.
const writeFileMock = vi.fn<
  (siteId: string, path: string, content: string) => Promise<FileEntry>
>();
const listFilesMock = vi.fn<(siteId: string) => Promise<FileEntry[]>>();
const touchSiteMock = vi.fn<(siteId: string) => Promise<void>>();

vi.mock('../../lib/sites/files', () => ({
  writeFile: (...args: Parameters<typeof writeFileMock>) =>
    writeFileMock(...args),
  listFiles: (...args: Parameters<typeof listFilesMock>) =>
    listFilesMock(...args),
}));
vi.mock('../../lib/sites/service', () => ({
  touchSite: (...args: Parameters<typeof touchSiteMock>) =>
    touchSiteMock(...args),
}));

function makeModels(overrides: {
  plan: Plan;
  fileContent?: (path: string) => string;
  verdicts: CriticVerdict[];
}): ModelCalls {
  let i = 0;
  return {
    async plan() {
      return overrides.plan;
    },
    async writeFile({ file }) {
      return overrides.fileContent
        ? overrides.fileContent(file.path)
        : `content of ${file.path}`;
    },
    async review() {
      const v = overrides.verdicts[Math.min(i, overrides.verdicts.length - 1)];
      i += 1;
      return v;
    },
  };
}

function fakeEntry(path: string, content: string): FileEntry {
  return {
    path,
    size: new TextEncoder().encode(content).byteLength,
    contentHash: 'hash',
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  writeFileMock.mockReset();
  listFilesMock.mockReset();
  touchSiteMock.mockReset();

  const state: FileEntry[] = [];
  writeFileMock.mockImplementation(async (_sid, path, content) => {
    const e = fakeEntry(path, content);
    state.push(e);
    return e;
  });
  listFilesMock.mockImplementation(async () => [...state]);
  touchSiteMock.mockResolvedValue();
});

afterEach(() => vi.restoreAllMocks());

describe('runGenerationLoop', () => {
  it('writes every planned file in order then stops on critic_complete', async () => {
    const events: LoopEvent[] = [];
    const result = await runGenerationLoop({
      siteId: 'site-1',
      userPrompt: 'A portfolio for Ana',
      models: makeModels({
        plan: {
          summary: 'Ana portfolio',
          files: [
            { path: '_layout.njk', intent: 'base layout' },
            { path: 'index.md', intent: 'home page' },
            { path: 'styles.css', intent: 'styles' },
          ],
        },
        // Critic says complete on the 3rd review (after styles.css).
        verdicts: [
          { complete: false, feedback: '', add_files: [] },
          { complete: false, feedback: '', add_files: [] },
          { complete: true, feedback: '', add_files: [] },
        ],
      }),
      onEvent: (e) => {
        events.push(e);
      },
    });

    expect(result.reason).toBe('critic_complete');
    expect(result.filesWritten).toEqual([
      '_layout.njk',
      'index.md',
      'styles.css',
    ]);
    expect(writeFileMock).toHaveBeenCalledTimes(3);
    expect(touchSiteMock).toHaveBeenCalledWith('site-1');

    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toEqual([
      'plan',
      'step_start',
      'file_written',
      'critic',
      'step_start',
      'file_written',
      'critic',
      'step_start',
      'file_written',
      'critic',
      'done',
    ]);
  });

  it('appends critic-added files to the queue and stops once done', async () => {
    const result = await runGenerationLoop({
      siteId: 'site-2',
      userPrompt: 'A bakery site',
      models: makeModels({
        plan: {
          summary: 'Bakery',
          files: [{ path: 'index.md', intent: 'home' }],
        },
        verdicts: [
          // After writing index.md, critic spots a missing layout and queues it.
          {
            complete: false,
            feedback: 'Missing _layout.njk referenced by index.md.',
            add_files: [{ path: '_layout.njk', intent: 'base layout' }],
          },
          // After the layout is written, the critic is satisfied.
          { complete: true, feedback: '', add_files: [] },
        ],
      }),
      onEvent: () => {},
    });

    expect(result.reason).toBe('critic_complete');
    expect(result.filesWritten).toEqual(['index.md', '_layout.njk']);
  });

  it('terminates on step cap', async () => {
    const result = await runGenerationLoop({
      siteId: 'site-3',
      userPrompt: 'X',
      models: makeModels({
        plan: {
          summary: 'X',
          files: Array.from({ length: 10 }, (_, i) => ({
            path: `page-${i}.md`,
            intent: `page ${i}`,
          })),
        },
        // Never happy.
        verdicts: [{ complete: false, feedback: 'keep going', add_files: [] }],
      }),
      maxIterations: 3,
      onEvent: () => {},
    });

    expect(result.reason).toBe('step_cap');
    expect(result.iterations).toBe(3);
    expect(result.filesWritten).toHaveLength(3);
  });

  it('terminates with queue_empty_no_critic when queue empties without a complete verdict', async () => {
    const result = await runGenerationLoop({
      siteId: 'site-4',
      userPrompt: 'X',
      models: makeModels({
        plan: {
          summary: 'X',
          files: [{ path: 'index.md', intent: 'home' }],
        },
        verdicts: [{ complete: false, feedback: '', add_files: [] }],
      }),
      onEvent: () => {},
    });

    expect(result.reason).toBe('queue_empty_no_critic');
    expect(result.filesWritten).toEqual(['index.md']);
  });

  it('does not re-queue a path the critic names if it already exists', async () => {
    const result = await runGenerationLoop({
      siteId: 'site-5',
      userPrompt: 'X',
      models: makeModels({
        plan: {
          summary: 'X',
          files: [{ path: 'index.md', intent: 'home' }],
        },
        verdicts: [
          {
            complete: false,
            feedback: '',
            add_files: [{ path: 'index.md', intent: 'rewrite home' }],
          },
          { complete: true, feedback: '', add_files: [] },
        ],
      }),
      onEvent: () => {},
    });

    expect(result.filesWritten).toEqual(['index.md']);
    // Second verdict is `complete: true`, so the loop ends on critic_complete
    // once the dupe has been filtered out and the queue is empty.
    expect(result.reason).toBe('critic_complete');
  });

  it('respects maxAddedFiles', async () => {
    const result = await runGenerationLoop({
      siteId: 'site-6',
      userPrompt: 'X',
      models: makeModels({
        plan: {
          summary: 'X',
          files: [{ path: 'index.md', intent: 'home' }],
        },
        verdicts: [
          {
            complete: false,
            feedback: '',
            add_files: [
              { path: 'a.md', intent: 'a' },
              { path: 'b.md', intent: 'b' },
              { path: 'c.md', intent: 'c' },
            ],
          },
          { complete: true, feedback: '', add_files: [] },
        ],
      }),
      maxAddedFiles: 1,
      onEvent: () => {},
    });

    // Only one of the three add_files should have been picked up.
    expect(result.filesWritten).toEqual(['index.md', 'a.md']);
  });
});
