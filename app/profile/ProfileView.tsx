'use client';

import Link from 'next/link';
import {
  Anchor,
  AppShell,
  Avatar,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconChartBar,
  IconCloud,
  IconEye,
  IconForms,
  IconRocket,
  IconTrash,
  IconUsers,
  IconUser,
  IconLogout,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../lib/auth/types';
import type { ProfileStats } from '../../lib/sites/profile';
import { AppHeader } from '../../src/ui/AppHeader';
import { useCallback, useState } from 'react';
import { useClerk } from '@clerk/nextjs';

// My-profile page — one-page summary of who the user is, the team
// they're in, and what they've been doing in Spaceforge lately. No
// editing surface (yet): identity is owned by Clerk in prod and by
// the dev stub locally, so the UI is read-only and defers to Clerk's
// own account management.

export function ProfileView({
  user,
  isDevAuth,
  stats,
}: {
  user: AuthedUser;
  isDevAuth: boolean;
  stats: ProfileStats;
}) {
  const initial = (user.name ?? user.email).trim().slice(0, 1).toUpperCase();

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppHeader
        user={user}
        isDevAuth={isDevAuth}
        showBackToDashboard
        badge={{
          label: 'Profile',
          icon: <IconUser size={12} />,
          color: 'gray',
        }}
      />

      <AppShell.Main>
        <Container size="lg">
          <Card withBorder p="xl" mb="lg">
            <Group gap="lg" wrap="nowrap" align="center">
              <Avatar
                size={80}
                radius="xl"
                color="neon"
                src={user.avatarUrl ?? undefined}
              >
                {initial}
              </Avatar>
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Title order={2}>{user.name ?? user.email}</Title>
                <Text c="dimmed" size="sm">
                  {user.email}
                </Text>
                <Group gap={6} mt={4}>
                  {stats.team.role && (
                    <Badge size="sm" variant="light" color="gray">
                      {stats.team.role} of {stats.team.name ?? 'your team'}
                    </Badge>
                  )}
                  {stats.team.plan && (
                    <Badge size="sm" variant="light" color="teal">
                      {stats.team.plan} plan
                    </Badge>
                  )}
                  {isDevAuth && (
                    <Badge size="sm" variant="light" color="yellow">
                      dev auth
                    </Badge>
                  )}
                </Group>
              </Stack>
              <SignOutAction isDevAuth={isDevAuth} />
            </Group>
          </Card>

          <Title order={3} mb="md">
            Activity (last 7 days)
          </Title>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="xl">
            <MetricCard
              label="Live sites"
              value={stats.publishedSites}
              total={stats.ownedSites}
              totalLabel={`of ${stats.ownedSites} total`}
              icon={<IconRocket size={14} />}
            />
            <MetricCard
              label="Views"
              value={stats.viewsLast7d}
              icon={<IconEye size={14} />}
            />
            <MetricCard
              label="Form submissions"
              value={stats.submissionsLast7d}
              icon={<IconForms size={14} />}
            />
            <MetricCard
              label="Shared with me"
              value={stats.sharedWithMe}
              icon={<IconUsers size={14} />}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="xl">
            <Card withBorder p="md">
              <Group gap={8} mb="sm">
                <IconCloud size={16} />
                <Text fw={600}>Team</Text>
              </Group>
              <Stack gap={4}>
                <Row label="Name" value={stats.team.name ?? '—'} />
                <Row
                  label="Slug"
                  value={stats.team.slug ? <Code>{stats.team.slug}</Code> : '—'}
                />
                <Row label="Plan" value={stats.team.plan ?? '—'} />
                <Row label="Members" value={stats.teamMembers.toLocaleString()} />
                <Row label="Your role" value={stats.team.role ?? '—'} />
              </Stack>
              <Group gap={8} mt="md">
                <Anchor component={Link} href="/team" size="sm">
                  Manage team →
                </Anchor>
              </Group>
            </Card>

            <Card withBorder p="md">
              <Group gap={8} mb="sm">
                <IconChartBar size={16} />
                <Text fw={600}>Workspace</Text>
              </Group>
              <Stack gap={4}>
                <Row label="Sites" value={stats.ownedSites.toLocaleString()} />
                <Row
                  label="Published"
                  value={stats.publishedSites.toLocaleString()}
                />
                <Row label="In trash" value={stats.trashedSites.toLocaleString()} />
                <Row
                  label="Shared with you"
                  value={stats.sharedWithMe.toLocaleString()}
                />
              </Stack>
              <Group gap={16} mt="md">
                <Anchor component={Link} href="/dashboard" size="sm">
                  Dashboard →
                </Anchor>
                {stats.trashedSites > 0 && (
                  <Anchor
                    component={Link}
                    href="/dashboard/trash"
                    size="sm"
                    c="dimmed"
                  >
                    <Group gap={4} wrap="nowrap">
                      <IconTrash size={12} />
                      Trash
                    </Group>
                  </Anchor>
                )}
              </Group>
            </Card>
          </SimpleGrid>

          <Title order={3} mb="md">
            Recent sites
          </Title>
          {stats.recentSites.length === 0 ? (
            <Card withBorder p="xl">
              <Stack align="center" gap="xs">
                <IconRocket size={24} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" size="sm">
                  No sites yet. Head to the dashboard to create your first one.
                </Text>
                <Button
                  component={Link}
                  href="/dashboard"
                  variant="light"
                  color="neon"
                  size="xs"
                  rightSection={<IconArrowRight size={14} />}
                  mt="xs"
                >
                  Open dashboard
                </Button>
              </Stack>
            </Card>
          ) : (
            <Card withBorder p={0}>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Updated</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {stats.recentSites.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Anchor
                          component={Link}
                          href={`/sites/${s.id}`}
                          fw={500}
                        >
                          {s.name}
                        </Anchor>
                        <Text size="xs" c="dimmed" ff="monospace">
                          /s/{s.slug}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {s.publishedAt ? (
                          <Badge size="sm" color="green">
                            published
                          </Badge>
                        ) : (
                          <Badge size="sm" color="gray">
                            draft
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="light" color="gray">
                          {s.role}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {new Date(s.updatedAt).toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Anchor component={Link} href={`/sites/${s.id}`} size="xs">
                          Open →
                        </Anchor>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </Group>
  );
}

function MetricCard({
  label,
  value,
  total,
  totalLabel,
  icon,
}: {
  label: string;
  value: number;
  total?: number;
  totalLabel?: string;
  icon?: React.ReactNode;
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
      <Text fz={32} fw={700} lh={1.1} c="neon.3">
        {value.toLocaleString()}
      </Text>
      {total !== undefined && totalLabel && (
        <Text size="xs" c="dimmed">
          {totalLabel}
        </Text>
      )}
    </Card>
  );
}

function SignOutAction({ isDevAuth }: { isDevAuth: boolean }) {
  if (isDevAuth) {
    return (
      <Button
        variant="default"
        size="sm"
        leftSection={<IconLogout size={14} />}
        disabled
        title="Dev auth mode — nothing to sign out of."
      >
        Sign out
      </Button>
    );
  }
  return <ClerkSignOutButton />;
}

function ClerkSignOutButton() {
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);
  const click = useCallback(async () => {
    setSigningOut(true);
    await signOut({ redirectUrl: '/sign-in' });
  }, [signOut]);
  return (
    <Button
      variant="default"
      size="sm"
      color="red"
      leftSection={<IconLogout size={14} />}
      onClick={click}
      loading={signingOut}
    >
      Sign out
    </Button>
  );
}
