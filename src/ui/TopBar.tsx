import {
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Progress,
  ActionIcon,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconArrowLeft,
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
  siteName?: string;
  siteSlug?: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  publishedAt?: string | null;
  publishing?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
};

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
            {p.publishedAt ? (
              <Badge size="xs" color="green">
                published
              </Badge>
            ) : (
              <Badge size="xs" color="gray">
                draft
              </Badge>
            )}
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
