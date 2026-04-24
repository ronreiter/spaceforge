'use client';

import Link from 'next/link';
import {
  Avatar,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChartBar,
  IconChevronDown,
  IconForms,
  IconLogout,
  IconPhoto,
  IconShare,
  IconUser,
} from '@tabler/icons-react';
import { useClerk } from '@clerk/nextjs';

// Top-right identity chip + dropdown used by every dashboard-level page
// via <AppHeader>. Clicking opens a menu with the email and a Sign-out
// action. In dev-auth mode the sign-out item is disabled with a hint —
// there's no session to clear. In Clerk mode the item uses useClerk()
// to drop the session and redirect to /sign-in.
//
// Clerk-dependent code lives in a child component that is only mounted
// when isDevAuth is false, so useClerk() is never called without a
// ClerkProvider above it.

type SiteOptions = {
  siteId: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  onShare?: () => void;
  onFavicon?: () => void;
};

export function UserMenu({
  user,
  isDevAuth,
  site,
}: {
  user: { email: string; name?: string | null };
  isDevAuth: boolean;
  /** When the menu is rendered inside a site editor, pass the site
   *  id/role + modal callbacks so the dropdown also carries the
   *  per-site actions (Share / Favicon / Analytics / Forms) above
   *  Sign out. Omit on dashboard-level pages where the account menu
   *  is purely about identity. */
  site?: SiteOptions;
}) {
  const label = user.name ?? user.email;
  const initial = (user.name ?? user.email).trim().slice(0, 1).toUpperCase();
  const isAdmin = site && (site.role === 'owner' || site.role === 'admin');
  const canWrite = site && (isAdmin || site.role === 'editor');

  return (
    <Menu position="bottom-end" width={240} shadow="md">
      <Menu.Target>
        <UnstyledButton aria-label="Account menu">
          <Group
            gap={8}
            wrap="nowrap"
            align="center"
            px={8}
            py={4}
            style={{
              borderRadius: 999,
              border: '1px solid var(--mantine-color-default-border)',
              background: 'var(--mantine-color-default)',
            }}
          >
            <Avatar size="sm" radius="xl" color="neon">
              {initial || <IconUser size={14} />}
            </Avatar>
            <Text size="sm" c="dimmed" truncate maw={160} visibleFrom="sm">
              {label}
            </Text>
            <IconChevronDown size={12} style={{ opacity: 0.7 }} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text size="xs" c="dimmed" truncate>
            {user.email}
          </Text>
        </Menu.Label>
        <Menu.Item
          component={Link}
          href="/profile"
          leftSection={<IconUser size={14} />}
        >
          My profile
        </Menu.Item>
        {site && (
          <>
            <Menu.Divider />
            <Menu.Label>This site</Menu.Label>
            {site.onShare && isAdmin && (
              <Menu.Item
                leftSection={<IconShare size={14} />}
                onClick={site.onShare}
              >
                Share
              </Menu.Item>
            )}
            {site.onFavicon && canWrite && (
              <Menu.Item
                leftSection={<IconPhoto size={14} />}
                onClick={site.onFavicon}
              >
                Favicon
              </Menu.Item>
            )}
            <Menu.Item
              component={Link}
              href={`/sites/${site.siteId}/analytics`}
              leftSection={<IconChartBar size={14} />}
            >
              Analytics
            </Menu.Item>
            <Menu.Item
              component={Link}
              href={`/sites/${site.siteId}/forms`}
              leftSection={<IconForms size={14} />}
            >
              Forms
            </Menu.Item>
          </>
        )}
        <Menu.Divider />
        {isDevAuth ? (
          <Menu.Item
            leftSection={<IconLogout size={14} />}
            color="red"
            disabled
            title="Dev auth mode — nothing to sign out of."
          >
            Sign out (dev mode)
          </Menu.Item>
        ) : (
          <ClerkSignOutItem />
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

function ClerkSignOutItem() {
  const { signOut } = useClerk();
  return (
    <Menu.Item
      leftSection={<IconLogout size={14} />}
      color="red"
      onClick={() => signOut({ redirectUrl: '/sign-in' })}
    >
      Sign out
    </Menu.Item>
  );
}
