import type { HistoryEvent } from '../../simulation/types';

export type WorldBootMode = 'birth' | 'resume';

export interface ResumeFrame {
  generation: number;
  title: string;
}

/**
 * Select a small, chronological set of genuine simulation events for the saved-world
 * resume sequence. It deliberately reads the event log rather than inventing a story.
 */
export function createResumeFrames(events: HistoryEvent[], currentGeneration: number): ResumeFrame[] {
  const candidates = events
    .filter((event) => event.generation > 0)
    .filter((event) => event.category !== 'natural' || /extinction|drought|population/i.test(event.message));
  const selected = evenlyPick(candidates, 5);
  const frames: ResumeFrame[] = [{ generation: 0, title: 'LIFE BEGINS' }];

  for (const event of selected) {
    const frame: ResumeFrame = { generation: event.generation, title: eventTitle(event) };
    const previous = frames.at(-1);
    if (!previous || previous.generation !== frame.generation || previous.title !== frame.title) frames.push(frame);
  }

  const presentGeneration = Math.max(currentGeneration, frames.at(-1)?.generation ?? 0);
  if (presentGeneration > 0) frames.push({ generation: presentGeneration, title: 'PRESENT DAY' });
  return frames;
}

function evenlyPick<T>(items: T[], maximum: number): T[] {
  if (items.length <= maximum) return items;
  const picks: T[] = [];
  for (let index = 0; index < maximum; index++) {
    const item = items[Math.round((index * (items.length - 1)) / (maximum - 1))];
    if (item && !picks.includes(item)) picks.push(item);
  }
  return picks;
}

function eventTitle(event: HistoryEvent): string {
  const text = event.message.toLowerCase();
  if (event.category === 'extinction' || /mass extinction|became extinct/.test(text)) return 'MASS EXTINCTION';
  if (/new species|species emerged|speciation/.test(text)) return 'SPECIATION DETECTED';
  if (/drought/.test(text)) return 'GREAT DROUGHT';
  if (/predator/.test(text)) return 'PREDATORS EMERGE';
  if (event.category === 'environmental') return 'ENVIRONMENTAL SHIFT';
  if (event.category === 'divine') return 'DIVINE INTERVENTION';
  if (event.category === 'evolutionary') return 'EVOLUTIONARY SHIFT';
  return 'A WORLD CHANGES';
}

/** Stable per-seed chance: about one in 29 new worlds sees the God Mode foreshadow. */
export function hasGodHint(seed: string): boolean {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 29 === 0;
}
