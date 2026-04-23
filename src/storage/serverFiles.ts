import { CUSTOM_TEMPLATE_ID } from '../templates/registry';
import type { SiteState, ChatMessage } from './files';

// Client-side adapter over the /api/sites/:id endpoints. Returns the same
// SiteState shape the editor already uses, so the existing reducers
// (writeFile / deleteFile / setTemplate) work unchanged — only the load
// and save paths differ.
//
// Chat history still lives in localStorage keyed per-site for now; it
// moves to /api/sites/:id/messages in a later phase.

export type ServerSiteMeta = {
  id: string;
  name: string;
  slug: string;
  templateId: string;
  publishedAt: string | null;
};

type ApiSite = {
  id: string;
  name: string;
  slug: string;
  templateId: string;
  publishedAt: string | null;
};

type ApiFile = {
  path: string;
  content: string;
  size: number;
  contentHash: string;
  updatedAt: string;
};

type ApiFileEntry = {
  path: string;
  size: number;
  contentHash: string;
  updatedAt: string;
};

function chatKey(siteId: string): string {
  return `spaceforge:site:${siteId}:chat`;
}

function loadChatLocal(siteId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(chatKey(siteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ChatMessage =>
        typeof x === 'object' &&
        x !== null &&
        'role' in x &&
        'content' in x,
    );
  } catch {
    return [];
  }
}

export function saveChatLocal(siteId: string, chat: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(chatKey(siteId), JSON.stringify(chat));
  } catch {
    // storage full / disabled — ignore silently
  }
}

export async function loadSiteFromServer(siteId: string): Promise<{
  meta: ServerSiteMeta;
  state: SiteState;
}> {
  const [siteRes, filesRes] = await Promise.all([
    fetch(`/api/sites/${siteId}`, { credentials: 'same-origin' }),
    fetch(`/api/sites/${siteId}/files`, { credentials: 'same-origin' }),
  ]);
  if (!siteRes.ok) {
    throw new Error(`Failed to load site: HTTP ${siteRes.status}`);
  }
  if (!filesRes.ok) {
    throw new Error(`Failed to list files: HTTP ${filesRes.status}`);
  }
  const { site } = (await siteRes.json()) as { site: ApiSite };
  const { files: entries } = (await filesRes.json()) as {
    files: ApiFileEntry[];
  };

  // Fetch each file's content in parallel. Per-site file count is small
  // today (handful of pages + partials + styles) — this is fine.
  const contents = await Promise.all(
    entries.map(async (e): Promise<[string, string]> => {
      const res = await fetch(
        `/api/sites/${siteId}/files/${encodeFilePath(e.path)}`,
        { credentials: 'same-origin' },
      );
      if (!res.ok) throw new Error(`Failed to read ${e.path}: HTTP ${res.status}`);
      const body = (await res.json()) as { file: ApiFile };
      return [e.path, body.file.content];
    }),
  );

  const now = Date.now();
  return {
    meta: {
      id: site.id,
      name: site.name,
      slug: site.slug,
      templateId: site.templateId || CUSTOM_TEMPLATE_ID,
      publishedAt: site.publishedAt,
    },
    state: {
      files: Object.fromEntries(contents),
      chatHistory: loadChatLocal(siteId),
      model: '',
      templateId: site.templateId || CUSTOM_TEMPLATE_ID,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export async function writeFileToServer(
  siteId: string,
  path: string,
  content: string,
): Promise<void> {
  const res = await fetch(
    `/api/sites/${siteId}/files/${encodeFilePath(path)}`,
    {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
}

export async function deleteFileFromServer(
  siteId: string,
  path: string,
): Promise<void> {
  const res = await fetch(
    `/api/sites/${siteId}/files/${encodeFilePath(path)}`,
    { method: 'DELETE', credentials: 'same-origin' },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function updateSiteMeta(
  siteId: string,
  patch: { templateId?: string; name?: string },
): Promise<void> {
  const res = await fetch(`/api/sites/${siteId}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
}

function encodeFilePath(path: string): string {
  // Preserve forward slashes for the catch-all [...path] segment; encode
  // each piece for safety against `?`, `#`, spaces, unicode.
  return path.split('/').map(encodeURIComponent).join('/');
}
