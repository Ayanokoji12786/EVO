import type { Organism, StatsSnapshot } from '../simulation/types';
import { TRAIT_SPECS } from '../genetics/traits';

export function computeStats(
  organismList: Organism[],
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
  let herbivores = 0;
  let omnivores = 0;
  let carnivores = 0;

  for (const o of organismList) {
    count++;
    if (o.generation > maxGeneration) maxGeneration = o.generation;
    ageSum += o.age;
    for (const spec of TRAIT_SPECS) sums[spec.key] += o.genome.traits[spec.key];
    const diet = o.genome.traits.diet;
    if (diet < 0.33) herbivores++;
    else if (diet > 0.66) carnivores++;
    else omnivores++;
  }

  const avg: Record<string, number> = {};
  for (const spec of TRAIT_SPECS) avg[spec.key] = count > 0 ? sums[spec.key] / count : 0;
  avg.age = count > 0 ? ageSum / count : 0;

  const variance: Record<string, number> = {};
  for (const spec of TRAIT_SPECS) variance[spec.key] = 0;
  for (const o of organismList) {
    for (const spec of TRAIT_SPECS) {
      const d = o.genome.traits[spec.key] - avg[spec.key];
      variance[spec.key] += d * d;
    }
  }
  const stdDev: Record<string, number> = {};
  for (const spec of TRAIT_SPECS) stdDev[spec.key] = count > 0 ? Math.sqrt(variance[spec.key] / count) : 0;

  return {
    tick,
    generation: maxGeneration,
    population: count,
    births,
    deaths,
    foodAbundance,
    speciesCount,
    avg,
    stdDev,
    trophic: {
      herbivoreFraction: count > 0 ? herbivores / count : 0,
      omnivoreFraction: count > 0 ? omnivores / count : 0,
      carnivoreFraction: count > 0 ? carnivores / count : 0,
    },
  };
}
