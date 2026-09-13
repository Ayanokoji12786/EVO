import type { WorldState } from '../simulation/worldState';
import type { Camera } from './camera';
import { worldToScreen } from './camera';
import { TerrainTexture } from './terrainTexture';
import { sunlightFactor } from '../environment/climate';
import { geneticDistance } from '../genetics/genome';

export interface RenderOptions {
  selectedId: number | null;
  ancestryDescendantIds: Set<number> | null;
}

function hashHue(n: number): number {
  return (n * 137.508) % 360;
}

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
    const r = Math.max(1.2, (food.kind === 'hardShell' ? 3.2 : 2.2) * Math.max(0.6, camera.zoom));
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.5);
    const color = food.kind === 'hardShell' ? '124,200,255' : '120,230,140';
    glow.addColorStop(0, `rgba(${color},0.9)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Organisms
  const overlays = world.overlays;
  for (const org of world.organisms.values()) {
    if (!org.alive) continue;
    const [sx, sy] = worldToScreen(camera, org.x, org.y);
    if (sx < -30 || sy < -30 || sx > viewportW + 30 || sy > viewportH + 30) continue;

    const radius = Math.max(1.5, org.genome.traits.size * 4 * camera.zoom);
    let hue: number;
    if (overlays.species) hue = hashHue(org.speciesId);
    else if (overlays.genetics && options.selectedId) {
      const sel = world.organisms.get(options.selectedId);
      const dist = sel ? geneticDistance(sel.genome, org.genome) : 0;
      hue = 220 - Math.min(1, dist * 2) * 220; // blue (similar) -> red (different)
    } else hue = org.genome.traits.colorHue;

    const energyFrac = Math.max(0, Math.min(1, org.energy / org.maxEnergy));
    let lightness = overlays.energy ? 20 + energyFrac * 55 : 42 + energyFrac * 18;
    const saturation = 55 + org.genome.traits.aggression * 30;
    const alpha = 0.55 + org.genome.traits.camouflage * -0.25 + 0.35;

    if (options.ancestryDescendantIds && !options.ancestryDescendantIds.has(org.id)) {
      ctx.globalAlpha = 0.12;
    } else {
      ctx.globalAlpha = Math.max(0.35, Math.min(1, alpha));
    }

    if (overlays.vision || options.selectedId === org.id) {
      const fov = (org.genome.traits.fieldOfView * Math.PI) / 180;
      const visionR = org.genome.traits.visionRadius * camera.zoom;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, visionR, org.heading - fov / 2, org.heading + fov / 2);
      ctx.closePath();
      ctx.fillStyle = `hsla(${hue}, 70%, 70%, 0.06)`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${hue}, 70%, 70%, 0.18)`;
      ctx.stroke();
    }

    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();

    // heading nub
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${Math.min(90, lightness + 25)}%, 0.9)`;
    ctx.lineWidth = Math.max(1, radius * 0.35);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(org.heading) * radius * 1.8, sy + Math.sin(org.heading) * radius * 1.8);
    ctx.stroke();

    if (org.infected) {
      ctx.strokeStyle = 'rgba(190,60,220,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (options.selectedId === org.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 4, 0, Math.PI * 2);
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
    ctx.fillStyle = 'rgba(120,150,190,0.12)';
    ctx.beginPath();
    ctx.arc(sx, sy, storm.radius * camera.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
