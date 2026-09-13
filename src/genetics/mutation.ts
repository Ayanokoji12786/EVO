import type { RNG } from '../simulation/rng';
import { TRAIT_SPECS, clampTrait } from './traits';
import { cloneGenome, type Genome } from './genome';
import { mutateBrain } from './brain';

export type MutationSettings = {
  mutationRateMultiplier: number; // Divine Genetics: global multiplier on each organism's own mutationRate gene
  mutationStrengthMultiplier: number;
  rareMutationProbability: number; // chance of a "large jump" mutation instead of small drift
  neuralMutationRate: number;
};

export const DEFAULT_MUTATION_SETTINGS: MutationSettings = {
  mutationRateMultiplier: 1,
  mutationStrengthMultiplier: 1,
  rareMutationProbability: 0.05,
  neuralMutationRate: 0.06,
};

/**
 * Produces a mutated copy of a parent genome. Most mutations are small
 * gaussian drift around the parent's value; a small fraction are large
 * jumps, occasionally landing far from the parent (the "dramatic mutation"
 * case called out in the spec).
 */
export function mutateGenome(parent: Genome, rng: RNG, settings: MutationSettings): Genome {
  const child = cloneGenome(parent);
  const baseRate = clampTrait('mutationRate', parent.traits.mutationRate) * settings.mutationRateMultiplier;

  for (const spec of TRAIT_SPECS) {
    if (!rng.bool(baseRate)) continue;
    const range = spec.max - spec.min;
    const small = rng.gaussian(0, range * 0.04 * settings.mutationStrengthMultiplier);
    let delta = small;
    if (rng.bool(settings.rareMutationProbability)) {
      delta += rng.gaussian(0, range * 0.35 * settings.mutationStrengthMultiplier);
    }
    child.traits[spec.key] = clampTrait(spec.key, parent.traits[spec.key] + delta);
  }

  child.brain = mutateBrain(
    parent.brain,
    rng,
    settings.neuralMutationRate,
    0.35 * settings.mutationStrengthMultiplier,
  );

  return child;
}

/** Force one random-magnitude mutation onto a genome (Hand of God: MUTATE). */
export function forceMutation(genome: Genome, rng: RNG): Genome {
  const child = cloneGenome(genome);
  const spec = rng.pick(TRAIT_SPECS);
  const range = spec.max - spec.min;
  child.traits[spec.key] = clampTrait(spec.key, genome.traits[spec.key] + rng.gaussian(0, range * 0.25));
  return child;
}
