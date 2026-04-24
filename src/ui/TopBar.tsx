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
  IconChevronDown,
  IconEye,
  IconHistory,
  IconRocket,
  IconRocketOff,
  IconSun,
  IconMoon,
  IconTrash,
} from '@tabler/icons-react';
import { ModelSelector } from './ModelSelector';
import { AppBrand } from './AppBrand';

export type TopBarProps = {
  modelId: string;
  downloaded: Set<string>;
  onModelChange: (id: string) => void;
  status: string;
  statusKind: 'loading' | 'ready' | 'error';
  progressPct?: number;
  onStartFresh: () => void;
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
  // Save indicator — true while a flush is in flight.
  saving?: boolean;
  // ms-since-epoch of the last acknowledged server save. null until the
  // first save completes.
  lastSavedAt?: number | null;
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

// Small inline indicator to the right of the site identity cluster.
// "Saving…" while a flush is in flight, "Saved Nm ago" afterwards.
// Returns null before the first save so it doesn't flash in the empty
// state.
function SaveIndicator({
  saving,
  lastSavedAt,
}: {
  saving?: boolean;
  lastSavedAt?: number | null;
}) {
  // Force a rerender every 30s so "Saved 3m ago" keeps pace without a
  // full-tree tick.
  const [, force] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  if (saving) {
    return (
      <Text size="xs" c="dimmed" fs="italic">
        Saving…
      </Text>
    );
  }
  if (!lastSavedAt) return null;
  const sec = Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000));
  let label: string;
  if (sec < 5) label = 'Saved';
  else if (sec < 60) label = `Saved ${sec}s ago`;
  else if (sec < 3600) label = `Saved ${Math.round(sec / 60)}m ago`;
  else label = `Saved ${Math.round(sec / 3600)}h ago`;
  return (
    <Text size="xs" c="dimmed">
      {label}
    </Text>
  );
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
        {hasSite ? (
          // Inside the editor we only show the rocket mark so the site
          // name gets the breathing room next to it.
          <Group gap={8} wrap="nowrap" align="center">
            <IconRocket
              size={24}
              stroke={1.8}
              color="var(--mantine-color-neon-3)"
            />
          </Group>
        ) : (
          <AppBrand size="md" linkToDashboard={false} subtitle="browser-local website builder" />
        )}
        {hasSite && (
          <Group gap={8} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            <Box style={{ minWidth: 0 }}>
              <Text
                fw={700}
                size="md"
                lh={1.15}
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 320,
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
                  maxWidth: 320,
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
            <SaveIndicator saving={p.saving} lastSavedAt={p.lastSavedAt} />
          </Group>
        )}

        <ModelSelector
          value={p.modelId}
          downloaded={p.downloaded}
          onChange={p.onModelChange}
        />

        <Box style={{ flex: 1, minWidth: 200 }}>
          {/* When the model is idle-ready the selector already tells the
            * user everything ("Gemma 4 E4B (default) · 4.5 GB · cached"),
            * so suppress the redundant "… ready" line. The status stays
            * visible for loading / error / progress states. */}
          {p.statusKind !== 'ready' && (
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
          )}
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
        {hasSite && p.publishedAt && (
          <Tooltip label="Open published site">
            <Anchor href={`/s/${p.siteSlug}/`} target="_blank" rel="noopener">
              <Button variant="light" size="xs" leftSection={<IconEye size={14} />} component="span">
                View
              </Button>
            </Anchor>
          </Tooltip>
        )}
        {hasSite && canWrite && (
          <PublishSplitButton
            siteId={p.siteId ?? null}
            publishedAt={p.publishedAt ?? null}
            publishedVersionId={p.publishedVersionId ?? null}
            publishing={!!p.publishing}
            onPublish={p.onPublish}
            onUnpublish={p.onUnpublish}
            onVersionChanged={p.onVersionChanged}
          />
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

// Split button: the primary action is Publish / Republish; clicking the
// chevron on the right opens a dropdown with Unpublish + the most recent
// publish versions (one-click activate to roll back or forward).
//
// A single combined control keeps the top-bar dense and gives the user
// one place to find everything publish-related instead of three
// neighbouring buttons.
function PublishSplitButton({
  siteId,
  publishedAt,
  publishedVersionId,
  publishing,
  onPublish,
  onUnpublish,
  onVersionChanged,
}: {
  siteId: string | null;
  publishedAt: string | null;
  publishedVersionId: string | null;
  publishing: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onVersionChanged?: (publishedAt: string, versionId: string) => void;
}) {
  const hasPublished = !!publishedAt;
  const label = hasPublished ? 'Republish' : 'Publish';
  return (
    <Button.Group>
      <Button
        size="xs"
        leftSection={<IconRocket size={14} />}
        onClick={onPublish}
        loading={publishing}
      >
        {label}
      </Button>
      <Menu position="bottom-end" shadow="md" width={320} closeOnItemClick={false}>
        <Menu.Target>
          <Button
            size="xs"
            px={6}
            aria-label={`${label} options`}
            disabled={publishing}
          >
            <IconChevronDown size={14} />
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {hasPublished && onUnpublish && (
            <Menu.Item
              color="red"
              leftSection={<IconRocketOff size={14} />}
              onClick={onUnpublish}
              closeMenuOnClick
            >
              Unpublish
            </Menu.Item>
          )}
          {hasPublished && onUnpublish && <Menu.Divider />}
          <Menu.Label>
            <Group gap={6} wrap="nowrap">
              <IconHistory size={12} />
              <Text size="xs">Version history</Text>
            </Group>
          </Menu.Label>
          {siteId && hasPublished ? (
            <VersionHistoryInline
              siteId={siteId}
              publishedVersionId={publishedVersionId}
              onVersionChanged={onVersionChanged}
            />
          ) : (
            <Menu.Item disabled>
              <Text size="xs" c="dimmed">
                Publish to start tracking versions.
              </Text>
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </Button.Group>
  );
}

// Body of the version-history dropdown: lazily fetches on first mount,
// one-click activate flips sites.published_version_id. Artifacts are
// immutable in Blob so this is just a DB pointer swap — no re-render,
// no new uploads.
function VersionHistoryInline({
  siteId,
  publishedVersionId,
  onVersionChanged,
}: {
  siteId: string;
  publishedVersionId: string | null;
  onVersionChanged?: (publishedAt: string, versionId: string) => void;
}) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
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
  }, [siteId, publishedVersionId]);

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

  if (loading) {
    return (
      <Menu.Item disabled>
        <Text size="xs" c="dimmed">Loading…</Text>
      </Menu.Item>
    );
  }
  if (error) {
    return (
      <Menu.Item disabled>
        <Text size="xs" c="red">{error}</Text>
      </Menu.Item>
    );
  }
  if (versions.length === 0) {
    return (
      <Menu.Item disabled>
        <Text size="xs" c="dimmed">No published versions yet.</Text>
      </Menu.Item>
    );
  }
  return (
    <>
      {versions.slice(0, 10).map((v) => (
        <Menu.Item key={v.id} closeMenuOnClick={false} component="div">
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Group gap={6} wrap="nowrap">
                <Text size="xs" fw={500}>
                  {formatTimeAgo(v.publishedAt)}
                </Text>
                {v.isCurrent && (
                  <Badge size="xs" color="green" leftSection={<IconCheck size={8} />}>
                    live
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {v.artifactCount} files · {formatBytes(v.totalBytes)}
              </Text>
            </Stack>
            {!v.isCurrent && (
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
    </>
  );
}
