import { useCallback, useEffect, useRef, useState } from 'react';
import type { SiteState } from './files';
import {
  deleteFileFromServer,
  loadSiteFromServer,
  saveChatLocal,
  updateSiteMeta,
  writeFileToServer,
  type ServerSiteMeta,
} from './serverFiles';
import { isBinaryPath } from './paths';

// React hook backing the editor with server-side storage. Returns the
// SiteState + an updater, just like useState — but each update diffs
// against the last-synced snapshot and schedules PUT/DELETE calls to
// the /api/sites/:id/files endpoints.
//
// Why diffing instead of a full PUT on every change? The editor mutates
// on every keystroke. Diffing gets us O(changed-files) network calls
// instead of O(all-files) per save.

type Status = 'loading' | 'ready' | 'error';

export type UseServerSite = {
  status: Status;
  meta: ServerSiteMeta | null;
  site: SiteState | null;
  setSite: (updater: SiteState | ((s: SiteState) => SiteState)) => void;
  /** Refetch the site from the server — used after an out-of-band write
   *  (asset upload) so the editor sees the new file without a reload. */
  reload: () => Promise<void>;
  error: string | null;
  saving: boolean;
  lastSavedAt: number | null;
};

const DEBOUNCE_MS = 600;

export function useServerSite(siteId: string): UseServerSite {
  const [status, setStatus] = useState<Status>('loading');
  const [meta, setMeta] = useState<ServerSiteMeta | null>(null);
  const [site, setSiteState] = useState<SiteState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // What the server most-recently acknowledged. Diffing baseline.
  const syncedFilesRef = useRef<Record<string, string>>({});
  // What we want on the server. Gets replaced on every setSite().
  const pendingRef = useRef<Record<string, string> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);

  // Load on mount / siteId change.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    loadSiteFromServer(siteId)
      .then(({ meta: m, state }) => {
        if (cancelled) return;
        setMeta(m);
        setSiteState(state);
        syncedFilesRef.current = { ...state.files };
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const flush = useCallback(async () => {
    if (inflightRef.current) return; // another flush in flight; it'll see fresh pending
    const desired = pendingRef.current;
    if (!desired) return;
    pendingRef.current = null;
    inflightRef.current = true;
    setSaving(true);
    try {
      const current = syncedFilesRef.current;
      const changes: Array<[string, string]> = [];
      const deletes: string[] = [];
      for (const [path, content] of Object.entries(desired)) {
        if (isBinaryPath(path)) continue; // binary bytes live on the server only
        if (current[path] !== content) changes.push([path, content]);
      }
      for (const path of Object.keys(current)) {
        if (path in desired) continue;
        // Binary assets still get deleted through the same endpoint —
        // the DELETE route is byte-agnostic.
        deletes.push(path);
      }
      await Promise.all([
        ...changes.map(([p, c]) => writeFileToServer(siteId, p, c)),
        ...deletes.map((p) => deleteFileFromServer(siteId, p)),
      ]);
      syncedFilesRef.current = { ...desired };
      setLastSavedAt(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
      inflightRef.current = false;
      // A setSite() may have landed while we were saving.
      if (pendingRef.current) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(flush, 0);
      }
    }
  }, [siteId]);

  const setSite = useCallback<UseServerSite['setSite']>(
    (updater) => {
      setSiteState((prev) => {
        if (!prev) return prev;
        const next =
          typeof updater === 'function'
            ? (updater as (s: SiteState) => SiteState)(prev)
            : updater;
        // Persist chat locally right away — not debounced, not server-synced.
        if (next.chatHistory !== prev.chatHistory) {
          saveChatLocal(siteId, next.chatHistory);
        }
        // Queue file map for save if it actually changed.
        if (next.files !== prev.files) {
          pendingRef.current = next.files;
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(flush, DEBOUNCE_MS);
        }
        // Template changes are small + infrequent — PATCH them
        // immediately rather than debouncing, so a refresh right after
        // clicking a template card lands on the new selection.
        if (next.templateId !== prev.templateId) {
          setMeta((m) => (m ? { ...m, templateId: next.templateId } : m));
          updateSiteMeta(siteId, { templateId: next.templateId }).catch((e) => {
            setError(e instanceof Error ? e.message : String(e));
          });
        }
        return next;
      });
    },
    [siteId, flush],
  );

  // Flush on unmount so the last change isn't lost.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) {
        // Fire-and-forget; page nav doesn't wait on us.
        void flush();
      }
    };
  }, [flush]);

  const reload = useCallback(async () => {
    const { meta: m, state } = await loadSiteFromServer(siteId);
    // Merge: preserve pending edits the user has made locally (we
    // don't want a refetch to blow away un-synced keystrokes), but
    // pick up any new server-side files (e.g. just-uploaded images).
    syncedFilesRef.current = { ...state.files };
    setMeta(m);
    setSiteState((prev) => {
      if (!prev) return state;
      const mergedFiles: Record<string, string> = { ...state.files };
      for (const [path, content] of Object.entries(prev.files)) {
        // Local edits to text files win — the user's typing isn't on
        // the server yet. Binary-asset entries are always taken from
        // the freshly-loaded server snapshot.
        if (!isBinaryPath(path)) mergedFiles[path] = content;
      }
      return { ...prev, files: mergedFiles };
    });
  }, [siteId]);

  return {
    status,
    meta,
    site,
    setSite,
    reload,
    error,
    saving,
    lastSavedAt,
  };
}
