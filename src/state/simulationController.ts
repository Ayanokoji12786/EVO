import { createWorld, stepWorld } from '../simulation/engine';
import type { WorldConfig } from '../simulation/types';
import type { WorldState } from '../simulation/worldState';
import { createCamera, panCamera, syncCamera, worldToScreen, zoomCamera, type Camera } from '../rendering/camera';
import { WorldRenderer3D } from '../rendering3d/worldRenderer';
import { ancestryChain, allDescendants } from '../simulation/genealogy';
import { useSimStore, type InspectorData } from './simStore';
import type { Organism } from '../simulation/types';
import * as god from '../god/godActions';
import { TICKS_PER_DAY } from '../simulation/constants';

const STATS_PUSH_INTERVAL_MS = 250;

export class SimulationController {
  world: WorldState;
  camera: Camera;
  private canvas: HTMLCanvasElement | null = null;
  private renderer3d: WorldRenderer3D | null = null;
  private rafHandle: number | null = null;
  private lastStatsPush = 0;
  private lastEventCount = 0;
  private destroyed = false;

  constructor(config: WorldConfig) {
    this.world = createWorld(config);
    this.camera = createCamera(config.worldSize, 800, 600);
  }

  attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer3d = new WorldRenderer3D(canvas, this.world.config.worldSize);
    this.resize(canvas.clientWidth, canvas.clientHeight);
    if (this.rafHandle === null) this.loop(performance.now());
  }

  resize(w: number, h: number) {
    if (!this.canvas || !this.renderer3d) return;
    this.renderer3d.setSize(w, h);
    this.camera.viewportW = w;
    this.camera.viewportH = h;
    syncCamera(this.camera);
  }

  destroy() {
    this.destroyed = true;
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
    this.renderer3d?.dispose();
  }

  private loop = (time: number) => {
    if (this.destroyed) return;
    try {
      const store = useSimStore.getState();

      if (!store.paused) {
        const ticksThisFrame = this.ticksForSpeed(store.speed);
        const budgetMs = store.speed === 'max' ? 40 : 16;
        const frameStart = performance.now();
        let ticksRun = 0;
        const targetTicks = store.speed === 'max' ? Infinity : ticksThisFrame;
        while (ticksRun < targetTicks && this.world.organisms.size > 0) {
          stepWorld(this.world, 1);
          ticksRun++;
          if (store.speed === 'max' && performance.now() - frameStart > budgetMs) break;
        }
        this.updateFollowCamera();
        this.maybePushStats(time);
      }

      this.render();
    } catch (err) {
      console.error('[EVO] simulation loop crashed:', err);
      this.destroyed = true;
      return;
    }
    this.rafHandle = requestAnimationFrame(this.loop);
  };

  private ticksForSpeed(speed: ReturnType<typeof useSimStore.getState>['speed']): number {
    if (speed === 'max') return 200;
    if (speed === 0) return 0;
    return speed;
  }

  private updateFollowCamera() {
    const followId = useSimStore.getState().followId;
    if (followId === null) return;
    const org = this.world.organisms.get(followId);
    if (!org || !org.alive) {
      const rec = this.world.genealogy.get(followId);
      if (rec && rec.deathTick !== null) {
        useSimStore.getState().setDeathToast({
          name: rec.name,
          age: Math.round((rec.deathTick - rec.birthTick) / TICKS_PER_DAY),
          cause: rec.causeOfDeath ?? 'unknown causes',
        });
      }
      useSimStore.getState().setFollow(null);
      return;
    }
    this.camera.x += (org.x - this.camera.x) * 0.1;
    this.camera.y += (org.y - this.camera.y) * 0.1;
  }

  private maybePushStats(time: number) {
    if (time - this.lastStatsPush < STATS_PUSH_INTERVAL_MS) return;
    this.lastStatsPush = time;
    const store = useSimStore.getState();
    const latestStats = this.world.history.statHistory[this.world.history.statHistory.length - 1];
    if (latestStats) {
      store.pushStats(latestStats, this.world.history.statHistory, this.world.species.living());
    }
    const allEvents = this.world.events.all();
    if (allEvents.length !== this.lastEventCount) {
      this.lastEventCount = allEvents.length;
      store.pushEvents(allEvents);
    }
    store.setDivineCounters(this.world.divineInterventions, this.world.naturalGenerations, this.world.interferedGenerations);

    if (store.selectedId !== null) {
      const org = this.world.organisms.get(store.selectedId);
      if (org) {
        store.setInspector(this.buildInspectorData(org));
      } else if (store.inspector && store.inspector.alive) {
        const rec = this.world.genealogy.get(store.selectedId);
        store.setInspector({
          ...store.inspector,
          alive: false,
          age: rec ? Math.round((rec.deathTick! - rec.birthTick) / TICKS_PER_DAY) : store.inspector.age,
          causeOfDeath: rec?.causeOfDeath ?? 'unknown causes',
        });
      }
    }
  }

  private render() {
    if (!this.renderer3d) return;
    const store = useSimStore.getState();
    const ancestryRoot = store.overlays.ancestry;
    this.renderer3d.draw(this.camera, this.world, {
      selectedId: store.selectedId,
      ancestryDescendantIds: ancestryRoot !== null ? allDescendants(this.world, ancestryRoot) : null,
      overlays: store.overlays,
      evolutionVision: store.evolutionVision,
    });
  }

  // --- Interaction ---

  pan(dx: number, dy: number) {
    panCamera(this.camera, dx, dy);
  }
  zoom(factor: number, sx?: number, sy?: number) {
    zoomCamera(this.camera, factor, sx, sy);
  }

  pickOrganismAt(sx: number, sy: number): Organism | null {
    let best: Organism | null = null;
    let bestDist = Infinity;
    for (const org of this.world.organisms.values()) {
      if (!org.alive) continue;
      const [ox, oy] = worldToScreen(this.camera, org.x, org.y);
      const r = Math.max(8, org.genome.traits.size * 16 * this.camera.zoom) + 5;
      const d = Math.hypot(ox - sx, oy - sy);
      if (d <= r && d < bestDist) {
        bestDist = d;
        best = org;
      }
    }
    return best;
  }

  select(orgId: number | null) {
    useSimStore.getState().select(orgId);
    if (orgId === null) {
      useSimStore.getState().setFollow(null);
      useSimStore.getState().setInspector(null);
      return;
    }
    const org = this.world.organisms.get(orgId);
    if (org) {
      // Selection focuses the observatory on an organism, but following is an explicit
      // cinematic mode chosen from the inspector rather than an unexpected camera lock.
      this.follow(null);
      useSimStore.getState().setInspector(this.buildInspectorData(org));
    }
  }

  follow(orgId: number | null) {
    useSimStore.getState().setFollow(orgId);
  }

  targetTerrain(sx: number, sy: number): [number, number] | null {
    syncCamera(this.camera);
    return this.renderer3d?.pickTerrain(this.camera, this.world, sx, sy) ?? null;
  }

  applyPendingGodAction(worldX: number, worldY: number): { before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number } | null {
    const store = useSimStore.getState();
    const action = store.pendingGodAction;
    if (!store.godMode || !action || !Number.isFinite(worldX) || !Number.isFinite(worldY) || worldX < 0 || worldY < 0 || worldX > this.world.config.worldSize || worldY > this.world.config.worldSize) return null;
    let impact: { before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number } | null = null;
    switch (action.kind) {
      case 'rainfall':
        god.paintRainfall(this.world, worldX, worldY, action.radius, action.intensity, action.duration);
        break;
      case 'mutate': {
        let closest: Organism | null = null;
        let distance = Infinity;
        for (const organism of this.world.organisms.values()) {
          const d = Math.hypot(organism.x - worldX, organism.y - worldY);
          if (organism.alive && d < distance) { closest = organism; distance = d; }
        }
        if (closest && distance < 80) god.forceMutate(this.world, closest.id);
        break;
      }
      case 'meteor':
        {
        const before = [...this.world.organisms.values()].filter((org) => org.alive).length;
        const speciesBefore = new Set([...this.world.organisms.values()].filter((org) => org.alive).map((org) => org.speciesId));
        god.triggerMeteor(this.world, worldX, worldY, action.radius);
        const after = [...this.world.organisms.values()].filter((org) => org.alive).length;
        const speciesAfter = new Set([...this.world.organisms.values()].filter((org) => org.alive).map((org) => org.speciesId));
        impact = { before, after, eliminated: before - after, percent: before ? ((before - after) / before) * 100 : 0, extinctSpecies: [...speciesBefore].filter((id) => !speciesAfter.has(id)).length, survivors: speciesAfter.size };
        break;
        }
      case 'volcano':
        god.triggerVolcano(this.world, worldX, worldY);
        break;
      case 'flood':
        god.triggerFlood(this.world, worldX, worldY, action.radius);
        break;
      case 'wildfire':
        god.triggerWildfire(this.world, worldX, worldY, action.radius);
        break;
      case 'lightning':
        god.triggerLightning(this.world, worldX, worldY);
        break;
      case 'terraform':
        god.terraformBrush(this.world, worldX, worldY, action.radius, action.terrainType);
        this.renderer3d?.invalidateTerrain();
        break;
      case 'placeCreature': {
        const org = god.placeCreature(this.world, { traits: action.traits }, worldX, worldY);
        this.select(org.id);
        break;
      }
      case 'introducePredator':
        god.introducePredator(this.world, worldX, worldY);
        break;
      case 'teleportSelected':
        if (store.selectedId !== null) god.teleport(this.world, store.selectedId, worldX, worldY);
        break;
    }
    // Rain is a brush: it remains equipped until the player switches powers or dismisses it.
    if (action.kind !== 'rainfall') store.setPendingGodAction(null);
    return impact;
  }

  buildInspectorData(org: Organism): InspectorData {
    const chain = ancestryChain(this.world, org.id, 3);
    const parentRec = org.parentId !== null ? this.world.genealogy.get(org.parentId) : undefined;
    const mutated: string[] = [];
    if (parentRec) {
      for (const key of Object.keys(org.genome.traits)) {
        const before = parentRec.traits[key];
        const after = org.genome.traits[key];
        if (before !== undefined && Math.abs(after - before) / (Math.abs(before) + 1e-6) > 0.03) mutated.push(key);
      }
    }
    const species = this.world.species.get(org.speciesId);
    return {
      id: org.id,
      name: org.name,
      speciesName: species?.name ?? 'Unclassified',
      generation: org.generation,
      age: Math.round(org.age),
      lifespanCap: Math.round(org.genome.traits.lifespan),
      parentId: org.parentId,
      offspringCount: org.offspringIds.length,
      traits: { ...org.genome.traits },
      energy: org.energy,
      maxEnergy: org.maxEnergy,
      foodEaten: org.foodEaten,
      distanceTravelled: Math.round(org.distanceTravelled),
      kills: org.kills,
      escapes: org.escapes,
      ancestryChain: chain.map((c) => ({ id: c.id, name: c.name, traits: c.traits })),
      mutatedFromParent: mutated,
      alive: org.alive,
      causeOfDeath: org.causeOfDeath,
    };
  }

  /** Runs the simulation forward without rendering every intermediate tick, yielding to the browser periodically so the tab stays responsive. */
  async fastForward(totalTicks: number, onProgress?: (fraction: number) => void): Promise<void> {
    const chunk = 250;
    let done = 0;
    while (done < totalTicks && this.world.organisms.size > 0 && !this.destroyed) {
      const thisChunk = Math.min(chunk, totalTicks - done);
      for (let i = 0; i < thisChunk; i++) stepWorld(this.world, 1);
      done += thisChunk;
      onProgress?.(done / totalTicks);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // --- God actions passthrough (keeps UI decoupled from engine internals) ---
  god = god;
}
