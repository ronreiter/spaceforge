'use client';

import dynamic from 'next/dynamic';

// The existing src/App.tsx editor. Pulls in transformers.js, Monaco,
// TipTap, and other client-only bundles — load without SSR so the
// server build never touches them.
//
// Today: src/App imports its state from localStorage, so every
// /sites/:id tab shares the same single-site storage. Next commit
// swaps to /api/sites/:id/files keyed on the prop siteId and the
// read-only state reflects `role`. For this slice we just render the
// editor as-is — proves the routing + auth guard works.
const App = dynamic(() => import('../../../src/App'), {
  ssr: false,
});

export function SiteEditor({
  siteId,
  siteName,
  siteSlug,
  role,
}: {
  siteId: string;
  siteName: string;
  siteSlug: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}) {
  // Props are intentionally unused in this slice — the existing App
  // component reads from localStorage. They'll flow in for real when we
  // replace localStorage with the sites/files API in the next commit.
  void siteId;
  void siteName;
  void siteSlug;
  void role;
  return <App />;
}
