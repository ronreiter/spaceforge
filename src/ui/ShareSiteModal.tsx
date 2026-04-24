'use client';

import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Code,
  CopyButton,
  Group,
  Modal,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy, IconTrash, IconUsers, IconWorld } from '@tabler/icons-react';
import type {
  CollabRole,
  CollaboratorRow,
} from '../../lib/sharing/service';
import type { SiteDomainRow } from '../../lib/sites/domains';
import { useAlert } from './dialogs';

export type ShareableSite = {
  id: string;
  name: string;
};

export function ShareSiteModal({
  site,
  onClose,
}: {
  site: ShareableSite | null;
  onClose: () => void;
}) {
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollabRole>('editor');
  const [inviting, setInviting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const alertDialog = useAlert();

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

  async function changeRole(c: CollaboratorRow, nextRole: CollabRole) {
    if (!site) return;
    if (c.role === nextRole) return;
    setUpdatingUserId(c.userId);
    const res = await fetch(`/api/sites/${site.id}/collaborators`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: c.email, role: nextRole }),
    });
    setUpdatingUserId(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      await alertDialog({
        title: 'Role change failed',
        message: body?.error ?? `HTTP ${res.status}`,
      });
      return;
    }
    const body = (await res.json()) as { collaborator: CollaboratorRow };
    setCollaborators((cs) =>
      cs.map((x) => (x.userId === body.collaborator.userId ? body.collaborator : x)),
    );
  }

  async function remove(userId: string) {
    if (!site) return;
    const res = await fetch(`/api/sites/${site.id}/collaborators/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await alertDialog({
        title: 'Remove failed',
        message: `HTTP ${res.status}`,
      });
      return;
    }
    setCollaborators((cs) => cs.filter((c) => c.userId !== userId));
  }

  return (
    <Modal
      opened={!!site}
      onClose={onClose}
      title={`Share "${site.name}"`}
      size="md"
      centered
    >
      <Tabs defaultValue="collaborators">
        <Tabs.List mb="md">
          <Tabs.Tab value="collaborators" leftSection={<IconUsers size={14} />}>
            Collaborators
          </Tabs.Tab>
          <Tabs.Tab value="domains" leftSection={<IconWorld size={14} />}>
            Custom domains
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="collaborators">
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
              <Group key={c.userId} justify="space-between" wrap="nowrap">
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text size="sm" truncate>
                    {c.name ?? c.email}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {c.email}
                  </Text>
                </Stack>
                <Group gap={4} wrap="nowrap">
                  <Select
                    value={c.role}
                    onChange={(v) => v && changeRole(c, v as CollabRole)}
                    data={[
                      { value: 'editor', label: 'Editor' },
                      { value: 'viewer', label: 'Viewer' },
                    ]}
                    allowDeselect={false}
                    disabled={updatingUserId === c.userId}
                    size="xs"
                    w={110}
                  />
                  <Tooltip label="Remove">
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => remove(c.userId)}
                      aria-label={`Remove ${c.email}`}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            ))
          )}
        </Stack>
      </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="domains">
          <DomainsPanel siteId={site.id} />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}

function DomainsPanel({ siteId }: { siteId: string }) {
  const [domains, setDomains] = useState<SiteDomainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const alertDialog = useAlert();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/sites/${siteId}/domains`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { domains: SiteDomainRow[] };
        if (!cancelled) setDomains(body.domains);
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
  }, [siteId]);

  async function add() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/sites/${siteId}/domains`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: input }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `HTTP ${res.status}`);
      setBusy(false);
      return;
    }
    const body = (await res.json()) as { domain: SiteDomainRow };
    setDomains((ds) => [
      body.domain,
      ...ds.filter((d) => d.domain !== body.domain.domain),
    ]);
    setInput('');
    setBusy(false);
  }

  async function remove(domain: string) {
    const res = await fetch(
      `/api/sites/${siteId}/domains/${encodeURIComponent(domain)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      await alertDialog({ title: 'Remove failed', message: `HTTP ${res.status}` });
      return;
    }
    setDomains((ds) => ds.filter((d) => d.domain !== domain));
  }

  return (
    <Stack>
      <Group gap="xs" align="flex-end">
        <TextInput
          label="Domain"
          placeholder="bakery.com"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button onClick={add} loading={busy} disabled={!input.trim()}>
          Attach
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Add a domain you own, then point its DNS at Spaceforge (CNAME or A
        record, exact values depend on your platform). Attaching here only
        records the mapping — DNS and TLS still have to be configured
        separately.
      </Text>
      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      <Stack gap="xs">
        <Text size="sm" fw={600} mt="sm">
          Attached domains
        </Text>
        {loading ? (
          <Text size="xs" c="dimmed">Loading…</Text>
        ) : domains.length === 0 ? (
          <Text size="xs" c="dimmed">None yet.</Text>
        ) : (
          domains.map((d) => (
            <Group key={d.domain} justify="space-between" wrap="nowrap">
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <Code>{d.domain}</Code>
                <CopyButton value={d.domain}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={copy}
                        aria-label="Copy domain"
                      >
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Tooltip label="Detach">
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => remove(d.domain)}
                  aria-label={`Detach ${d.domain}`}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ))
        )}
      </Stack>
    </Stack>
  );
}
