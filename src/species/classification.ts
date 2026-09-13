import type { Organism, SpeciesRecord } from '../simulation/types';
import { geneticDistance, cloneGenome, type Genome } from '../genetics/genome';
import { generateSpeciesName } from './naming';

/**
 * Simplified speciation model: rather than clustering the whole population
 * every tick (expensive, and arguably not more "correct"), we check each
 * newborn against its species' representative genome. If it has drifted
 * past SPECIATION_THRESHOLD, it founds a new species. This models anagenetic
 * divergence along a lineage; it will not catch two isolated sub-populations
 * that independently drift toward each other, which is a known simplification
 * documented in the About panel.
 */
export const SPECIATION_THRESHOLD = 0.32;

export class SpeciesRegistry {
  private species = new Map<number, SpeciesRecord>();
  private nextId = 1;
  private ordinalCounter = 0;

  createFounderSpecies(founderOrganism: Organism, tick: number): number {
    const id = this.nextId++;
    const record: SpeciesRecord = {
      id,
      name: generateSpeciesName(this.ordinalCounter++, id * 7 + tick),
      founderOrganismId: founderOrganism.id,
      parentSpeciesId: null,
      originGeneration: founderOrganism.generation,
      originTick: tick,
      extinctTick: null,
      representativeGenome: cloneGenome(founderOrganism.genome),
      peakPopulation: 1,
      population: 1,
    };
    this.species.set(id, record);
    return id;
  }

  get(id: number): SpeciesRecord | undefined {
    return this.species.get(id);
  }

  all(): SpeciesRecord[] {
    return [...this.species.values()];
  }

  living(): SpeciesRecord[] {
    return this.all().filter((s) => s.extinctTick === null);
  }

  /** Called for every newborn; may found a new species. Returns the child's speciesId. */
  classifyNewborn(child: Organism, parentSpeciesId: number, tick: number): number {
    const parentSpecies = this.species.get(parentSpeciesId);
    if (!parentSpecies) {
      return this.createFounderSpecies(child, tick);
    }
    const distance = geneticDistance(child.genome, parentSpecies.representativeGenome);
    if (distance > SPECIATION_THRESHOLD) {
      const id = this.nextId++;
      const record: SpeciesRecord = {
        id,
        name: generateSpeciesName(this.ordinalCounter++, id * 13 + tick),
        founderOrganismId: child.id,
        parentSpeciesId,
        originGeneration: child.generation,
        originTick: tick,
        extinctTick: null,
        representativeGenome: cloneGenome(child.genome),
        peakPopulation: 1,
        population: 1,
      };
      this.species.set(id, record);
      return id;
    }
    // Nudge the representative genome slowly toward the newborn (drift tracking).
    this.emaTowards(parentSpecies.representativeGenome, child.genome, 0.02);
    return parentSpeciesId;
  }

  private emaTowards(rep: Genome, sample: Genome, alpha: number) {
    for (const key of Object.keys(rep.traits)) {
      rep.traits[key] = rep.traits[key] * (1 - alpha) + sample.traits[key] * alpha;
    }
  }

  /** Recompute live population counts; mark newly extinct species. Returns extinction events. */
  recount(livingOrganisms: Iterable<Organism>, tick: number): SpeciesRecord[] {
    const counts = new Map<number, number>();
    for (const o of livingOrganisms) {
      counts.set(o.speciesId, (counts.get(o.speciesId) ?? 0) + 1);
    }
    const newlyExtinct: SpeciesRecord[] = [];
    for (const record of this.species.values()) {
      const pop = counts.get(record.id) ?? 0;
      record.population = pop;
      if (pop > record.peakPopulation) record.peakPopulation = pop;
      if (pop === 0 && record.extinctTick === null) {
        record.extinctTick = tick;
        newlyExtinct.push(record);
      } else if (pop > 0 && record.extinctTick !== null) {
        record.extinctTick = null; // resurrected via counting artifact guard (shouldn't normally happen)
      }
    }
    return newlyExtinct;
  }

  serialize() {
    return [...this.species.entries()];
  }
}
