import type { RNG } from '../simulation/rng';
import type { Organism } from '../simulation/types';
import type { WorldState } from '../simulation/worldState';
import { deriveMaxEnergy, type Genome } from '../genetics/genome';

/**
 * IDs are allocated per-world (state.nextOrganismId), not from a process-global
 * counter. A shared global counter would make two worlds created from the same
 * seed diverge as soon as they're stepped in an interleaved fashion (e.g. the
 * control/experiment pair in Experiment Mode) — organism id feeds into the
 * per-tick exploration jitter in behavior.ts, so even a labeling difference
 * becomes a real behavioral difference.
 */
export function allocateOrganismId(state: WorldState): number {
  return state.nextOrganismId++;
}

export function createOrganism(
  id: number,
  genome: Genome,
  x: number,
  y: number,
  rng: RNG,
  opts: Partial<Pick<Organism, 'parentId' | 'generation' | 'speciesId' | 'birthTick'>> = {},
): Organism {
  const maxEnergy = deriveMaxEnergy(genome);
  return {
    id,
    parentId: opts.parentId ?? null,
    generation: opts.generation ?? 0,
    speciesId: opts.speciesId ?? 0,
    genome,
    x,
    y,
    heading: rng.range(0, Math.PI * 2),
    speed: 0,
    energy: maxEnergy * 0.75,
    maxEnergy,
    age: 0,
    health: 1,
    alive: true,
    causeOfDeath: null,
    birthTick: opts.birthTick ?? 0,
    deathTick: null,
    foodEaten: 0,
    distanceTravelled: 0,
    kills: 0,
    escapes: 0,
    offspringIds: [],
    reproductionCooldown: rng.range(5, 15),
    infected: false,
    infectionTimer: 0,
    immune: false,
    immortal: false,
    protectedFromThreats: false,
    name: `EVO-${id}`,
    acclimatedTempCenter: genome.traits.tempToleranceCenter,
  };
}
