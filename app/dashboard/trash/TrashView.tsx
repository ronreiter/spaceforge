'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Anchor,
  AppShell,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
  ActionIcon,
  Tooltip,
  SimpleGrid,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../../lib/auth/types';
import type { SiteSummary } from '../../../lib/sites/service';
import { useAlert, useConfirm } from '../../../src/ui/dialogs';

export function TrashView({
  user,
  sites: initial,
}: {
  user: AuthedUser;
  sites: SiteSummary[];
}) {
  const [sites, setSites] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const confirmDialog = useConfirm();
  const alertDialog = useAlert();

  const canManage = (s: SiteSummary) => s.role === 'owner' || s.role === 'admin';

  async function restore(id: string) {
    setBusy(id);
    const res = await fetch(`/api/sites/${id}/restore`, { method: 'POST' });
    setBusy(null);
    if (!res.ok) {
      await alertDialog({
        title: 'Restore failed',
        message: `HTTP ${res.status}`,
      });
      return;
    }
    setSites((s) => s.filter((x) => x.id !== id));
  }

  async function purge(id: string, name: string) {
    const ok = await confirmDialog({
      title: 'Permanently delete?',
      message: (
        <>
          All files, versions, and share links for <b>{name}</b> will be
          removed. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete forever',
      danger: true,
    });
    if (!ok) return;
    setBusy(id);
    const res = await fetch(`/api/sites/${id}?hard=1`, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      await alertDialog({
        title: 'Delete failed',
        message: body?.error ?? `HTTP ${res.status}`,
      });
      return;
    }
    setSites((s) => s.filter((x) => x.id !== id));
  }

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Tooltip label="Back to dashboard">
                <Anchor component={Link} href="/dashboard" c="dimmed">
                  <Group gap={4} wrap="nowrap">
                    <IconArrowLeft size={14} />
                    <Text size="xs">Dashboard</Text>
                  </Group>
                </Anchor>
              </Tooltip>
              <IconWorld size={20} />
              <Title order={4}>Spaceforge</Title>
              <Badge size="sm" variant="light" color="gray">
                Trash
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {user.email}
            </Text>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Title order={2} mb="xs">
            Trash
          </Title>
          <Text c="dimmed" size="sm" mb="lg">
            Sites here are hidden from the dashboard and return 404 at
            /s/&lt;slug&gt;. Restore to bring them back, or permanently delete to
            free the slug.
          </Text>

          {sites.length === 0 ? (
            <Card withBorder p="xl">
              <Stack align="center" gap="xs">
                <IconTrash size={24} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" size="sm">
                  Trash is empty.
                </Text>
              </Stack>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {sites.map((s) => (
                <Card key={s.id} withBorder padding="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{s.name}</Text>
                    <Badge size="sm" color="gray">
                      deleted
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb={4} ff="monospace">
                    /s/{s.slug}
                  </Text>
                  <Text size="xs" c="dimmed" mb="md">
                    deleted {new Date(s.updatedAt).toLocaleDateString()}
                  </Text>
                  <Group justify="flex-end" gap={6}>
                    {canManage(s) && (
                      <>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconRefresh size={14} />}
                          loading={busy === s.id}
                          onClick={() => restore(s.id)}
                        >
                          Restore
                        </Button>
                        <Tooltip label="Permanently delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            loading={busy === s.id}
                            onClick={() => purge(s.id, s.name)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
