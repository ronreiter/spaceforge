'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Title,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconRocket,
  IconFlame,
  IconBolt,
  IconSparkles,
  IconStar,
  IconHeart,
  IconSun,
  IconMoon,
  IconDiamond,
  IconCrown,
  IconTrophy,
  IconBread,
  IconCoffee,
  IconCake,
  IconPizza,
  IconBottle,
  IconGlass,
  IconMeat,
  IconCarrot,
  IconFish,
  IconLeaf,
  IconPlant,
  IconTree,
  IconFlower,
  IconMountain,
  IconCloud,
  IconSnowflake,
  IconCode,
  IconCpu,
  IconTerminal,
  IconRobot,
  IconBug,
  IconBrain,
  IconAtom,
  IconSettings,
  IconHome,
  IconBuilding,
  IconBuildingStore,
  IconBook,
  IconCamera,
  IconMusic,
  IconPalette,
  IconBrush,
  IconScissors,
  IconHammer,
  IconMapPin,
  IconPaw,
  IconBallFootball,
  IconLetterA,
  IconLetterS,
  IconHash,
  IconAsterisk,
  IconInfinity,
  IconSquare,
  IconTriangle,
  IconCircle,
  IconSearch,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

// One-shot mapping from palette name → preview component. Keep in sync
// with lib/favicon/palette.ts — any name listed in a group but missing
// here will render a blank square.
const ICON_COMPONENTS: Record<string, ComponentType<{ size?: number; stroke?: number }>> = {
  rocket: IconRocket,
  flame: IconFlame,
  bolt: IconBolt,
  sparkles: IconSparkles,
  star: IconStar,
  heart: IconHeart,
  sun: IconSun,
  moon: IconMoon,
  diamond: IconDiamond,
  crown: IconCrown,
  trophy: IconTrophy,
  bread: IconBread,
  coffee: IconCoffee,
  cake: IconCake,
  pizza: IconPizza,
  bottle: IconBottle,
  glass: IconGlass,
  meat: IconMeat,
  carrot: IconCarrot,
  fish: IconFish,
  leaf: IconLeaf,
  plant: IconPlant,
  tree: IconTree,
  flower: IconFlower,
  mountain: IconMountain,
  cloud: IconCloud,
  snowflake: IconSnowflake,
  code: IconCode,
  cpu: IconCpu,
  terminal: IconTerminal,
  robot: IconRobot,
  bug: IconBug,
  brain: IconBrain,
  atom: IconAtom,
  settings: IconSettings,
  home: IconHome,
  building: IconBuilding,
  'building-store': IconBuildingStore,
  book: IconBook,
  camera: IconCamera,
  music: IconMusic,
  palette: IconPalette,
  brush: IconBrush,
  scissors: IconScissors,
  hammer: IconHammer,
  'map-pin': IconMapPin,
  paw: IconPaw,
  'ball-football': IconBallFootball,
  'letter-a': IconLetterA,
  'letter-s': IconLetterS,
  hash: IconHash,
  asterisk: IconAsterisk,
  infinity: IconInfinity,
  square: IconSquare,
  triangle: IconTriangle,
  circle: IconCircle,
};

const GROUPS: Array<{ label: string; icons: string[] }> = [
  {
    label: 'Brand marks',
    icons: ['rocket', 'flame', 'bolt', 'sparkles', 'star', 'heart', 'sun', 'moon', 'diamond', 'crown', 'trophy'],
  },
  {
    label: 'Food & drink',
    icons: ['bread', 'coffee', 'cake', 'pizza', 'bottle', 'glass', 'meat', 'carrot', 'fish'],
  },
  {
    label: 'Nature',
    icons: ['leaf', 'plant', 'tree', 'flower', 'mountain', 'cloud', 'snowflake'],
  },
  {
    label: 'Tech',
    icons: ['code', 'cpu', 'terminal', 'robot', 'bug', 'brain', 'atom', 'settings'],
  },
  {
    label: 'Places & things',
    icons: [
      'home',
      'building',
      'building-store',
      'book',
      'camera',
      'music',
      'palette',
      'brush',
      'scissors',
      'hammer',
      'map-pin',
      'paw',
      'ball-football',
    ],
  },
  {
    label: 'Letters & abstract',
    icons: ['letter-a', 'letter-s', 'hash', 'asterisk', 'infinity', 'square', 'triangle', 'circle'],
  },
];

export function FaviconModal({
  siteId,
  opened,
  onClose,
  onSaved,
}: {
  siteId: string;
  opened: boolean;
  onClose: () => void;
  onSaved?: (icon: string | null) => void;
}) {
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    fetch(`/api/sites/${siteId}/favicon`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { favicon: string | null };
        if (!cancelled) setCurrent(body.favicon);
      })
      .catch(() => {
        /* leave as null */
      });
    return () => {
      cancelled = true;
    };
  }, [opened, siteId]);

  async function save(icon: string | null) {
    setSaving(true);
    const res = await fetch(`/api/sites/${siteId}/favicon`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ icon }),
    });
    setSaving(false);
    if (!res.ok) return;
    setCurrent(icon);
    onSaved?.(icon);
  }

  const filter = query.trim().toLowerCase();
  const filteredGroups = filter
    ? GROUPS.map((g) => ({
        ...g,
        icons: g.icons.filter((i) => i.includes(filter)),
      })).filter((g) => g.icons.length > 0)
    : GROUPS;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Choose a favicon"
      size="lg"
      centered
    >
      <Stack>
        <TextInput
          placeholder="Search icons (e.g. rocket, coffee, star)…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
        />
        <Group gap="sm" align="center">
          <Text size="sm" c="dimmed">
            Current:
          </Text>
          <FaviconPreview name={current} />
          <Text size="sm" ff="monospace">
            {current ? `ti-${current}` : '(default: ti-rocket)'}
          </Text>
          {current && (
            <Button
              variant="subtle"
              size="xs"
              color="red"
              onClick={() => save(null)}
              disabled={saving}
            >
              Reset
            </Button>
          )}
        </Group>
        <ScrollArea.Autosize mah={440}>
          <Stack gap="md">
            {filteredGroups.map((g) => (
              <Stack key={g.label} gap={6}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.08em' }}>
                  {g.label}
                </Text>
                <Group gap={6}>
                  {g.icons.map((name) => {
                    const Comp = ICON_COMPONENTS[name];
                    const selected = current === name;
                    return (
                      <UnstyledButton
                        key={name}
                        onClick={() => save(name)}
                        aria-label={`Use ${name} as favicon`}
                        title={`ti-${name}`}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `2px solid ${
                            selected
                              ? 'var(--mantine-color-neon-3)'
                              : 'var(--mantine-color-dark-5)'
                          }`,
                          background: selected
                            ? 'var(--mantine-color-dark-6)'
                            : 'var(--mantine-color-dark-7)',
                          color: 'var(--mantine-color-neon-3)',
                          opacity: saving ? 0.5 : 1,
                          cursor: saving ? 'wait' : 'pointer',
                          transition: 'border-color 150ms ease',
                        }}
                      >
                        {Comp ? <Comp size={22} stroke={1.8} /> : null}
                      </UnstyledButton>
                    );
                  })}
                </Group>
              </Stack>
            ))}
            {filteredGroups.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No icons matching "{query}".
              </Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
}

function FaviconPreview({ name }: { name: string | null }) {
  const n = name ?? 'rocket';
  const Comp = ICON_COMPONENTS[n] ?? IconRocket;
  return (
    <Box
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ccff00',
      }}
    >
      <Comp size={20} stroke={1.8} />
    </Box>
  );
}
