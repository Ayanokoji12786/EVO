import type { HistoryEvent, WorldConfig } from '../../simulation/types';

export type WorldBootMode = 'birth' | 'resume';

/**
 * A short, world-conditioned line shown during boot instead of a single fixed quote —
 * scarcity/cold/abundance are picked from the actual config the player chose, in priority
 * order (a cold, scarce world reads as "enduring", not "abundant"), so it never contradicts
 * what the player is about to see. Falls back to a neutral line for an unremarkable
 * temperate/default world rather than forcing one of the three onto every seed.
 */
export function flavorLine(config: Pick<WorldConfig, 'climate' | 'foodAbundance'>): string {
  if (config.climate === 'cold') return 'LIFE LEARNS TO ENDURE.';
  if (config.foodAbundance <= 0.7) return 'WAITING FOR RAIN.';
  if (config.foodAbundance >= 1.3) return 'ABUNDANCE INVITES CHANGE.';
  if (config.climate === 'hot') return 'THE HEAT REWARDS THE PATIENT.';
  if (config.climate === 'variable') return 'THE WORLD HAS NOT YET DECIDED WHAT IT WILL BE.';
  return 'LIFE BEGINS WITH A SINGLE POSSIBILITY.';
}

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
