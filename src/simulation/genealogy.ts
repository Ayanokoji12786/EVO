import type { Organism } from './types';
import type { WorldState } from './worldState';
import { spawnCarcass } from '../environment/food';

const CARCASS_DECAY_TICKS = 150;

export interface GenealogyRecord {
  id: number;
  name: string;
  parentId: number | null;
  generation: number;
  speciesId: number;
  birthTick: number;
  deathTick: number | null;
  causeOfDeath: string | null;
  traits: Record<string, number>;
}

export function recordBirth(state: WorldState, org: Organism) {
  state.genealogy.set(org.id, {
    id: org.id,
    name: org.name,
    parentId: org.parentId,
    generation: org.generation,
    speciesId: org.speciesId,
    birthTick: org.birthTick,
    deathTick: null,
    causeOfDeath: null,
    traits: { ...org.genome.traits },
  });
}

/**
 * Central death path for every organism, natural or divine. Also leaves a scavengeable
 * carcass behind (nutrient cycling / decomposer link — see the ecological-network-fragility
 * literature on trophic connectivity), sized by body mass rather than remaining energy so
 * even a starved individual still returns some biomass to the food web.
 */
export function killOrganism(state: WorldState, org: Organism, cause: string) {
  if (!org.alive) return;
  org.alive = false;
  org.causeOfDeath = cause;
  org.deathTick = state.tick;
  const rec = state.genealogy.get(org.id);
  if (rec) {
    rec.deathTick = state.tick;
    rec.causeOfDeath = cause;
  }
  spawnCarcass(state.food, org.x, org.y, 14 * org.genome.traits.size, state.tick + CARCASS_DECAY_TICKS);
}

/** Walks parentId pointers up to `depth` generations (e.g. grandparent -> parent -> self). */
export function ancestryChain(state: WorldState, id: number, depth = 3): GenealogyRecord[] {
  const chain: GenealogyRecord[] = [];
  let current: number | null = id;
  for (let i = 0; i < depth && current !== null; i++) {
    const rec = state.genealogy.get(current);
    if (!rec) break;
    chain.unshift(rec);
    current = rec.parentId;
  }
  return chain;
}

/** BFS over all descendants of `id` (for the ANCESTRY god's-eye overlay). */
export function allDescendants(state: WorldState, rootId: number): Set<number> {
  const byParent = new Map<number, number[]>();
  for (const rec of state.genealogy.values()) {
    if (rec.parentId === null) continue;
    const list = byParent.get(rec.parentId) ?? [];
    list.push(rec.id);
    byParent.set(rec.parentId, list);
  }
  const result = new Set<number>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const childId of byParent.get(cur) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }
  return result;
}
