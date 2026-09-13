import type { Organism, StatsSnapshot } from '../simulation/types';
import { TRAIT_SPECS } from '../genetics/traits';

export function computeStats(
  organisms: Iterable<Organism>,
  tick: number,
  births: number,
  deaths: number,
  foodAbundance: number,
  speciesCount: number,
): StatsSnapshot {
  const sums: Record<string, number> = {};
  for (const spec of TRAIT_SPECS) sums[spec.key] = 0;
  let count = 0;
  let maxGeneration = 0;
  let ageSum = 0;

  for (const o of organisms) {
    count++;
    if (o.generation > maxGeneration) maxGeneration = o.generation;
    ageSum += o.age;
    for (const spec of TRAIT_SPECS) sums[spec.key] += o.genome.traits[spec.key];
  }

  const avg: Record<string, number> = {};
  for (const spec of TRAIT_SPECS) avg[spec.key] = count > 0 ? sums[spec.key] / count : 0;
  avg.age = count > 0 ? ageSum / count : 0;

  return {
    tick,
    generation: maxGeneration,
    population: count,
    births,
    deaths,
    foodAbundance,
    speciesCount,
    avg,
  };
}
