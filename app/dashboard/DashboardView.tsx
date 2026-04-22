'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppShell,
  Button,
  Container,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  Card,
  Badge,
  SimpleGrid,
  ActionIcon,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconWorld } from '@tabler/icons-react';
import type { AuthedUser } from '../../lib/auth/types';
import type { SiteSummary } from '../../lib/sites/service';

export function DashboardView({
  user,
  sites: initialSites,
}: {
  user: AuthedUser;
  sites: SiteSummary[];
}) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  async function createSite() {
    setError(null);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { site: SiteSummary };
      setOpen(false);
      setSlug('');
      setName('');
      router.push(`/sites/${body.site.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function deleteSite(id: string) {
    if (!confirm('Delete this site? This cannot be undone.')) return;
    const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert(`Failed to delete: HTTP ${res.status}`);
      return;
    }
    setSites((s) => s.filter((x) => x.id !== id));
  }

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xs">
              <IconWorld size={20} />
              <Title order={4}>Spaceforge</Title>
            </Group>
            <Group gap="sm">
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Group justify="space-between" mb="lg">
            <Title order={2}>Your sites</Title>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setOpen(true)}
            >
              New site
            </Button>
          </Group>

          {sites.length === 0 ? (
            <Card withBorder p="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed" size="sm">
                  No sites yet. Create your first one to get started.
                </Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setOpen(true)}
                >
                  New site
                </Button>
              </Stack>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {sites.map((s) => (
                <Card key={s.id} withBorder padding="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{s.name}</Text>
                    <Group gap={4}>
                      {s.publishedAt ? (
                        <Badge size="sm" color="green">
                          published
                        </Badge>
                      ) : (
                        <Badge size="sm" color="gray">
                          draft
                        </Badge>
                      )}
                      {s.via === 'collaborator' && (
                        <Badge size="sm" color="blue">
                          shared
                        </Badge>
                      )}
                    </Group>
                  </Group>
                  <Text size="xs" c="dimmed" mb="md" ff="monospace">
                    /s/{s.slug}
                  </Text>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {s.role}
                    </Text>
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        onClick={() =>
                          startTransition(() => router.push(`/sites/${s.id}`))
                        }
                        aria-label="Open editor"
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                      {(s.role === 'owner' || s.role === 'admin') && (
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => deleteSite(s.id)}
                          aria-label="Delete"
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Container>
      </AppShell.Main>

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title="Create a new site"
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="My Bakery"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Slug"
            description="Shown in the URL: /s/<slug>. Lowercase letters, digits, and hyphens."
            placeholder="my-bakery"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
            required
          />
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSite} loading={busy}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}
