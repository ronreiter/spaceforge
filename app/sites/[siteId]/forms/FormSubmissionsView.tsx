'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Anchor,
  AppShell,
  Badge,
  Card,
  Code,
  Container,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconForms, IconMail } from '@tabler/icons-react';
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
          <Title order={2} mb={4}>
            {site.name} · Submissions
          </Title>
          <Text c="dimmed" size="sm" mb="lg">
            Forms on{' '}
            <Code>/s/{site.slug}</Code> that POST to{' '}
            <Code>/api/forms/{site.slug}/&lt;name&gt;</Code> land here. Nothing
            is emailed yet; check this page or set up a webhook later.
          </Text>

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
