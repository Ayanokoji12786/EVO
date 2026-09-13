import type { StatsSnapshot, Organism } from '../simulation/types';

export interface WorldSnapshot {
  tick: number;
  generation: number;
  stats: StatsSnapshot;
  // A capped sample of organisms (compact: no brain weights) for the Time
  // Machine viewer and Generation-N-vs-N comparisons. This is a deliberate
  // simplification: we do not persist the full population every snapshot to
  // keep memory bounded, so scrubbing shows a representative sample rather
  // than a byte-perfect historical replay.
  sampleOrganisms: Array<{ id: number; x: number; y: number; speciesId: number; traits: Record<string, number> }>;
}

const MAX_STAT_HISTORY = 4000;
const MAX_SNAPSHOTS = 60;
const SAMPLE_SIZE = 250;

export class HistoryStore {
  statHistory: StatsSnapshot[] = [];
  snapshots: WorldSnapshot[] = [];
  private lastSnapshotTick = -Infinity;
  snapshotIntervalTicks = 300;

  pushStats(s: StatsSnapshot) {
    this.statHistory.push(s);
    if (this.statHistory.length > MAX_STAT_HISTORY) {
      // Downsample: drop every other of the oldest half to bound memory while keeping shape.
      const half = Math.floor(this.statHistory.length / 2);
      const kept: StatsSnapshot[] = [];
      for (let i = 0; i < half; i += 2) kept.push(this.statHistory[i]);
      this.statHistory = [...kept, ...this.statHistory.slice(half)];
    }
  }

  maybeSnapshot(tick: number, stats: StatsSnapshot, organisms: Organism[]) {
    if (tick - this.lastSnapshotTick < this.snapshotIntervalTicks) return;
    this.lastSnapshotTick = tick;
    const sample: WorldSnapshot['sampleOrganisms'] = [];
    const step = Math.max(1, Math.floor(organisms.length / SAMPLE_SIZE));
    for (let i = 0; i < organisms.length; i += step) {
      const o = organisms[i];
      sample.push({ id: o.id, x: o.x, y: o.y, speciesId: o.speciesId, traits: { ...o.genome.traits } });
    }
    this.snapshots.push({ tick, generation: stats.generation, stats, sampleOrganisms: sample });
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      // Evict from the middle to preserve both early and recent history.
      const midIdx = Math.floor(this.snapshots.length / 3);
      this.snapshots.splice(midIdx, 1);
    }
  }

  first(): WorldSnapshot | null {
    return this.snapshots[0] ?? null;
  }
  latest(): WorldSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
