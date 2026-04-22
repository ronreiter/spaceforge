import { Group, Text, Button, Progress, ActionIcon, Tooltip, Box } from '@mantine/core';
import {
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconDownload,
  IconTrash,
  IconSun,
  IconMoon,
  IconRocket,
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
};

export function TopBar(p: TopBarProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const dark = computed === 'dark';

  const statusColor =
    p.statusKind === 'ready' ? 'teal' : p.statusKind === 'error' ? 'red' : 'blue';

  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group gap="md" wrap="nowrap" align="center">
        <Group gap={10} wrap="nowrap" align="center">
          <IconRocket
            size={28}
            stroke={1.8}
            color="var(--mantine-color-neon-3)"
          />
          <Text fw={700} size="lg">
            Spaceforge
          </Text>
          <Text c="dimmed" size="xs">
            browser-local website builder
          </Text>
        </Group>

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

        <Button
          variant="light"
          size="xs"
          leftSection={<IconDownload size={14} />}
          onClick={p.onDownloadZip}
        >
          Download .zip
        </Button>
        <Button
          variant="light"
          color="red"
          size="xs"
          leftSection={<IconTrash size={14} />}
          onClick={p.onStartFresh}
        >
          Start fresh
        </Button>
      </Group>
    </Box>
  );
}
