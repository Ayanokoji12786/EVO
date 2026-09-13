import { describe, it, expect } from 'vitest';
import { createRNG } from '../src/simulation/rng';
import { randomGenome, deriveMaxEnergy } from '../src/genetics/genome';
import { createOrganism } from '../src/organisms/organism';
import { reproduceAsexual } from '../src/genetics/inheritance';
import { DEFAULT_MUTATION_SETTINGS } from '../src/genetics/mutation';

function idAllocator(start = 1000) {
  let next = start;
  return () => next++;
}

describe('asexual reproduction', () => {
  it('spends reproductionCost * maxEnergy from the parent and splits it across the litter', () => {
    const rng = createRNG(11);
    const genome = randomGenome(rng);
    genome.traits.offspringCount = 3;
    genome.traits.reproductionCost = 0.4;
    const parent = createOrganism(1, genome, 100, 100, rng, { generation: 2 });
    parent.energy = parent.maxEnergy; // ensure enough energy regardless of random init

    const energyBefore = parent.energy;
    const expectedCost = genome.traits.reproductionCost * parent.maxEnergy;

    const children = reproduceAsexual(parent, rng, DEFAULT_MUTATION_SETTINGS, 42, idAllocator());

    expect(children).toHaveLength(3);
    expect(parent.energy).toBeCloseTo(energyBefore - expectedCost, 5);
    const totalChildEnergy = children.reduce((sum, c) => sum + c.energy, 0);
    // Each child gets (cost / litterSize), clamped to at least 1 and at most its own maxEnergy.
    expect(totalChildEnergy).toBeGreaterThan(0);
    expect(totalChildEnergy).toBeLessThanOrEqual(expectedCost + 1e-6);
  });

  it('increments generation and records lineage on both parent and children', () => {
    const rng = createRNG(12);
    const genome = randomGenome(rng);
    genome.traits.offspringCount = 1;
    const parent = createOrganism(1, genome, 0, 0, rng, { generation: 5 });
    parent.energy = parent.maxEnergy;

    const [child] = reproduceAsexual(parent, rng, DEFAULT_MUTATION_SETTINGS, 7, idAllocator());

    expect(child.generation).toBe(6);
    expect(child.parentId).toBe(parent.id);
    expect(parent.offspringIds).toContain(child.id);
    expect(child.birthTick).toBe(7);
  });

  it('a larger litter gives each individual child less energy than a smaller litter, all else equal', () => {
    const rng = createRNG(13);

    const genomeSmallLitter = randomGenome(createRNG(20));
    genomeSmallLitter.traits.offspringCount = 1;
    genomeSmallLitter.traits.reproductionCost = 0.3;
    const parentA = createOrganism(1, genomeSmallLitter, 0, 0, rng, { generation: 0 });
    parentA.energy = parentA.maxEnergy;
    const [childA] = reproduceAsexual(parentA, rng, DEFAULT_MUTATION_SETTINGS, 0, idAllocator());

    const genomeBigLitter = randomGenome(createRNG(20));
    genomeBigLitter.traits.offspringCount = 5;
    genomeBigLitter.traits.reproductionCost = 0.3;
    const parentB = createOrganism(2, genomeBigLitter, 0, 0, rng, { generation: 0 });
    parentB.energy = parentB.maxEnergy;
    const childrenB = reproduceAsexual(parentB, rng, DEFAULT_MUTATION_SETTINGS, 0, idAllocator());

    expect(childA.energy).toBeGreaterThan(childrenB[0].energy);
  });

  it('deriveMaxEnergy scales with size (a trade-off: bigger organisms need more energy to fill up)', () => {
    const rng = createRNG(14);
    const genome = randomGenome(rng);
    genome.traits.size = 0.5;
    genome.traits.energyStorage = 1;
    const small = deriveMaxEnergy(genome);
    genome.traits.size = 2.0;
    const large = deriveMaxEnergy(genome);
    expect(large).toBeGreaterThan(small);
  });
});
