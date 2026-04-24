'use client';

import { Anchor, Group, Text } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import Link from 'next/link';

// Spaceforge brand mark. One component so every header — the editor's
// richer TopBar and the dashboard/trash/team AppShell.Headers — renders
// the same rocket + wordmark cluster. Clicking the brand always goes to
// /dashboard.
//
// Size defaults come from the old editor TopBar so that swap-in doesn't
// change pixel layout there. Other callers can pass size="sm" for a
// slightly smaller mark in the simpler page chrome.

export type AppBrandProps = {
  size?: 'sm' | 'md';
  /** Wrap the brand in a link to /dashboard (default true). Set false when
   *  the header already renders a Back-to-dashboard element elsewhere. */
  linkToDashboard?: boolean;
  /** Append a subtitle next to the wordmark at md+ breakpoints. */
  subtitle?: string;
};

export function AppBrand({
  size = 'md',
  linkToDashboard = true,
  subtitle,
}: AppBrandProps) {
  const iconSize = size === 'sm' ? 20 : 24;
  const stroke = size === 'sm' ? 1.8 : 1.8;
  const textSize = size === 'sm' ? 'sm' : 'md';
  const titleWeight = 700;

  const inner = (
    <Group gap={8} wrap="nowrap" align="center">
      <IconRocket
        size={iconSize}
        stroke={stroke}
        color="var(--mantine-color-neon-3)"
      />
      <Text fw={titleWeight} size={textSize}>
        Spaceforge
      </Text>
      {subtitle && (
        <Text c="dimmed" size="xs" visibleFrom="md">
          {subtitle}
        </Text>
      )}
    </Group>
  );

  if (!linkToDashboard) return inner;
  return (
    <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
      {inner}
    </Anchor>
  );
}
