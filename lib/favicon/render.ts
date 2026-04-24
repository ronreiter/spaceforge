// Raw iconNode lookups for the curated favicon palette. The @tabler
// package exports each icon's stroke-path data as a `__iconNode`
// constant on the icon's ESM file; we import the ones we care about
// here once so the favicon route can render them to an SVG string
// without pulling React into the server bundle.

import { __iconNode as rocket } from '@tabler/icons-react/dist/esm/icons/IconRocket.mjs';
import { __iconNode as flame } from '@tabler/icons-react/dist/esm/icons/IconFlame.mjs';
import { __iconNode as bolt } from '@tabler/icons-react/dist/esm/icons/IconBolt.mjs';
import { __iconNode as sparkles } from '@tabler/icons-react/dist/esm/icons/IconSparkles.mjs';
import { __iconNode as star } from '@tabler/icons-react/dist/esm/icons/IconStar.mjs';
import { __iconNode as heart } from '@tabler/icons-react/dist/esm/icons/IconHeart.mjs';
import { __iconNode as sun } from '@tabler/icons-react/dist/esm/icons/IconSun.mjs';
import { __iconNode as moon } from '@tabler/icons-react/dist/esm/icons/IconMoon.mjs';
import { __iconNode as diamond } from '@tabler/icons-react/dist/esm/icons/IconDiamond.mjs';
import { __iconNode as crown } from '@tabler/icons-react/dist/esm/icons/IconCrown.mjs';
import { __iconNode as trophy } from '@tabler/icons-react/dist/esm/icons/IconTrophy.mjs';
import { __iconNode as bread } from '@tabler/icons-react/dist/esm/icons/IconBread.mjs';
import { __iconNode as coffee } from '@tabler/icons-react/dist/esm/icons/IconCoffee.mjs';
import { __iconNode as cake } from '@tabler/icons-react/dist/esm/icons/IconCake.mjs';
import { __iconNode as pizza } from '@tabler/icons-react/dist/esm/icons/IconPizza.mjs';
import { __iconNode as bottle } from '@tabler/icons-react/dist/esm/icons/IconBottle.mjs';
import { __iconNode as glass } from '@tabler/icons-react/dist/esm/icons/IconGlass.mjs';
import { __iconNode as meat } from '@tabler/icons-react/dist/esm/icons/IconMeat.mjs';
import { __iconNode as carrot } from '@tabler/icons-react/dist/esm/icons/IconCarrot.mjs';
import { __iconNode as fish } from '@tabler/icons-react/dist/esm/icons/IconFish.mjs';
import { __iconNode as leaf } from '@tabler/icons-react/dist/esm/icons/IconLeaf.mjs';
import { __iconNode as plant } from '@tabler/icons-react/dist/esm/icons/IconPlant.mjs';
import { __iconNode as tree } from '@tabler/icons-react/dist/esm/icons/IconTree.mjs';
import { __iconNode as flower } from '@tabler/icons-react/dist/esm/icons/IconFlower.mjs';
import { __iconNode as mountain } from '@tabler/icons-react/dist/esm/icons/IconMountain.mjs';
import { __iconNode as cloud } from '@tabler/icons-react/dist/esm/icons/IconCloud.mjs';
import { __iconNode as snowflake } from '@tabler/icons-react/dist/esm/icons/IconSnowflake.mjs';
import { __iconNode as code } from '@tabler/icons-react/dist/esm/icons/IconCode.mjs';
import { __iconNode as cpu } from '@tabler/icons-react/dist/esm/icons/IconCpu.mjs';
import { __iconNode as terminal } from '@tabler/icons-react/dist/esm/icons/IconTerminal.mjs';
import { __iconNode as robot } from '@tabler/icons-react/dist/esm/icons/IconRobot.mjs';
import { __iconNode as bug } from '@tabler/icons-react/dist/esm/icons/IconBug.mjs';
import { __iconNode as brain } from '@tabler/icons-react/dist/esm/icons/IconBrain.mjs';
import { __iconNode as atom } from '@tabler/icons-react/dist/esm/icons/IconAtom.mjs';
import { __iconNode as settings } from '@tabler/icons-react/dist/esm/icons/IconSettings.mjs';
import { __iconNode as home } from '@tabler/icons-react/dist/esm/icons/IconHome.mjs';
import { __iconNode as building } from '@tabler/icons-react/dist/esm/icons/IconBuilding.mjs';
import { __iconNode as buildingStore } from '@tabler/icons-react/dist/esm/icons/IconBuildingStore.mjs';
import { __iconNode as book } from '@tabler/icons-react/dist/esm/icons/IconBook.mjs';
import { __iconNode as camera } from '@tabler/icons-react/dist/esm/icons/IconCamera.mjs';
import { __iconNode as music } from '@tabler/icons-react/dist/esm/icons/IconMusic.mjs';
import { __iconNode as palette } from '@tabler/icons-react/dist/esm/icons/IconPalette.mjs';
import { __iconNode as brush } from '@tabler/icons-react/dist/esm/icons/IconBrush.mjs';
import { __iconNode as scissors } from '@tabler/icons-react/dist/esm/icons/IconScissors.mjs';
import { __iconNode as hammer } from '@tabler/icons-react/dist/esm/icons/IconHammer.mjs';
import { __iconNode as mapPin } from '@tabler/icons-react/dist/esm/icons/IconMapPin.mjs';
import { __iconNode as paw } from '@tabler/icons-react/dist/esm/icons/IconPaw.mjs';
import { __iconNode as ballFootball } from '@tabler/icons-react/dist/esm/icons/IconBallFootball.mjs';
import { __iconNode as letterA } from '@tabler/icons-react/dist/esm/icons/IconLetterA.mjs';
import { __iconNode as letterS } from '@tabler/icons-react/dist/esm/icons/IconLetterS.mjs';
import { __iconNode as hash } from '@tabler/icons-react/dist/esm/icons/IconHash.mjs';
import { __iconNode as asterisk } from '@tabler/icons-react/dist/esm/icons/IconAsterisk.mjs';
import { __iconNode as infinity } from '@tabler/icons-react/dist/esm/icons/IconInfinity.mjs';
import { __iconNode as square } from '@tabler/icons-react/dist/esm/icons/IconSquare.mjs';
import { __iconNode as triangle } from '@tabler/icons-react/dist/esm/icons/IconTriangle.mjs';
import { __iconNode as circle } from '@tabler/icons-react/dist/esm/icons/IconCircle.mjs';
import { DEFAULT_FAVICON_ICON, FAVICON_PALETTE } from './palette';

