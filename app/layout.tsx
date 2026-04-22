import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import '@mantine/core/styles.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Spaceforge',
  description:
    'Spaceforge — a browser-local website builder powered by LLMs via WebGPU. Describe a site, get HTML/CSS/JS in your browser.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
