'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useConfirm } from '../../../src/ui/dialogs';

// The existing src/App.tsx editor. Pulls in transformers.js, Monaco,
// TipTap, and other client-only bundles — load without SSR so the
// server build never touches them.
const App = dynamic(() => import('../../../src/App'), {
  ssr: false,
});

type PublishState = {
  publishedAt: string | null;
  publishedVersionId: string | null;
  publishing: boolean;
  error: string | null;
};

// Owns the publish state and hands callbacks + site metadata into <App />
// via the `chrome` prop. The existing TopBar inside App renders the
// controls so there's a single header (avoids the z-index / stacking
// conflict with Mantine AppShell's sticky header).
export function SiteEditor({
  siteId,
  siteName,
  siteSlug,
  role,
  initialPublishedAt,
  initialPublishedVersionId,
}: {
  siteId: string;
  siteName: string;
  siteSlug: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  initialPublishedAt: string | null;
  initialPublishedVersionId: string | null;
}) {
  const [state, setState] = useState<PublishState>({
    publishedAt: initialPublishedAt,
    publishedVersionId: initialPublishedVersionId,
    publishing: false,
    error: null,
  });
  const confirmDialog = useConfirm();

  const publish = useCallback(async () => {
    setState((s) => ({ ...s, publishing: true, error: null }));
    const res = await fetch(`/api/sites/${siteId}/publish`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setState((s) => ({
        ...s,
        publishing: false,
        error: body?.error ?? `HTTP ${res.status}`,
      }));
      return;
    }
    const body = (await res.json()) as {
      result: { publishedAt: string; versionId: string };
    };
    setState({
      publishedAt: body.result.publishedAt,
      publishedVersionId: body.result.versionId,
      publishing: false,
      error: null,
    });
  }, [siteId]);

  const unpublish = useCallback(async () => {
    const ok = await confirmDialog({
      title: 'Take this site offline?',
      message:
        'Visitors will see 404 until you republish. Drafts and files stay intact.',
      confirmLabel: 'Unpublish',
      danger: true,
    });
    if (!ok) return;
    setState((s) => ({ ...s, publishing: true, error: null }));
    const res = await fetch(`/api/sites/${siteId}/publish`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setState((s) => ({
        ...s,
        publishing: false,
        error: body?.error ?? `HTTP ${res.status}`,
      }));
      return;
    }
    setState({
      publishedAt: null,
      publishedVersionId: null,
      publishing: false,
      error: null,
    });
  }, [siteId, confirmDialog]);

  const onVersionChanged = useCallback((publishedAt: string, versionId: string) => {
    setState((s) => ({ ...s, publishedAt, publishedVersionId: versionId }));
  }, []);

  return (
    <App
      siteId={siteId}
      chrome={{
        dashboardHref: '/dashboard',
        siteId,
        siteName,
        siteSlug,
        role,
        publishedAt: state.publishedAt,
        publishedVersionId: state.publishedVersionId,
        publishing: state.publishing,
        onPublish: publish,
        onUnpublish: unpublish,
        onVersionChanged,
      }}
    />
  );
}
