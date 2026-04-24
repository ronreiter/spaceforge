'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Anchor,
  AppShell,
  Button,
  Card,
  Code,
  Container,
  Group,
  Loader,
  Progress,
  SegmentedControl,
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
  IconDownload,
  IconExternalLink,
  IconLink,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../../../lib/auth/types';
import type {
  AnalyticsSummary,
  AnalyticsRange,
} from '../../../../lib/sites/analytics';
import { AppHeader } from '../../../../src/ui/AppHeader';

export function AnalyticsView({
  user,
  isDevAuth,
  site,
  initialSummary,
}: {
  user: AuthedUser;
  isDevAuth: boolean;
  site: { id: string; name: string; slug: string };
  initialSummary: AnalyticsSummary;
}) {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary>(initialSummary);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (range === '30d') {
      // initialSummary is already 30d — no fetch needed
      setSummary(initialSummary);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/sites/${site.id}/analytics?range=${range}`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { summary: AnalyticsSummary };
        if (!cancelled) setSummary(body.summary);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, site.id, initialSummary]);

  function downloadCsv() {
    const header = ['id', 'createdAt', 'path', 'referrer', 'country', 'host'];
    const rows = summary.recent.map((r) => [
      String(r.id),
      r.createdAt,
      r.path,
      r.referrer ?? '',
      r.country ?? '',
      r.host ?? '',
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
    a.download = `${site.slug}-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const maxPathCount = summary.topPaths[0]?.count ?? 1;
  const maxRefCount = summary.topReferrers[0]?.count ?? 1;
  const maxCountryCount = summary.topCountries[0]?.count ?? 1;
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
          <Group justify="space-between" align="flex-end" mb="xs" wrap="nowrap">
            <Title order={2}>
              {site.name} · Analytics
            </Title>
            {summary.recent.length > 0 && (
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
          <Text c="dimmed" size="sm" mb="md">
            Every HTML hit on <Code>/s/{site.slug}</Code> is counted. Crawler
            user-agents are filtered; unique visitors are a hash of IP + UA
            bucketed by day.
          </Text>

          <Group gap="xs" mb="lg" align="center">
            <SegmentedControl
              value={range}
              onChange={(v) => setRange(v as AnalyticsRange)}
              data={[
                { label: 'Last 24h', value: '24h' },
                { label: 'Last 7d', value: '7d' },
                { label: 'Last 30d', value: '30d' },
                { label: 'Last 90d', value: '90d' },
              ]}
            />
            {loading && <Loader size="xs" />}
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
            <StatCard label="Views (range)" value={summary.totalViews} />
            <StatCard
              label="Unique visitors (range)"
              value={summary.uniqueVisitors}
              icon={<IconUsers size={12} />}
            />
            <StatCard
              label="Last 24 hours"
              value={summary.stat.last24h}
              subtle={`${summary.stat.last7d.toLocaleString()} in 7d · ${summary.stat.last30d.toLocaleString()} in 30d`}
            />
          </SimpleGrid>

          {summary.totalViews === 0 ? (
            <Card withBorder p="xl" mb="lg">
              <Stack align="center" gap="xs">
                <IconChartBar size={24} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" size="sm">
                  No views in this range.
                </Text>
              </Stack>
            </Card>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="lg">
                <Card withBorder p="md">
                  <Group gap={8} mb="sm">
                    <IconCursorText size={16} />
                    <Text fw={600}>Top pages</Text>
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
                    <Text fw={600}>Top referrers</Text>
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

                <Card withBorder p="md">
                  <Group gap={8} mb="sm">
                    <IconWorld size={16} />
                    <Text fw={600}>Top countries</Text>
                  </Group>
                  <Stack gap={8}>
                    {summary.topCountries.map((c) => (
                      <Stack gap={2} key={c.country}>
                        <Group justify="space-between" wrap="nowrap">
                          <Text size="sm" ff="monospace">
                            {c.country}
                          </Text>
                          <Text size="sm" c="dimmed" fw={600}>
                            {c.count}
                          </Text>
                        </Group>
                        <Progress
                          value={(c.count / maxCountryCount) * 100}
                          size="xs"
                          color="grape"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Card>
              </SimpleGrid>

              <Card withBorder p="md" mb="lg">
                <Text fw={600} mb="sm">
                  Daily views (range)
                </Text>
                <Group gap={4} align="end" h={140}>
                  {summary.dailySeries.map((d) => (
                    <Stack
                      key={d.day}
                      gap={4}
                      align="center"
                      style={{ flex: 1, minWidth: 8 }}
                    >
                      <div
                        title={`${d.day}: ${d.count} views (${d.uniques} unique)`}
                        style={{
                          width: '100%',
                          height: `${(d.count / maxDayCount) * 100}%`,
                          minHeight: 2,
                          background: 'var(--mantine-color-teal-6)',
                          borderRadius: 2,
                        }}
                      />
                      <div
                        title={`${d.uniques} unique`}
                        style={{
                          width: '100%',
                          height: `${(d.uniques / maxDayCount) * 50}%`,
                          minHeight: 1,
                          background: 'var(--mantine-color-grape-5)',
                          borderRadius: 2,
                          opacity: 0.8,
                        }}
                      />
                      <Text size="xs" c="dimmed" ff="monospace">
                        {d.day.slice(5)}
                      </Text>
                    </Stack>
                  ))}
                </Group>
                <Group gap="md" mt="xs">
                  <Legend color="teal" label="Views" />
                  <Legend color="grape" label="Unique visitors" />
                </Group>
              </Card>

              <Card withBorder p="md">
                <Group gap={8} mb="sm">
                  <IconExternalLink size={16} />
                  <Text fw={600}>Recent hits</Text>
                </Group>
                <Table.ScrollContainer minWidth={720}>
                  <Table striped verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>When</Table.Th>
                        <Table.Th>Path</Table.Th>
                        <Table.Th>Referrer</Table.Th>
                        <Table.Th>Country</Table.Th>
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
                            <Text size="xs" ff="monospace">
                              {r.country ?? '—'}
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

function StatCard({
  label,
  value,
  icon,
  subtle,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  subtle?: string;
}) {
  return (
    <Card withBorder p="md">
      <Group gap={6} align="center">
        {icon}
        <Text
          size="xs"
          c="dimmed"
          tt="uppercase"
          style={{ letterSpacing: '0.06em' }}
        >
          {label}
        </Text>
      </Group>
      <Text fz={36} fw={700} lh={1.1} c="teal">
        {value.toLocaleString()}
      </Text>
      {subtle && (
        <Text size="xs" c="dimmed">
          {subtle}
        </Text>
      )}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Group gap={4} wrap="nowrap">
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: `var(--mantine-color-${color}-6)`,
        }}
      />
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}
