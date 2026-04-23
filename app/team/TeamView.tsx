'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Anchor,
  AppShell,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import type { AuthedUser } from '../../lib/auth/types';
import type { TeamMemberRow, TeamRole } from '../../lib/sharing/service';
import { useAlert, useConfirm } from '../../src/ui/dialogs';

const MANAGEABLE_ROLES: { value: TeamRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export function TeamView({
  user,
  members: initial,
}: {
  user: AuthedUser;
  members: TeamMemberRow[];
}) {
  const [members, setMembers] = useState(initial);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('editor');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmDialog = useConfirm();
  const alertDialog = useAlert();

  const selfRole = members.find((m) => m.userId === user.id)?.role;
  const canManage = selfRole === 'owner' || selfRole === 'admin';

  async function invite() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/teams/current/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `HTTP ${res.status}`);
      setBusy(false);
      return;
    }
    const body = (await res.json()) as { member: TeamMemberRow };
    setMembers((ms) => {
      const others = ms.filter((m) => m.userId !== body.member.userId);
      return [body.member, ...others];
    });
    setOpen(false);
    setEmail('');
    setRole('editor');
    setBusy(false);
  }

  async function changeRole(userId: string, newRole: TeamRole) {
    const res = await fetch(`/api/teams/current/members/${userId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      await alertDialog({
        title: 'Role change failed',
        message: body?.error ?? `HTTP ${res.status}`,
      });
      return;
    }
    setMembers((ms) =>
      ms.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
    );
  }

  async function remove(userId: string, email: string) {
    const ok = await confirmDialog({
      title: 'Remove from team?',
      message: (
        <>
          <b>{email}</b> will lose access to every site in this team. They keep
          any ad-hoc per-site shares.
        </>
      ),
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/teams/current/members/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      await alertDialog({
        title: 'Remove failed',
        message: body?.error ?? `HTTP ${res.status}`,
      });
      return;
    }
    setMembers((ms) => ms.filter((m) => m.userId !== userId));
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
              <Badge leftSection={<IconUsers size={12} />} size="sm" variant="light">
                Team
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {user.email}
            </Text>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          <Group justify="space-between" mb="lg">
            <Title order={2}>Team members</Title>
            {canManage && (
              <Button leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>
                Invite member
              </Button>
            )}
          </Group>

          <Box>
            <Table verticalSpacing="sm" withTableBorder withColumnBorders={false}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Member</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Joined</Table.Th>
                  <Table.Th style={{ width: 64 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((m) => {
                  const isSelf = m.userId === user.id;
                  return (
                    <Table.Tr key={m.userId}>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm" fw={500}>
                            {m.name ?? m.email}
                            {isSelf && (
                              <Text span c="dimmed" size="xs" ml={6}>
                                (you)
                              </Text>
                            )}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {m.email}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {m.role === 'owner' || !canManage || isSelf ? (
                          <Badge
                            variant="light"
                            color={m.role === 'owner' ? 'grape' : 'blue'}
                          >
                            {m.role}
                          </Badge>
                        ) : (
                          <Select
                            size="xs"
                            value={m.role}
                            onChange={(v) =>
                              v && changeRole(m.userId, v as TeamRole)
                            }
                            data={MANAGEABLE_ROLES}
                            w={120}
                            allowDeselect={false}
                          />
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {canManage && !isSelf && m.role !== 'owner' && (
                          <Tooltip label="Remove from team">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => remove(m.userId, m.email)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Box>
        </Container>
      </AppShell.Main>

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title="Invite a team member"
        centered
      >
        <Stack>
          <TextInput
            label="Email"
            placeholder="alice@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <Select
            label="Role"
            value={role}
            onChange={(v) => v && setRole(v as TeamRole)}
            data={MANAGEABLE_ROLES}
            allowDeselect={false}
          />
          <Text size="xs" c="dimmed">
            In dev mode, this creates a fake user record on the fly. In
            production, the user must already have a Spaceforge account.
          </Text>
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={invite} loading={busy}>
              Invite
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}

