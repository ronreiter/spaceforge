'use client';

import type { ReactNode } from 'react';
import {
  Anchor,
  AppShell,
  Badge,
  Container,
  Group,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { AppBrand } from './AppBrand';
import { UserMenu } from './UserMenu';

// Shared AppShell.Header used by the dashboard-level pages (Dashboard,
// Trash, Team). Editor's TopBar remains a separate richer component since
// it carries publish controls, the model selector, and save status.
//
// Every caller gets:
//   - Optional "Back to dashboard" link (off on /dashboard itself)
//   - Rocket + "Spaceforge" brand via <AppBrand>
//   - Optional badge next to the brand ("Trash", "Team", etc.)
//   - A right-hand slot for nav links and user email
//
// Height is fixed at 56px so AppShell layouts stay consistent across routes.

export const APP_HEADER_HEIGHT = 56;

export type AppHeaderProps = {
  user: { email: string; name?: string | null };
  /** True when the request was served by AUTH_DRIVER=dev. The user menu
   *  disables "Sign out" in that mode because there's nothing to sign
   *  out of — middleware always treats every request as DEV_USER. */
  isDevAuth: boolean;
  /** Show "Back to dashboard" arrow on the far left. Default false — the
   *  Dashboard page suppresses it; Trash/Team enable it. */
  showBackToDashboard?: boolean;
  /** Small badge rendered next to the brand (e.g. "Trash", "Team"). */
  badge?: { label: string; icon?: ReactNode; color?: string };
  /** Nav links rendered between the brand and the user menu. */
  nav?: ReactNode;
};

export function AppHeader({
  user,
  isDevAuth,
  showBackToDashboard = false,
  badge,
  nav,
}: AppHeaderProps) {
  return (
    <AppShell.Header>
      <Container size="xl" h="100%">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            {showBackToDashboard && (
              <Tooltip label="Back to dashboard">
                <Anchor component={Link} href="/dashboard" c="dimmed">
                  <Group gap={4} wrap="nowrap">
                    <IconArrowLeft size={14} />
                    <Text size="xs">Dashboard</Text>
                  </Group>
                </Anchor>
              </Tooltip>
            )}
            <AppBrand size="sm" linkToDashboard={!showBackToDashboard} />
            {badge && (
              <Badge
                size="sm"
                variant="light"
                color={badge.color ?? 'gray'}
                leftSection={badge.icon}
              >
                {badge.label}
              </Badge>
            )}
          </Group>
          <Group gap="md" wrap="nowrap">
            {nav}
            <UserMenu user={user} isDevAuth={isDevAuth} />
          </Group>
        </Group>
      </Container>
    </AppShell.Header>
  );
}
