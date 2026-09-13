import type { WorldState } from '../simulation/worldState';
import type { Camera } from './camera';
import { worldToScreen } from './camera';
import { TerrainTexture } from './terrainTexture';
import { sunlightFactor } from '../environment/climate';
import { geneticDistance } from '../genetics/genome';
import { drawCreatureSprite } from './creatureSprite';

export interface RenderOptions {
  selectedId: number | null;
  ancestryDescendantIds: Set<number> | null;
  xrayGene: string | null;
  evolutionVision: boolean;
}

function hashHue(n: number): number {
  return (n * 137.508) % 360;
}

function genomeHue(org: import('../simulation/types').Organism): number {
  const t = org.genome.traits;
  // A continuous fingerprint: nearby genomes stay nearby in hue, while drift visibly moves a lineage.
  return (t.size * 53 + t.maxSpeed * 79 + (t.visionRadius / 260) * 137 + t.metabolism * 47 + t.aggression * 101 + t.diet * 173 + (t.wingDevelopment ?? 0) * 211) % 360;
}

const FOOD_COLORS: Record<string, string> = {
  plant: '120,230,140',
  hardShell: '124,200,255',
  carcass: '210,90,70',
};

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  world: WorldState,
  terrainTexture: TerrainTexture,
  options: RenderOptions,
) {
  const { viewportW, viewportH } = camera;
  ctx.save();
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, viewportW, viewportH);

  terrainTexture.ensure(world.terrain);
  const [tx0, ty0] = worldToScreen(camera, 0, 0);
  const worldPxSize = world.config.worldSize * camera.zoom;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(terrainTexture.canvas, tx0, ty0, worldPxSize, worldPxSize);

  // Food
  for (const food of world.food.items.values()) {
    const [sx, sy] = worldToScreen(camera, food.x, food.y);
    if (sx < -10 || sy < -10 || sx > viewportW + 10 || sy > viewportH + 10) continue;
    const r = Math.max(1.2, (food.kind === 'plant' ? 2.2 : 3.2) * Math.max(0.6, camera.zoom));
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.5);
    const color = FOOD_COLORS[food.kind] ?? FOOD_COLORS.plant;
    glow.addColorStop(0, `rgba(${color},0.9)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Organisms — rendered as small procedural pixel-art sprites (see creatureSprite.ts).
  // Outfit color always follows species identity so distinct species read as visually
  // distinct populations on the map; overlay modes add an informational halo behind the
  // sprite rather than re-tinting it, so "what species is this" stays legible either way.
  const overlays = world.overlays;
  for (const org of world.organisms.values()) {
    if (!org.alive) continue;
    const [sx, sy] = worldToScreen(camera, org.x, org.y);
    if (sx < -30 || sy < -30 || sx > viewportW + 30 || sy > viewportH + 30) continue;

    const speciesHue = options.evolutionVision ? genomeHue(org) : hashHue(org.speciesId);
    // Slightly exaggerated biological silhouettes keep phenotype legible at ecosystem scale.
    const heightPx = Math.max(7, org.genome.traits.size * 21 * camera.zoom);
    const energyFrac = Math.max(0, Math.min(1, org.energy / org.maxEnergy));

    let haloHue: number | null = null;
    let haloAlpha = 0;
    if (options.evolutionVision) {
      haloHue = speciesHue;
      haloAlpha = 0.5;
    } else if (overlays.species) {
      haloHue = speciesHue;
      haloAlpha = 0.35;
    } else if (overlays.genetics && options.selectedId) {
      const sel = world.organisms.get(options.selectedId);
      const dist = sel ? geneticDistance(sel.genome, org.genome) : 0;
      haloHue = 220 - Math.min(1, dist * 2) * 220; // blue (similar) -> red (different)
      haloAlpha = 0.4;
    } else if (overlays.energy) {
      haloHue = energyFrac * 110; // red (starving) -> green (thriving)
      haloAlpha = 0.45;
    }

    const dimmedByAncestry = options.ancestryDescendantIds !== null && !options.ancestryDescendantIds.has(org.id);
    const dimmedBySelection = options.selectedId !== null && options.selectedId !== org.id;
    ctx.globalAlpha = dimmedByAncestry ? 0.12 : dimmedBySelection ? 0.28 : 1;

    if (overlays.vision || options.selectedId === org.id) {
      const fov = (org.genome.traits.fieldOfView * Math.PI) / 180;
      const visionR = org.genome.traits.visionRadius * camera.zoom;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, visionR, org.heading - fov / 2, org.heading + fov / 2);
      ctx.closePath();
      ctx.fillStyle = `hsla(${speciesHue}, 70%, 70%, 0.06)`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${speciesHue}, 70%, 70%, 0.18)`;
      ctx.stroke();
    }

    if (haloHue !== null) {
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, heightPx * 0.9);
      glow.addColorStop(0, `hsla(${haloHue}, 80%, 60%, ${haloAlpha})`);
      glow.addColorStop(1, `hsla(${haloHue}, 80%, 60%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, heightPx * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    const moving = org.speed > 0.05;
    const animPhase = org.id * 0.7 + world.tick * 0.35;
    drawCreatureSprite(ctx, sx, sy, heightPx, org.heading, moving, animPhase, org, options.selectedId === org.id ? options.xrayGene : null, speciesHue);

    if (org.infected) {
      ctx.strokeStyle = 'rgba(190,60,220,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, heightPx * 0.65, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (options.selectedId === org.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, heightPx * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Day/night tint
  const light = sunlightFactor(world.climate);
  const darkness = 1 - light;
  if (darkness > 0.05) {
    ctx.fillStyle = `rgba(5,8,20,${darkness * 0.45})`;
    ctx.fillRect(0, 0, viewportW, viewportH);
  }

  // Active storms
  for (const storm of world.activeStorms) {
    const [sx, sy] = worldToScreen(camera, storm.x, storm.y);
    const r = storm.radius * camera.zoom;
    const rain = ctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
    rain.addColorStop(0, `rgba(85, 184, 255, ${0.14 * storm.intensity})`);
    rain.addColorStop(0.7, `rgba(71, 157, 221, ${0.09 * storm.intensity})`);
    rain.addColorStop(1, 'rgba(61, 130, 190, 0)');
    ctx.fillStyle = rain;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(166, 224, 255, ${0.25 * storm.intensity})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const px = sx + (((i * 47) % 100) / 100 - 0.5) * r * 1.4;
      const py = sy + (((i * 83 + world.tick * 7) % 100) / 100 - 0.5) * r * 1.4;
      ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px - 2, py + 5); ctx.stroke();
    }
  }

  ctx.restore();
}
