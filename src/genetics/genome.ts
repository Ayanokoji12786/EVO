import type { RNG } from '../simulation/rng';
import { TRAIT_SPECS, clampTrait } from './traits';
import { randomBrain, type BrainWeights } from './brain';

export type Genome = {
  traits: Record<string, number>;
  brain: BrainWeights;
  unlockedGenes: string[]; // e.g. 'flight', 'venom' — present only if God Mode unlocked them
};

export function randomGenome(rng: RNG, unlockedGenes: string[] = []): Genome {
  const traits: Record<string, number> = {};
  for (const spec of TRAIT_SPECS) {
    traits[spec.key] = rng.range(spec.initMin, spec.initMax);
  }
  return { traits, brain: randomBrain(rng), unlockedGenes: [...unlockedGenes] };
}

export function cloneGenome(g: Genome): Genome {
  return {
    traits: { ...g.traits },
    brain: new Float32Array(g.brain),
    unlockedGenes: [...g.unlockedGenes],
  };
}

/** Normalized [0,1] genetic distance across all core traits, used for species classification. */
export function geneticDistance(a: Genome, b: Genome): number {
  let sumSq = 0;
  let n = 0;
  for (const spec of TRAIT_SPECS) {
    const range = spec.max - spec.min || 1;
    const da = (a.traits[spec.key] - spec.min) / range;
    const db = (b.traits[spec.key] - spec.min) / range;
    sumSq += (da - db) * (da - db);
    n++;
  }
  return Math.sqrt(sumSq / n);
}

export function deriveMaxEnergy(g: Genome): number {
  const size = g.traits.size;
  const storage = g.traits.energyStorage;
  return 60 * Math.pow(size, 1.4) * storage;
}

export function clampGenome(g: Genome): Genome {
  for (const spec of TRAIT_SPECS) {
    g.traits[spec.key] = clampTrait(spec.key, g.traits[spec.key]);
  }
  return g;
}
