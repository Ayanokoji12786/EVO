import type { EventCategory, HistoryEvent, StatsSnapshot, SpeciesRecord } from '../simulation/types';

export class EventLog {
  private events: HistoryEvent[] = [];
  private nextId = 1;
  private populationRollingMax = 0;
  private lastMilestone = 0;
  private lastTraitCheckpoint: StatsSnapshot | null = null;

  add(category: EventCategory, message: string, tick: number, generation: number) {
    this.events.push({ id: this.nextId++, tick, generation, category, message });
  }

  all(): HistoryEvent[] {
    return this.events;
  }

  recent(n: number): HistoryEvent[] {
    return this.events.slice(-n);
  }

  /** Run automatic milestone detection against the latest stats + species deltas. */
  detect(prev: StatsSnapshot | null, current: StatsSnapshot, newSpecies: SpeciesRecord[], extinctSpecies: SpeciesRecord[]) {
    if (!this.lastTraitCheckpoint) this.lastTraitCheckpoint = current;

    if (current.population > this.populationRollingMax) {
      this.populationRollingMax = current.population;
    }

    const milestones = [100, 250, 500, 1000, 2000, 5000];
    for (const m of milestones) {
      if (current.population >= m && this.lastMilestone < m) {
        this.add('natural', `Generation ${current.generation} — Population exceeded ${m} organisms.`, current.tick, current.generation);
        this.lastMilestone = m;
      }
    }

    for (const s of newSpecies) {
      this.add('evolutionary', `Generation ${s.originGeneration} — A new species emerged: ${s.name}.`, current.tick, s.originGeneration);
    }
    for (const s of extinctSpecies) {
      this.add('extinction', `Generation ${current.generation} — ${s.name} became extinct after ${s.extinctTick! - s.originTick} ticks.`, current.tick, current.generation);
    }

    if (prev && prev.population > 20) {
      const dropFraction = (prev.population - current.population) / prev.population;
      if (dropFraction > 0.4) {
        this.add(
          'natural',
          `Generation ${current.generation} — Mass extinction: ${Math.round(dropFraction * 100)}% population loss.`,
          current.tick,
          current.generation,
        );
      }
    }

    // Trait drift checkpoints (every ~200 ticks), reporting % change since the last checkpoint.
    if (current.tick - this.lastTraitCheckpoint.tick > 200 && current.population > 10) {
      for (const key of ['visionRadius', 'maxSpeed', 'size', 'metabolism'] as const) {
        const before = this.lastTraitCheckpoint.avg[key];
        const after = current.avg[key];
        if (before > 0) {
          const pctChange = ((after - before) / before) * 100;
          if (Math.abs(pctChange) > 20) {
            const dir = pctChange > 0 ? 'increased' : 'decreased';
            this.add(
              'evolutionary',
              `Generation ${current.generation} — Average ${key} ${dir} ${Math.abs(pctChange).toFixed(0)}%.`,
              current.tick,
              current.generation,
            );
          }
        }
      }
      this.lastTraitCheckpoint = current;
    }

    if (extinctSpecies.length > 0 || newSpecies.length > 0) {
      const living = current.speciesCount;
      if (living > 0) {
        // dominance check happens in engine where per-species population is available
      }
    }
  }

  serialize() {
    return { events: this.events, populationRollingMax: this.populationRollingMax, lastMilestone: this.lastMilestone };
  }
}
