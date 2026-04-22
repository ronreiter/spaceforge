'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// The existing src/App.tsx editor. Pulls in transformers.js, Monaco,
// TipTap, and other client-only bundles — load without SSR so the
// server build never touches them.
const App = dynamic(() => import('../../../src/App'), {
  ssr: false,
});

type PublishState = {
  publishedAt: string | null;
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
}: {
  siteId: string;
  siteName: string;
  siteSlug: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  initialPublishedAt: string | null;
}) {
  const [state, setState] = useState<PublishState>({
    publishedAt: initialPublishedAt,
    publishing: false,
    error: null,
  });

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
    const body = (await res.json()) as { result: { publishedAt: string } };
    setState({ publishedAt: body.result.publishedAt, publishing: false, error: null });
  }, [siteId]);

  const unpublish = useCallback(async () => {
    if (!confirm('Take this site offline? Visitors will see 404 until you republish.')) return;
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
    setState({ publishedAt: null, publishing: false, error: null });
  }, [siteId]);

  return (
    <App
      siteId={siteId}
      chrome={{
        dashboardHref: '/dashboard',
        siteName,
        siteSlug,
        role,
        publishedAt: state.publishedAt,
        publishing: state.publishing,
        onPublish: publish,
        onUnpublish: unpublish,
      }}
    />
  );
}
