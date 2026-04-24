'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Anchor,
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
  Tooltip,
} from '@mantine/core';
import {
  IconCopy,
  IconPlus,
  IconTrash,
  IconShare,
  IconUsers,
  IconLogout,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../lib/auth/types';
import type { SiteSummary } from '../../lib/sites/service';
import { useAlert, useConfirm } from '../../src/ui/dialogs';
import { AppHeader } from '../../src/ui/AppHeader';
import { ShareSiteModal } from '../../src/ui/ShareSiteModal';

export function DashboardView({
  user,
  sites: initialSites,
  isDevAuth,
}: {
  user: AuthedUser;
  sites: SiteSummary[];
  isDevAuth: boolean;
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
  // Clone modal state.
  const [cloneSource, setCloneSource] = useState<SiteSummary | null>(null);
  const [cloneSlug, setCloneSlug] = useState('');
  const [cloneName, setCloneName] = useState('');
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  function openClone(site: SiteSummary) {
    setCloneSource(site);
    setCloneSlug(`${site.slug}-copy`.slice(0, 50));
    setCloneName(`${site.name} (copy)`);
    setCloneError(null);
  }

  async function submitClone() {
    if (!cloneSource) return;
    setCloning(true);
    setCloneError(null);
    try {
      const res = await fetch(`/api/sites/${cloneSource.id}/clone`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: cloneSlug, name: cloneName }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setCloneError(body?.error ?? `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { site: SiteSummary };
      setSites((xs) => [body.site, ...xs]);
      setCloneSource(null);
      router.push(`/sites/${body.site.id}`);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : String(err));
    } finally {
      setCloning(false);
    }
  }

  const { teamSites, sharedSites } = useMemo(() => {
    const team = sites.filter((s) => s.via === 'team');
    const shared = sites.filter((s) => s.via === 'collaborator');
    return { teamSites: team, sharedSites: shared };
  }, [sites]);

  const confirmDialog = useConfirm();
  const alertDialog = useAlert();

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

  async function leaveSite(id: string) {
    const site = sites.find((s) => s.id === id);
    const ok = await confirmDialog({
      title: 'Leave this site?',
      message: site ? (
        <>
          You'll lose access to <b>{site.name}</b>. The owner can re-invite
          you anytime.
        </>
      ) : (
        'Leave this shared site?'
      ),
      confirmLabel: 'Leave',
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/sites/${id}/collaborators/${user.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await alertDialog({
        title: 'Could not leave',
        message: `HTTP ${res.status}`,
      });
      return;
    }
    setSites((s) => s.filter((x) => x.id !== id));
  }

  async function deleteSite(id: string) {
    const site = sites.find((s) => s.id === id);
    const ok = await confirmDialog({
      title: 'Move to trash?',
      message: site ? (
        <>
          <b>{site.name}</b> will move to the trash. You can restore it later
          from the Trash page.
        </>
      ) : (
        'Move this site to the trash?'
      ),
      confirmLabel: 'Move to trash',
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      await alertDialog({
        title: 'Delete failed',
        message: `HTTP ${res.status}`,
      });
      return;
    }
    setSites((s) => s.filter((x) => x.id !== id));
  }

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppHeader
        user={user}
        isDevAuth={isDevAuth}
        nav={
          <>
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
          </>
        }
      />

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
                  onClone={() => openClone(s)}
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
                    onClone={() => openClone(s)}
                    onLeave={() => leaveSite(s.id)}
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
        opened={!!cloneSource}
        onClose={() => setCloneSource(null)}
        title={cloneSource ? `Duplicate "${cloneSource.name}"` : 'Duplicate site'}
        centered
      >
        <Stack>
          <Text size="xs" c="dimmed">
            The new site is a fresh draft in your team. Files are copied;
            published versions, chat history, collaborators, and custom
            domains are not.
          </Text>
          <TextInput
            label="Name"
            value={cloneName}
            onChange={(e) => setCloneName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Slug"
            description="Shown in the URL: /s/<slug>. Must be unique."
            value={cloneSlug}
            onChange={(e) => setCloneSlug(e.currentTarget.value)}
            required
          />
          {cloneError && (
            <Text c="red" size="sm">
              {cloneError}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCloneSource(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitClone}
              loading={cloning}
              leftSection={<IconCopy size={14} />}
            >
              Duplicate
            </Button>
          </Group>
        </Stack>
      </Modal>

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
  onClone,
  onDelete,
  onLeave,
}: {
  site: SiteSummary;
  onOpen: () => void;
  onShare?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}) {
  // Card is clickable — opens the editor. Icon-button row intercepts
  // clicks (stopPropagation) so Share / Delete don't also trigger nav.
  return (
    <Card
      withBorder
      padding="md"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
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
        <Badge size="xs" variant="light" color="gray">
          {site.role}
        </Badge>
        <Group
          gap={4}
          onClick={(e) => e.stopPropagation()}
        >
          {onShare && (site.role === 'owner' || site.role === 'admin') && (
            <Tooltip label="Share" openDelay={200}>
              <ActionIcon variant="subtle" onClick={onShare} aria-label="Share">
                <IconShare size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {onClone && (
            <Tooltip label="Duplicate site" openDelay={200}>
              <ActionIcon variant="subtle" onClick={onClone} aria-label="Duplicate site">
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {onDelete && (site.role === 'owner' || site.role === 'admin') && (
            <Tooltip label="Move to trash" openDelay={200}>
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
          {onLeave && (
            <Tooltip label="Leave site" openDelay={200}>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={onLeave}
                aria-label="Leave site"
              >
                <IconLogout size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Card>
  );
}

