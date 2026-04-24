'use client';

import {
  Avatar,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';
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

export function UserMenu({
  user,
  isDevAuth,
}: {
  user: { email: string; name?: string | null };
  isDevAuth: boolean;
}) {
  const label = user.name ?? user.email;
  const initial = (user.name ?? user.email).trim().slice(0, 1).toUpperCase();

  return (
    <Menu position="bottom-end" width={220} shadow="md">
      <Menu.Target>
        <UnstyledButton aria-label="Account menu">
          <Group gap={8} wrap="nowrap">
            <Avatar size="sm" radius="xl" color="neon">
              {initial || <IconUser size={14} />}
            </Avatar>
            <Text size="sm" c="dimmed" truncate maw={180} visibleFrom="sm">
              {label}
            </Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text size="xs" c="dimmed" truncate>
            {user.email}
          </Text>
        </Menu.Label>
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
