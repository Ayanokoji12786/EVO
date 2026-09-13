import { describe, it, expect } from 'vitest';
import { createRNG } from '../src/simulation/rng';
import { randomGenome, cloneGenome } from '../src/genetics/genome';
import { createOrganism } from '../src/organisms/organism';
import { SpeciesRegistry } from '../src/species/classification';

describe('SpeciesRegistry', () => {
  it('keeps a newborn in the same species when it has not drifted far from the representative genome', () => {
    const rng = createRNG(21);
    const registry = new SpeciesRegistry();
    const founder = createOrganism(1, randomGenome(rng), 0, 0, rng);
    const speciesId = registry.createFounderSpecies(founder, 0);

    const child = createOrganism(2, cloneGenome(founder.genome), 1, 1, rng, { parentId: founder.id });
    child.genome.traits.size += 0.01; // tiny drift

    const assigned = registry.classifyNewborn(child, speciesId, 10);
    expect(assigned).toBe(speciesId);
  });

  it('founds a new species when a newborn has drifted past the speciation threshold', () => {
    const rng = createRNG(22);
    const registry = new SpeciesRegistry();
    const founder = createOrganism(1, randomGenome(rng), 0, 0, rng);
    const speciesId = registry.createFounderSpecies(founder, 0);

    const child = createOrganism(2, cloneGenome(founder.genome), 1, 1, rng, { parentId: founder.id });
    // Push every trait to its extreme to guarantee a large genetic distance.
    for (const key of Object.keys(child.genome.traits)) {
      child.genome.traits[key] = child.genome.traits[key] > 0 ? child.genome.traits[key] * 3 + 5 : -5;
    }

    const assigned = registry.classifyNewborn(child, speciesId, 10);
    expect(assigned).not.toBe(speciesId);
    expect(registry.get(assigned)?.parentSpeciesId).toBe(speciesId);
  });

  it('marks a species extinct once its living population reaches zero, and un-marks it if it reappears', () => {
    const rng = createRNG(23);
    const registry = new SpeciesRegistry();
    const founder = createOrganism(1, randomGenome(rng), 0, 0, rng);
    const speciesId = registry.createFounderSpecies(founder, 0);
    founder.speciesId = speciesId;

    const extinctNow = registry.recount([], 100);
    expect(extinctNow).toHaveLength(1);
    expect(extinctNow[0].id).toBe(speciesId);
    expect(registry.get(speciesId)?.extinctTick).toBe(100);

    const revived = registry.recount([founder], 150);
    expect(revived).toHaveLength(0);
    expect(registry.get(speciesId)?.extinctTick).toBeNull();
  });

  it('tracks peak population across multiple recounts', () => {
    const rng = createRNG(24);
    const registry = new SpeciesRegistry();
    const founder = createOrganism(1, randomGenome(rng), 0, 0, rng);
    const speciesId = registry.createFounderSpecies(founder, 0);
    const others = [founder, createOrganism(2, cloneGenome(founder.genome), 0, 0, rng)];
    others.forEach((o) => (o.speciesId = speciesId));

    registry.recount(others, 10);
    expect(registry.get(speciesId)?.peakPopulation).toBe(2);
    registry.recount([founder], 20);
    expect(registry.get(speciesId)?.peakPopulation).toBe(2); // peak doesn't drop when population falls
  });
});
