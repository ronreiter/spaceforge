'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Anchor,
  AppShell,
  Button,
  Container,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Card,
  Badge,
  SimpleGrid,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconShare,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../lib/auth/types';
import type { SiteSummary } from '../../lib/sites/service';
import type { CollabRole, CollaboratorRow } from '../../lib/sharing/service';

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
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  // Share modal state — opened per-site.
  const [shareSite, setShareSite] = useState<SiteSummary | null>(null);

  const { teamSites, sharedSites } = useMemo(() => {
    const team = sites.filter((s) => s.via === 'team');
    const shared = sites.filter((s) => s.via === 'collaborator');
    return { teamSites: team, sharedSites: shared };
  }, [sites]);

  async function createSite() {
    setError(null);
    setCreating(true);
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
    } finally {
      setCreating(false);
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
            <Group gap="sm" wrap="nowrap">
              <IconWorld size={20} />
              <Title order={4}>Spaceforge</Title>
            </Group>
            <Group gap="md" wrap="nowrap">
              <Anchor component={Link} href="/dashboard/trash" c="dimmed">
                <Group gap={4} wrap="nowrap">
                  <IconTrash size={14} />
                  <Text size="sm">Trash</Text>
                </Group>
              </Anchor>
              <Anchor component={Link} href="/team" c="dimmed">
                <Group gap={4} wrap="nowrap">
                  <IconUsers size={14} />
                  <Text size="sm">Team</Text>
                </Group>
              </Anchor>
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

          {teamSites.length === 0 ? (
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
              {teamSites.map((s) => (
                <SiteCard
                  key={s.id}
                  site={s}
                  onOpen={() =>
                    startTransition(() => router.push(`/sites/${s.id}`))
                  }
                  onShare={() => setShareSite(s)}
                  onDelete={() => deleteSite(s.id)}
                />
              ))}
            </SimpleGrid>
          )}

          {sharedSites.length > 0 && (
            <>
              <Title order={3} mt="xl" mb="md">
                Shared with me
              </Title>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {sharedSites.map((s) => (
                  <SiteCard
                    key={s.id}
                    site={s}
                    onOpen={() =>
                      startTransition(() => router.push(`/sites/${s.id}`))
                    }
                  />
                ))}
              </SimpleGrid>
            </>
          )}
        </Container>
      </AppShell.Main>

      <ShareSiteModal
        site={shareSite}
        onClose={() => setShareSite(null)}
      />

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
            <Button onClick={createSite} loading={creating}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}

function SiteCard({
  site,
  onOpen,
  onShare,
  onDelete,
}: {
  site: SiteSummary;
  onOpen: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{site.name}</Text>
        <Group gap={4}>
          {site.publishedAt ? (
            <Badge size="sm" color="green">
              published
            </Badge>
          ) : (
            <Badge size="sm" color="gray">
              draft
            </Badge>
          )}
          {site.via === 'collaborator' && (
            <Badge size="sm" color="blue">
              shared
            </Badge>
          )}
        </Group>
      </Group>
      <Text size="xs" c="dimmed" mb="md" ff="monospace">
        /s/{site.slug}
      </Text>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {site.role}
        </Text>
        <Group gap={4}>
          <Tooltip label="Open editor">
            <ActionIcon variant="subtle" onClick={onOpen} aria-label="Open editor">
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>
          {onShare && (site.role === 'owner' || site.role === 'admin') && (
            <Tooltip label="Share">
              <ActionIcon variant="subtle" onClick={onShare} aria-label="Share">
                <IconShare size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {onDelete && (site.role === 'owner' || site.role === 'admin') && (
            <Tooltip label="Delete">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={onDelete}
                aria-label="Delete"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Card>
  );
}

function ShareSiteModal({
  site,
  onClose,
}: {
  site: SiteSummary | null;
  onClose: () => void;
}) {
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollabRole>('editor');
  const [inviting, setInviting] = useState(false);

  // Fetch when the modal is opened on a new site.
  useEffect(() => {
    if (!site) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/sites/${site.id}/collaborators`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { collaborators: CollaboratorRow[] };
        if (!cancelled) setCollaborators(body.collaborators);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [site]);

  if (!site) return null;

  async function add() {
    if (!site) return;
    setInviting(true);
    setError(null);
    const res = await fetch(`/api/sites/${site.id}/collaborators`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `HTTP ${res.status}`);
      setInviting(false);
      return;
    }
    const body = (await res.json()) as { collaborator: CollaboratorRow };
    setCollaborators((cs) => [
      body.collaborator,
      ...cs.filter((c) => c.userId !== body.collaborator.userId),
    ]);
    setEmail('');
    setInviting(false);
  }

  async function remove(userId: string) {
    if (!site) return;
    const res = await fetch(`/api/sites/${site.id}/collaborators/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      alert(`Failed to remove: HTTP ${res.status}`);
      return;
    }
    setCollaborators((cs) => cs.filter((c) => c.userId !== userId));
  }

  return (
    <Modal opened={!!site} onClose={onClose} title={`Share "${site.name}"`} size="md" centered>
      <Stack>
        <Group gap="xs" align="flex-end">
          <TextInput
            label="Email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            label="Role"
            value={role}
            onChange={(v) => v && setRole(v as CollabRole)}
            data={[
              { value: 'editor', label: 'Editor' },
              { value: 'viewer', label: 'Viewer' },
            ]}
            allowDeselect={false}
            w={120}
          />
          <Button onClick={add} loading={inviting}>
            Add
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Collaborators can open and (if editor) save this site. They don't get
          access to other sites in the team.
        </Text>
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
        <Stack gap="xs">
          <Text size="sm" fw={600} mt="sm">
            Current collaborators
          </Text>
          {loading ? (
            <Text size="xs" c="dimmed">
              Loading…
            </Text>
          ) : collaborators.length === 0 ? (
            <Text size="xs" c="dimmed">
              None yet.
            </Text>
          ) : (
            collaborators.map((c) => (
              <Group key={c.userId} justify="space-between">
                <Stack gap={0}>
                  <Text size="sm">{c.name ?? c.email}</Text>
                  <Text size="xs" c="dimmed">
                    {c.email} · {c.role}
                  </Text>
                </Stack>
                <Tooltip label="Remove">
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => remove(c.userId)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ))
          )}
        </Stack>
      </Stack>
    </Modal>
  );
}
