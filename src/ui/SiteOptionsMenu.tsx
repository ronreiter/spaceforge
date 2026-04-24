'use client';

import Link from 'next/link';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import {
  IconChartBar,
  IconCopy,
  IconDotsVertical,
  IconForms,
  IconLogout,
  IconPhoto,
  IconShare,
  IconTrash,
} from '@tabler/icons-react';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

// Single dots menu that carries every per-site action. Rendered in
// two places (dashboard site cards + editor TopBar) so users never
// have to hunt for the same action in two different spots.
//
// The menu adapts to whatever callbacks the caller wires up:
//   - onShare is only shown for owners/admins (the underlying API
//     enforces this too, but gating the entry point keeps the UX
//     honest).
//   - onFavicon is shown for any role above viewer — editors can
//     change the favicon.
//   - Analytics + Forms links are always shown once siteId is known.
//   - onClone is shown whenever provided (caller decides; both
//     team-owned and shared-with-me cards expose it).
//   - onDelete (owner/admin) and onLeave (collaborators) are mutually
//     exclusive — a card either lives in your team (trash) or was
//     shared to you (leave).

export function SiteOptionsMenu({
  siteId,
  role,
  size = 'md',
  onShare,
  onFavicon,
  onClone,
  onDelete,
  onLeave,
  withTooltip = true,
}: {
  siteId: string;
  role?: Role;
  size?: 'sm' | 'md';
  onShare?: () => void;
  onFavicon?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
  withTooltip?: boolean;
}) {
  const isAdmin = role === 'owner' || role === 'admin';
  const canWrite = isAdmin || role === 'editor';
  const iconSize = size === 'sm' ? 14 : 16;

  const trigger = (
    <ActionIcon
      variant={size === 'sm' ? 'subtle' : 'default'}
      size={size === 'sm' ? 'sm' : 'lg'}
      aria-label="Site options"
    >
      <IconDotsVertical size={iconSize} />
    </ActionIcon>
  );

  return (
    <Menu position="bottom-end" width={220} shadow="md">
      <Menu.Target>
        {withTooltip ? (
          <Tooltip label="Options" openDelay={200}>
            {trigger}
          </Tooltip>
        ) : (
          trigger
        )}
      </Menu.Target>
      <Menu.Dropdown>
        {onShare && isAdmin && (
          <Menu.Item
            leftSection={<IconShare size={14} />}
            onClick={onShare}
          >
            Share
          </Menu.Item>
        )}
        {onFavicon && canWrite && (
          <Menu.Item
            leftSection={<IconPhoto size={14} />}
            onClick={onFavicon}
          >
            Favicon
          </Menu.Item>
        )}
        <Menu.Item
          component={Link}
          href={`/sites/${siteId}/analytics`}
          leftSection={<IconChartBar size={14} />}
        >
          Analytics
        </Menu.Item>
        <Menu.Item
          component={Link}
          href={`/sites/${siteId}/forms`}
          leftSection={<IconForms size={14} />}
        >
          Forms
        </Menu.Item>
        {onClone && (
          <Menu.Item
            leftSection={<IconCopy size={14} />}
            onClick={onClone}
          >
            Duplicate
          </Menu.Item>
        )}
        {(onDelete || onLeave) && <Menu.Divider />}
        {onDelete && isAdmin && (
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={onDelete}
          >
            Move to trash
          </Menu.Item>
        )}
        {onLeave && (
          <Menu.Item
            color="red"
            leftSection={<IconLogout size={14} />}
            onClick={onLeave}
          >
            Leave site
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
