import { useEffect, useState } from 'react';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Progress,
  ActionIcon,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconDownload,
  IconEye,
  IconRocket,
  IconRocketOff,
  IconSun,
  IconMoon,
  IconTrash,
} from '@tabler/icons-react';
import { ModelSelector } from './ModelSelector';

export type TopBarProps = {
  modelId: string;
  downloaded: Set<string>;
  onModelChange: (id: string) => void;
  status: string;
  statusKind: 'loading' | 'ready' | 'error';
  progressPct?: number;
  onStartFresh: () => void;
  onDownloadZip: () => void;
  // Multi-tenant site context (optional — only set at /sites/:id):
  dashboardHref?: string;
  siteId?: string;
  siteName?: string;
  siteSlug?: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  publishedAt?: string | null;
  publishedVersionId?: string | null;
  publishing?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onVersionChanged?: (publishedAt: string, versionId: string) => void;
};

type VersionSummary = {
  id: string;
  publishedAt: string;
  authorId: string;
  artifactCount: number;
  totalBytes: number;
  isCurrent: boolean;
};

function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function TopBar(p: TopBarProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const dark = computed === 'dark';

  const statusColor =
    p.statusKind === 'ready' ? 'teal' : p.statusKind === 'error' ? 'red' : 'blue';

  const hasSite = typeof p.siteSlug === 'string';
  const canWrite =
    !hasSite || p.role === 'owner' || p.role === 'admin' || p.role === 'editor';

  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group gap="md" wrap="nowrap" align="center">
        {p.dashboardHref && (
          <Tooltip label="Back to dashboard">
            <Anchor href={p.dashboardHref} c="dimmed">
              <Group gap={4} wrap="nowrap">
                <IconArrowLeft size={14} />
                <Text size="xs">Dashboard</Text>
              </Group>
            </Anchor>
          </Tooltip>
        )}
        <Group gap={8} wrap="nowrap" align="center">
          <IconRocket
            size={24}
            stroke={1.8}
            color="var(--mantine-color-neon-3)"
          />
          {!hasSite && (
            <>
              <Text fw={700} size="md">
                Spaceforge
              </Text>
              <Text c="dimmed" size="xs" visibleFrom="md">
                browser-local website builder
              </Text>
            </>
          )}
        </Group>
        {hasSite && (
          <Group gap={8} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            <Box style={{ minWidth: 0 }}>
              <Text
                fw={600}
                size="sm"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 220,
                }}
              >
                {p.siteName}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                ff="monospace"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 220,
                }}
              >
                /s/{p.siteSlug}
              </Text>
            </Box>
            {!canWrite && (
              <Badge size="xs" color="blue">
                {p.role}
              </Badge>
            )}
          </Group>
        )}

        <ModelSelector
          value={p.modelId}
          downloaded={p.downloaded}
          onChange={p.onModelChange}
        />

        <Box style={{ flex: 1, minWidth: 200 }}>
          <Text
            size="xs"
            c={statusColor}
            style={{
              fontFamily: 'var(--mantine-font-family-monospace)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {p.status}
          </Text>
          {p.progressPct !== undefined && p.progressPct >= 0 && p.progressPct < 100 && (
            <Progress
              value={p.progressPct}
              size="xs"
              mt={4}
              animated
              color="blue"
              transitionDuration={150}
            />
          )}
        </Box>

        <Tooltip label={dark ? 'Light mode' : 'Dark mode'}>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Toggle color scheme"
            onClick={() => setColorScheme(dark ? 'light' : 'dark')}
          >
            {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Download .zip">
          <ActionIcon
            variant="default"
            size="lg"
            onClick={p.onDownloadZip}
            aria-label="Download .zip"
          >
            <IconDownload size={16} />
          </ActionIcon>
        </Tooltip>
        {hasSite && p.publishedAt && (
          <Tooltip label="Open published site">
            <Anchor href={`/s/${p.siteSlug}/`} target="_blank" rel="noopener">
              <Button variant="light" size="xs" leftSection={<IconEye size={14} />} component="span">
                View
              </Button>
            </Anchor>
          </Tooltip>
        )}
        {hasSite && p.siteId && p.publishedAt && (
          <VersionHistoryMenu
            siteId={p.siteId}
            publishedVersionId={p.publishedVersionId ?? null}
            canActivate={canWrite}
            onVersionChanged={p.onVersionChanged}
          />
        )}
        {hasSite && canWrite && p.publishedAt && (
          <Button
            variant="light"
            color="red"
            size="xs"
            leftSection={<IconRocketOff size={14} />}
            onClick={p.onUnpublish}
            loading={p.publishing}
          >
            Unpublish
          </Button>
        )}
        {hasSite &&
          (p.publishedAt ? (
            <Badge size="xs" color="green">
              published
            </Badge>
          ) : (
            <Badge size="xs" color="gray">
              draft
            </Badge>
          ))}
        {hasSite && canWrite && (
          <Button
            size="xs"
            leftSection={<IconRocket size={14} />}
            onClick={p.onPublish}
            loading={p.publishing}
          >
            {p.publishedAt ? 'Republish' : 'Publish'}
          </Button>
        )}
        {!hasSite && (
          <Button
            variant="light"
            color="red"
            size="xs"
            leftSection={<IconTrash size={14} />}
            onClick={p.onStartFresh}
          >
            Start fresh
          </Button>
        )}
      </Group>
    </Box>
  );
}

// Version history popover: latest N publishes with a one-click
// "activate" button that pivots sites.published_version_id. Artifacts
// are immutable in Blob so this is just a DB pointer swap — no
// re-render, no new uploads.
function VersionHistoryMenu({
  siteId,
  publishedVersionId,
  canActivate,
  onVersionChanged,
}: {
  siteId: string;
  publishedVersionId: string | null;
  canActivate: boolean;
  onVersionChanged?: (publishedAt: string, versionId: string) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/sites/${siteId}/versions`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { versions: VersionSummary[] };
        if (!cancelled) setVersions(body.versions);
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
  }, [opened, siteId, publishedVersionId]);

  async function activate(versionId: string) {
    setActivating(versionId);
    try {
      const res = await fetch(
        `/api/sites/${siteId}/versions/${versionId}/activate`,
        { method: 'POST', credentials: 'same-origin' },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as {
        result: { publishedAt: string };
      };
      onVersionChanged?.(body.result.publishedAt, versionId);
      setVersions((vs) =>
        vs.map((v) => ({ ...v, isCurrent: v.id === versionId })),
      );
    } finally {
      setActivating(null);
    }
  }

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      shadow="md"
      width={320}
      closeOnItemClick={false}
    >
      <Menu.Target>
        <Tooltip label="Version history">
          <ActionIcon variant="default" size="lg" aria-label="Version history">
            <IconClock size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Recent publishes</Menu.Label>
        {loading && (
          <Menu.Item disabled>
            <Text size="xs" c="dimmed">
              Loading…
            </Text>
          </Menu.Item>
        )}
        {error && (
          <Menu.Item disabled>
            <Text size="xs" c="red">
              {error}
            </Text>
          </Menu.Item>
        )}
        {!loading && !error && versions.length === 0 && (
          <Menu.Item disabled>
            <Text size="xs" c="dimmed">
              No published versions yet.
            </Text>
          </Menu.Item>
        )}
        {versions.slice(0, 10).map((v) => (
          <Menu.Item key={v.id} closeMenuOnClick={false} component="div">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" fw={500}>
                    {formatTimeAgo(v.publishedAt)}
                  </Text>
                  {v.isCurrent && (
                    <Badge
                      size="xs"
                      color="green"
                      leftSection={<IconCheck size={8} />}
                    >
                      live
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  {v.artifactCount} files · {formatBytes(v.totalBytes)}
                </Text>
              </Stack>
              {canActivate && !v.isCurrent && (
                <Button
                  size="xs"
                  variant="light"
                  loading={activating === v.id}
                  onClick={() => activate(v.id)}
                >
                  Activate
                </Button>
              )}
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
