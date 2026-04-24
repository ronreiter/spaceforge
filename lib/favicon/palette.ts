// Curated Tabler icon palette for the favicon picker. The full Tabler
// set has ~4000 icons; we only expose the ones that make sense as a
// brand mark. Names are without the `ti-` prefix so they map cleanly
// to @tabler/icons-react component names (e.g. "rocket" → IconRocket).
//
// Keep this list grouped by theme so the picker can render sections.

export type FaviconGroup = {
  label: string;
  icons: string[];
};

export const FAVICON_GROUPS: FaviconGroup[] = [
  {
    label: 'Brand marks',
    icons: [
      'rocket',
      'flame',
      'bolt',
      'sparkles',
      'star',
      'heart',
      'sun',
      'moon',
      'diamond',
      'crown',
      'trophy',
    ],
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

export const FAVICON_PALETTE: string[] = FAVICON_GROUPS.flatMap((g) => g.icons);

export function isInPalette(name: string): boolean {
  return FAVICON_PALETTE.includes(name);
}

export const DEFAULT_FAVICON_ICON = 'rocket';
