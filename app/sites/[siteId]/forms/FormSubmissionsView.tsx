'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ActionIcon,
  Anchor,
  AppShell,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBell,
  IconDownload,
  IconForms,
  IconMail,
  IconTrash,
  IconWebhook,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../../../lib/auth/types';
import { AppHeader } from '../../../../src/ui/AppHeader';

type SubmissionJSON = {
  id: number;
  siteId: string;
  formName: string;
  data: Record<string, unknown>;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
};

type FormCountJSON = {
  formName: string;
  count: number;
  lastAt: string;
};

export function FormSubmissionsView({
  user,
  isDevAuth,
  site,
  initialSubmissions,
  initialCounts,
}: {
  user: AuthedUser;
  isDevAuth: boolean;
  site: { id: string; name: string; slug: string };
  initialSubmissions: SubmissionJSON[];
  initialCounts: FormCountJSON[];
}) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return initialSubmissions;
    return initialSubmissions.filter((s) => s.formName === filter);
  }, [filter, initialSubmissions]);

  const downloadCsv = () => {
    const fields = Array.from(
      new Set(
        filtered.flatMap((s) => Object.keys(s.data)),
      ),
    ).sort();
    const header = ['id', 'createdAt', 'formName', ...fields];
    const rows = filtered.map((s) => [
      String(s.id),
      s.createdAt,
      s.formName,
      ...fields.map((f) => {
        const v = s.data[f];
        if (v == null) return '';
        return typeof v === 'string' ? v : JSON.stringify(v);
      }),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) =>
            /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell,
          )
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const scope = filter === 'all' ? 'all' : filter;
    a.download = `${site.slug}-submissions-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const segments = useMemo(
    () => [
      { label: `All (${initialSubmissions.length})`, value: 'all' },
      ...initialCounts.map((c) => ({
        label: `${c.formName} (${c.count})`,
        value: c.formName,
      })),
    ],
    [initialCounts, initialSubmissions.length],
  );

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppHeader
        user={user}
        isDevAuth={isDevAuth}
        showBackToDashboard
        badge={{
          label: 'Forms',
          icon: <IconForms size={12} />,
          color: 'blue',
        }}
      />

      <AppShell.Main>
        <Container size="xl">
          <Group gap="xs" mb="sm">
            <Anchor
              component={Link}
              href={`/sites/${site.id}`}
              c="dimmed"
              size="xs"
            >
              <Group gap={4} wrap="nowrap">
                <IconArrowLeft size={12} />
                <Text size="xs">Back to editor</Text>
              </Group>
            </Anchor>
          </Group>
          <Group justify="space-between" align="flex-end" mb={4} wrap="nowrap">
            <Title order={2}>
              {site.name} · Submissions
            </Title>
            {initialSubmissions.length > 0 && (
              <Button
                variant="default"
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={downloadCsv}
              >
                Export CSV
              </Button>
            )}
          </Group>
          <Text c="dimmed" size="sm" mb="lg">
            Forms on{' '}
            <Code>/s/{site.slug}</Code> that POST to{' '}
            <Code>/api/forms/{site.slug}/&lt;name&gt;</Code> land here. Add a
            notification below if you want email or a webhook on every
            submission.
          </Text>

          <NotificationsPanel siteId={site.id} />


          {initialSubmissions.length === 0 ? (
            <Card withBorder p="xl">
              <Stack align="center" gap="xs">
                <IconMail size={24} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" size="sm">
                  No submissions yet.
                </Text>
                <Text c="dimmed" size="xs" maw={540} ta="center">
                  Add a form to your site with{' '}
                  <Code>
                    action=&quot;/api/forms/{site.slug}/contact&quot; method=&quot;post&quot;
                  </Code>
                  . Submissions will appear here after the site is published
                  and visitors submit the form.
                </Text>
              </Stack>
            </Card>
          ) : (
            <Stack>
              {segments.length > 2 && (
                <SegmentedControl
                  data={segments}
                  value={filter}
                  onChange={setFilter}
                  mb="md"
                />
              )}
              <Table.ScrollContainer minWidth={600}>
                <Table striped withTableBorder verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>When</Table.Th>
                      <Table.Th>Form</Table.Th>
                      <Table.Th>Fields</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filtered.map((s) => (
                      <Table.Tr key={s.id}>
                        <Table.Td>
                          <Text size="xs" ff="monospace">
                            {new Date(s.createdAt).toLocaleString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="blue">
                            {s.formName}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            {Object.entries(s.data).map(([k, v]) => (
                              <Group key={k} gap={6} wrap="nowrap">
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  ff="monospace"
                                  style={{ minWidth: 96 }}
                                >
                                  {k}:
                                </Text>
                                <Text size="sm" style={{ wordBreak: 'break-word' }}>
                                  {typeof v === 'string'
                                    ? v
                                    : JSON.stringify(v)}
                                </Text>
                              </Group>
                            ))}
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Stack>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

type NotificationJSON = {
  formName: string;
  email: string | null;
  webhookUrl: string | null;
};

function NotificationsPanel({ siteId }: { siteId: string }) {
  const [rows, setRows] = useState<NotificationJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [email, setEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sites/${siteId}/form-settings`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { settings: NotificationJSON[] };
        if (!cancelled) setRows(body.settings);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/sites/${siteId}/form-settings`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formName: formName.trim(),
        email: email.trim() || null,
        webhookUrl: webhookUrl.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `HTTP ${res.status}`);
      return;
    }
    const body = (await res.json()) as { setting: NotificationJSON };
    setRows((prev) => {
      const others = prev.filter((r) => r.formName !== body.setting.formName);
      return [body.setting, ...others];
    });
    setFormName('');
    setEmail('');
    setWebhookUrl('');
  }

  async function remove(fn: string) {
    const params = new URLSearchParams({ formName: fn });
    const res = await fetch(
      `/api/sites/${siteId}/form-settings?${params}`,
      { method: 'DELETE' },
    );
    if (!res.ok) return;
    setRows((prev) => prev.filter((r) => r.formName !== fn));
  }

  return (
    <Card withBorder p="md" mb="lg">
      <Group gap={8} mb="sm">
        <IconBell size={16} />
        <Text fw={600}>Notifications</Text>
        <Text size="xs" c="dimmed">
          Email + webhook fire on every matching submission. Leave the form
          name blank to apply to all forms.
        </Text>
      </Group>
      {loading ? (
        <Text size="xs" c="dimmed">
          Loading…
        </Text>
      ) : rows.length === 0 ? (
        <Text size="xs" c="dimmed" mb="sm">
          No notifications configured yet.
        </Text>
      ) : (
        <Stack gap={6} mb="sm">
          {rows.map((r) => (
            <Group key={r.formName} gap="xs" wrap="nowrap">
              <Badge size="sm" color="gray" variant="light">
                {r.formName || 'all forms'}
              </Badge>
              {r.email && (
                <Group gap={4} wrap="nowrap">
                  <IconMail size={12} />
                  <Code>{r.email}</Code>
                </Group>
              )}
              {r.webhookUrl && (
                <Group gap={4} wrap="nowrap">
                  <IconWebhook size={12} />
                  <Code>{r.webhookUrl}</Code>
                </Group>
              )}
              <Tooltip label="Remove">
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => remove(r.formName)}
                  aria-label={`Remove ${r.formName || 'all-forms'} notification`}
                >
                  <IconTrash size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ))}
        </Stack>
      )}
      <Group gap="xs" align="flex-end">
        <TextInput
          label="Form name"
          placeholder="(blank = all forms)"
          value={formName}
          onChange={(e) => setFormName(e.currentTarget.value)}
          w={140}
        />
        <TextInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          style={{ flex: 1 }}
          leftSection={<IconMail size={14} />}
        />
        <TextInput
          label="Webhook URL"
          placeholder="https://…"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.currentTarget.value)}
          style={{ flex: 1 }}
          leftSection={<IconWebhook size={14} />}
        />
        <Button onClick={save} loading={saving} disabled={!email && !webhookUrl}>
          Save
        </Button>
      </Group>
      {error && (
        <Text c="red" size="sm" mt="xs">
          {error}
        </Text>
      )}
      {!process.env.NEXT_PUBLIC_HAS_RESEND && (
        <Text size="xs" c="dimmed" mt="xs">
          Email delivery needs <Code>RESEND_API_KEY</Code> in the server env.
          Webhooks work regardless.
        </Text>
      )}
    </Card>
  );
}

