import type { NextConfig } from 'next';

// COOP/COEP headers are required to use SharedArrayBuffer / WebGPU — the
// HuggingFace transformers runtime needs them for multi-threaded ONNX
// inference in the browser. Vite dev applied these via `server.headers`;
// Next.js applies them via next.config headers.
const crossOriginIsolationHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

const nextConfig: NextConfig = {
  // @huggingface/transformers is a browser-only package (WebGPU, ONNX wasm).
  // Marking it external keeps Next.js from trying to bundle it for the Node
  // server build — our usage of it is guarded behind 'use client' anyway.
  serverExternalPackages: ['@huggingface/transformers'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: crossOriginIsolationHeaders,
      },
    ];
  },
};

export default nextConfig;
