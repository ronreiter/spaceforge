'use client';

import dynamic from 'next/dynamic';

// The existing src/App.tsx editor. Pulls in transformers.js, Monaco,
// TipTap, and other client-only bundles — load without SSR so the
// server build never touches them.
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
  // siteName/slug/role not yet surfaced in the editor chrome — that
  // lands with the TopBar update in a follow-up.
  void siteName;
  void siteSlug;
  void role;
  return <App siteId={siteId} />;
}
