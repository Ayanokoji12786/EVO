import type { Organism } from '../simulation/types';

// An original small pixel-art humanoid, in the spirit of retro 8-/16-bit game
// sprites (headband, overalls, boots) — not a reproduction of any specific
// copyrighted artwork. Each cell indexes into a per-organism palette computed
// from its genome, so the same silhouette reads as a different "character"
// depending on species, diet, climate adaptation, etc.
//
// Legend: 0 transparent, 1 hair, 2 headband, 3 headband tail, 4 skin, 5 eye,
// 6 outfit main, 7 outfit secondary (arms/undershirt), 8 belt, 9 boots.

const IDLE_FRAME: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0],
  [0, 3, 2, 2, 2, 2, 2, 2, 0],
  [0, 3, 1, 4, 4, 4, 4, 1, 0],
  [0, 0, 4, 4, 5, 4, 4, 0, 0],
  [0, 0, 4, 4, 4, 4, 4, 0, 0],
  [0, 0, 7, 6, 6, 6, 7, 0, 0],
  [0, 4, 6, 6, 6, 6, 6, 4, 0],
  [0, 4, 6, 6, 6, 6, 6, 4, 0],
  [0, 0, 6, 6, 8, 6, 6, 0, 0],
  [0, 0, 6, 6, 0, 6, 6, 0, 0],
  [0, 0, 6, 6, 0, 6, 6, 0, 0],
  [0, 0, 9, 9, 0, 9, 9, 0, 0],
];

// Walk frame: legs splayed instead of together, arms swung slightly.
const WALK_FRAME: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0],
  [0, 3, 2, 2, 2, 2, 2, 2, 0],
  [0, 3, 1, 4, 4, 4, 4, 1, 0],
  [0, 0, 4, 4, 5, 4, 4, 0, 0],
  [0, 0, 4, 4, 4, 4, 4, 0, 0],
  [0, 0, 7, 6, 6, 6, 7, 0, 0],
  [4, 0, 6, 6, 6, 6, 6, 0, 4],
  [0, 4, 6, 6, 6, 6, 6, 4, 0],
  [0, 0, 6, 6, 8, 6, 6, 0, 0],
  [0, 6, 6, 0, 0, 0, 6, 6, 0],
  [0, 6, 6, 0, 0, 0, 6, 6, 0],
  [9, 9, 0, 0, 0, 0, 0, 9, 9],
];

const FRAMES = [IDLE_FRAME, WALK_FRAME];
const GRID_W = 9;
const GRID_H = 13;
const CELL_PX = 3; // offscreen pixel-art resolution per grid cell

export interface CreaturePalette {
  hair: string;
  headband: string;
  headbandTail: string;
  skin: string;
  eye: string;
  outfitMain: string;
  outfitSecondary: string;
  belt: string;
  boots: string;
}

const HAIR_COLORS = ['#2b1a12', '#1a1a1a', '#4a2f1a', '#6b4a2a', '#8a5a2a'];

function hsl(h: number, s: number, l: number): string {
  return `hsl(${((h % 360) + 360) % 360}, ${s}%, ${l}%)`;
}

/** Derives a readable, genome-driven palette. Diet sets the headband (ecological role at a
 * glance), species sets the outfit (so a lineage reads as visually consistent), and
 * temperature tolerance tints the skin (climate adaptation). */
export function paletteFor(org: Organism, speciesHue: number): CreaturePalette {
  const t = org.genome.traits;
  const dietHue = t.diet < 0.33 ? 110 : t.diet > 0.66 ? 4 : 38; // green / orange / red
  const coldness = -t.tempToleranceCenter; // -1 (hot-adapted) .. 1 (cold-adapted)
  const skinLightness = 62 + coldness * 12;
  const skinSat = 55 - Math.abs(coldness) * 15;

  return {
    hair: HAIR_COLORS[org.id % HAIR_COLORS.length],
    headband: hsl(dietHue, 70, 48),
    headbandTail: hsl(dietHue, 70, 40),
    skin: hsl(28, Math.max(20, skinSat), Math.min(80, Math.max(35, skinLightness))),
    eye: '#1a1410',
    outfitMain: hsl(speciesHue, 55 + t.aggression * 25, 46),
    outfitSecondary: hsl(speciesHue, 30, 72),
    belt: t.aggression > 0.5 ? '#3a0f0f' : '#241a12',
    boots: t.camouflage > 0.4 ? hsl(speciesHue, 20, 22) : '#1c1c1c',
  };
}

function slotColor(slot: number, p: CreaturePalette): string | null {
  switch (slot) {
    case 1:
      return p.hair;
    case 2:
      return p.headband;
    case 3:
      return p.headbandTail;
    case 4:
      return p.skin;
    case 5:
      return p.eye;
    case 6:
      return p.outfitMain;
    case 7:
      return p.outfitSecondary;
    case 8:
      return p.belt;
    case 9:
      return p.boots;
    default:
      return null;
  }
}

function paletteKey(p: CreaturePalette): string {
  return `${p.hair}|${p.headband}|${p.headbandTail}|${p.skin}|${p.outfitMain}|${p.outfitSecondary}|${p.belt}|${p.boots}`;
}

const spriteCache = new Map<string, HTMLCanvasElement>();

function buildSprite(frame: number[][], palette: CreaturePalette): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_W * CELL_PX;
  canvas.height = GRID_H * CELL_PX;
  const ctx = canvas.getContext('2d')!;
  for (let row = 0; row < GRID_H; row++) {
    for (let col = 0; col < GRID_W; col++) {
      const color = slotColor(frame[row][col], palette);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * CELL_PX, row * CELL_PX, CELL_PX, CELL_PX);
    }
  }
  return canvas;
}

export function getSprite(frameIndex: 0 | 1, palette: CreaturePalette): HTMLCanvasElement {
  const key = `${frameIndex}:${paletteKey(palette)}`;
  let canvas = spriteCache.get(key);
  if (!canvas) {
    canvas = buildSprite(FRAMES[frameIndex], palette);
    spriteCache.set(key, canvas);
    // Bound unbounded cache growth across a very long-running world with many species.
    if (spriteCache.size > 4000) spriteCache.clear();
  }
  return canvas;
}

export const SPRITE_ASPECT = GRID_H / GRID_W;

/** Draws a creature sprite centered at (sx, sy), `heightPx` tall, facing/animated from motion. */
export function drawCreatureSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  heightPx: number,
  heading: number,
  moving: boolean,
  animPhase: number,
  palette: CreaturePalette,
) {
  const widthPx = heightPx / SPRITE_ASPECT;
  const frame: 0 | 1 = moving && Math.sin(animPhase) > 0 ? 1 : 0;
  const sprite = getSprite(frame, palette);
  const facingLeft = Math.cos(heading) < 0;

  ctx.save();
  ctx.translate(sx, sy);
  if (facingLeft) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -widthPx / 2, -heightPx / 2, widthPx, heightPx);
  ctx.restore();
}
