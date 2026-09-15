import type { Organism, StatsSnapshot } from '../simulation/types';
import { TRAIT_SPECS, traitSpec } from '../genetics/traits';

/**
 * Percent change from `before` to `after` for a given trait, safe for traits whose range
 * straddles 0 (e.g. tempToleranceCenter, -1..1). A naive (after-before)/before blows up or
 * flips sign wildly as `before` approaches 0 — a baseline of -0.02 can make a trivial
 * absolute shift read as -386%, and a baseline of exactly 0 hides a real shift as "0%".
 * Below 2% of the trait's own range, this expresses the change as a fraction of that range
 * instead of relative to the near-zero baseline — still signed and comparable in magnitude
 * to genuine relative-percent readings, just no longer unstable near 0.
 */
export function traitPercentChange(traitKey: string, before: number, after: number): number {
  const spec = traitSpec(traitKey);
  const range = spec.max - spec.min;
  const nearZero = Math.abs(before) < range * 0.02;
  return nearZero ? ((after - before) / range) * 100 : ((after - before) / Math.abs(before)) * 100;
}

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
/** Shannon entropy normalized by the number of occupied species; zero for one or none. */
export function normalizedShannonDiversity(populations: number[]): number {
  const occupied = populations.filter((p)=>Number.isFinite(p) && p>0);
  if (occupied.length<2) return 0;
  const total = occupied.reduce((sum,p)=>sum+p,0);
  return -occupied.reduce((sum,p)=>sum+(p/total)*Math.log(p/total),0)/Math.log(occupied.length);
}
