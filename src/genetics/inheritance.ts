import type { RNG } from '../simulation/rng';
import type { Organism } from '../simulation/types';
import { mutateGenome, type MutationSettings } from './mutation';
import { createOrganism } from '../organisms/organism';
import { deriveMaxEnergy } from './genome';

/**
 * Asexual reproduction: parent produces `offspringCount` mutated children,
 * splitting the reproduction energy cost between them (more offspring =
 * less energy each, the core litter-size trade-off).
 *
 * Architected as a pure function of (parent, rng, settings) so sexual
 * reproduction/recombination can later be added as a sibling function that
 * takes two parents instead of mutating this one.
 */
export function reproduceAsexual(
  parent: Organism,
  rng: RNG,
  settings: MutationSettings,
  tick: number,
  allocateId: () => number,
  unlockedGenes?: ReadonlySet<string>,
): Organism[] {
  const t = parent.genome.traits;
  const litterSize = Math.max(1, Math.round(t.offspringCount));
  const totalCost = t.reproductionCost * parent.maxEnergy;
  const energyPerChild = totalCost / litterSize;

  parent.energy -= totalCost;
  parent.reproductionCooldown = 8 + t.lifespan * 0.05;

  const children: Organism[] = [];
  for (let i = 0; i < litterSize; i++) {
    const childGenome = mutateGenome(parent.genome, rng, settings, unlockedGenes);
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(4, 14);
    const child = createOrganism(
      allocateId(),
      childGenome,
      parent.x + Math.cos(angle) * dist,
      parent.y + Math.sin(angle) * dist,
      rng,
      { parentId: parent.id, generation: parent.generation + 1, speciesId: parent.speciesId, birthTick: tick },
    );
    child.energy = Math.min(child.maxEnergy, Math.max(1, energyPerChild));
    child.maxEnergy = deriveMaxEnergy(childGenome);
    child.protectedFromThreats = parent.protectedFromThreats;
    child.acclimatedTempCenter = childGenome.traits.tempToleranceCenter;
    parent.offspringIds.push(child.id);
    children.push(child);
  }
  return children;
}