type IconNode = Array<[string, Record<string, string | number>]>;

// Name (palette key) → iconNode data. Stays in sync with the palette
// via a paranoid fallback at runtime: if someone edits the palette
// without updating this table, we serve the default.
const REGISTRY: Record<string, IconNode> = {
  rocket,
  flame,
  bolt,
  sparkles,
  star,
  heart,
  sun,
  moon,
  diamond,
  crown,
  trophy,
  bread,
  coffee,
  cake,
  pizza,
  bottle,
  glass,
  meat,
  carrot,
  fish,
  leaf,
  plant,
  tree,
  flower,
  mountain,
  cloud,
  snowflake,
  code,
  cpu,
  terminal,
  robot,
  bug,
  brain,
  atom,
  settings,
  home,
  building,
  'building-store': buildingStore,
  book,
  camera,
  music,
  palette,
  brush,
  scissors,
  hammer,
  'map-pin': mapPin,
  paw,
  'ball-football': ballFootball,
  'letter-a': letterA,
  'letter-s': letterS,
  hash,
  asterisk,
  infinity,
  square,
  triangle,
  circle,
};

function escapeAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function renderFaviconSvg(
  rawName: string | null | undefined,
  options: { color?: string; bg?: string; size?: number } = {},
): string {
  const key =
    rawName && FAVICON_PALETTE.includes(rawName) ? rawName : DEFAULT_FAVICON_ICON;
  const node = REGISTRY[key] ?? REGISTRY[DEFAULT_FAVICON_ICON];
  const color = options.color ?? '#ccff00';
  const bg = options.bg ?? '#0a0a0a';
  const size = options.size ?? 64;

  const bodyParts: string[] = [];
  for (const [tag, attrs] of node) {
    const attrStr = Object.entries(attrs)
      .filter(([k]) => k !== 'key')
      .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
      .join(' ');
    bodyParts.push(`<${tag} ${attrStr}/>`);
  }

  // Dark rounded square behind the stroked glyph so it reads at tab
  // size. The inner group is scaled down to leave room for the frame.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
<rect width="24" height="24" rx="5" fill="${bg}"/>
<g stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(2 2) scale(0.833)">
${bodyParts.join('\n')}
</g>
</svg>`;
}
