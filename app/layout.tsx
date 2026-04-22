import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import '@mantine/core/styles.css';
import { Providers } from './providers';
import { isDevAuth } from '../lib/auth';

export const metadata: Metadata = {
  title: 'Spaceforge',
  description:
    'Spaceforge — a browser-local website builder powered by LLMs via WebGPU. Describe a site, get HTML/CSS/JS in your browser.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In dev-auth mode we skip ClerkProvider entirely. In real auth we wrap
  // the tree so <SignedIn> / useUser() etc. work throughout the app.
  const dev = isDevAuth();
  const inner = (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  if (dev) return inner;

  const { ClerkProvider } = await import('@clerk/nextjs');
  return <ClerkProvider>{inner}</ClerkProvider>;
}
