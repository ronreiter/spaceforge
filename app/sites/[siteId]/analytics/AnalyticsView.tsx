'use client';

import Link from 'next/link';
import {
  Anchor,
  AppShell,
  Card,
  Code,
  Container,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconChartBar,
  IconCursorText,
  IconExternalLink,
  IconLink,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../../../lib/auth/types';
import type { AnalyticsSummary } from '../../../../lib/sites/analytics';
import { AppHeader } from '../../../../src/ui/AppHeader';

export function AnalyticsView({
  user,
  isDevAuth,
  site,
  summary,
}: {
  user: AuthedUser;
  isDevAuth: boolean;
  site: { id: string; name: string; slug: string };
  summary: AnalyticsSummary;
}) {
  const maxPathCount = summary.topPaths[0]?.count ?? 1;
  const maxRefCount = summary.topReferrers[0]?.count ?? 1;
  const maxDayCount = summary.dailySeries.reduce(
    (m, d) => Math.max(m, d.count),
    1,
  );

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppHeader
        user={user}
        isDevAuth={isDevAuth}
        showBackToDashboard
        badge={{
          label: 'Analytics',
          icon: <IconChartBar size={12} />,
          color: 'teal',
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
            {site.name} · Analytics
          </Title>
          <Text c="dimmed" size="sm" mb="lg">
            Every HTML hit on <Code>/s/{site.slug}</Code> is counted. Obvious
            bot user-agents are filtered out. Data is retained indefinitely;
            summary below covers the last 30 days.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
            <StatCard label="Last 24 hours" value={summary.totalLast24h} />
            <StatCard label="Last 7 days" value={summary.totalLast7d} />
            <StatCard label="Last 30 days" value={summary.totalLast30d} />
          </SimpleGrid>

          {summary.totalLast30d === 0 ? (
            <Card withBorder p="xl" mb="lg">
              <Stack align="center" gap="xs">
                <IconChartBar size={24} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" size="sm">
                  No views yet.
                </Text>
                <Text c="dimmed" size="xs" maw={540} ta="center">
                  Publish the site and share it. Hits against{' '}
                  <Code>/s/{site.slug}/</Code> will show up here; bot traffic
                  is filtered out by default.
                </Text>
              </Stack>
            </Card>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="lg">
                <Card withBorder p="md">
                  <Group gap={8} mb="sm">
                    <IconCursorText size={16} />
                    <Text fw={600}>Top pages (30d)</Text>
                  </Group>
                  <Stack gap={8}>
                    {summary.topPaths.map((p) => (
                      <Stack gap={2} key={p.path}>
                        <Group justify="space-between" wrap="nowrap">
                          <Text size="sm" ff="monospace" truncate>
                            {p.path}
                          </Text>
                          <Text size="sm" c="dimmed" fw={600}>
                            {p.count}
                          </Text>
                        </Group>
                        <Progress
                          value={(p.count / maxPathCount) * 100}
                          size="xs"
                          color="teal"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Card>

                <Card withBorder p="md">
                  <Group gap={8} mb="sm">
                    <IconLink size={16} />
                    <Text fw={600}>Top referrers (30d)</Text>
                  </Group>
                  <Stack gap={8}>
                    {summary.topReferrers.map((r) => (
                      <Stack gap={2} key={r.referrer}>
                        <Group justify="space-between" wrap="nowrap">
                          <Text size="sm" truncate>
                            {r.referrer}
                          </Text>
                          <Text size="sm" c="dimmed" fw={600}>
                            {r.count}
                          </Text>
                        </Group>
                        <Progress
                          value={(r.count / maxRefCount) * 100}
                          size="xs"
                          color="cyan"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Card>
              </SimpleGrid>

              <Card withBorder p="md" mb="lg">
                <Text fw={600} mb="sm">
                  Daily views (30d)
                </Text>
                <Group gap={4} align="end" h={120}>
                  {summary.dailySeries.map((d) => (
                    <Stack
                      key={d.day}
                      gap={4}
                      align="center"
                      style={{ flex: 1, minWidth: 8 }}
                    >
                      <div
                        title={`${d.day}: ${d.count} views`}
                        style={{
                          width: '100%',
                          height: `${(d.count / maxDayCount) * 100}%`,
                          minHeight: 2,
                          background: 'var(--mantine-color-teal-6)',
                          borderRadius: 2,
                        }}
                      />
                      <Text size="xs" c="dimmed" ff="monospace">
                        {d.day.slice(5)}
                      </Text>
                    </Stack>
                  ))}
                </Group>
              </Card>

              <Card withBorder p="md">
                <Group gap={8} mb="sm">
                  <IconExternalLink size={16} />
                  <Text fw={600}>Recent hits</Text>
                </Group>
                <Table.ScrollContainer minWidth={600}>
                  <Table striped verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>When</Table.Th>
                        <Table.Th>Path</Table.Th>
                        <Table.Th>Referrer</Table.Th>
                        <Table.Th>Host</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {summary.recent.map((r) => (
                        <Table.Tr key={r.id}>
                          <Table.Td>
                            <Text size="xs" ff="monospace">
                              {new Date(r.createdAt).toLocaleString()}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Code>{r.path}</Code>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" truncate maw={220}>
                              {r.referrer ?? '(direct)'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed" ff="monospace">
                              {r.host ?? '—'}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card>
            </>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card withBorder p="md">
      <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
        {label}
      </Text>
      <Text fz={36} fw={700} lh={1.1} c="teal">
        {value.toLocaleString()}
      </Text>
    </Card>
  );
}
