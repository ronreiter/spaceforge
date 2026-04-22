'use client';

import dynamic from 'next/dynamic';

// The editor pulls in @huggingface/transformers, Monaco, TipTap, and a
// bunch of client-only DOM APIs. Load it without SSR so the server build
// never touches these modules.
const App = dynamic(() => import('../src/App'), {
  ssr: false,
});

export default function Page() {
  return <App />;
}
