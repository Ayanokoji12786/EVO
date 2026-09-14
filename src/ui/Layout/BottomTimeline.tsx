import { useMemo } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore } from '../../state/simStore';
import type { HistoryEvent } from '../../simulation/types';

interface Milestone {
  id: string;
  label: string;
  generation: number;
  icon: 'sprout' | 'paw' | 'sun' | 'skull' | 'mountain' | 'dna' | 'flame';
  category: HistoryEvent['category'];
}

/** Pick the most notable events from the world's real event log as timeline milestones —
 * "First Life" is synthesized from generation 0, everything else comes from the actual
 * log (first predator, droughts, mass extinctions, radiations, etc.). Up to 6 points
 * are shown so the bar stays readable even in an ancient world. */
function synthesizeMilestones(events: HistoryEvent[]): Milestone[] {
  const out: Milestone[] = [
    { id: 'first-life', label: 'First Life', generation: 0, icon: 'sprout', category: 'natural' },
  ];
  const wantedRegex: Array<{ re: RegExp; label: string; icon: Milestone['icon'] }> = [
    { re: /predator|carnivore/i, label: 'First Predator', icon: 'paw' },
    { re: /drought/i, label: 'Great Drought', icon: 'sun' },
    { re: /mass extinction|great dying/i, label: 'Mass Extinction', icon: 'skull' },
    { re: /radiation|speciation|new species/i, label: 'Northern Radiation', icon: 'dna' },
    { re: /flight|wing|aerial/i, label: 'Flight Evolves', icon: 'dna' },
    { re: /volcano|meteor|wildfire/i, label: 'Impact', icon: 'flame' },
  ];
  const seen = new Set<string>();
  for (const event of events) {
    for (const wanted of wantedRegex) {
      if (seen.has(wanted.label)) continue;
      if (wanted.re.test(event.message)) {
        out.push({ id: `${event.id}`, label: wanted.label, generation: event.generation, icon: wanted.icon, category: event.category });
        seen.add(wanted.label);
        break;
      }
    }
  }
  return out.slice(0, 6);
}

export function BottomTimeline({ controller, onOpen }: { controller: SimulationController; onOpen: () => void }) {
  const paused = useSimStore((s) => s.paused);
  const setPaused = useSimStore((s) => s.setPaused);
  const stats = useSimStore((s) => s.stats);
  const events = useSimStore((s) => s.events);
  const generation = stats?.generation ?? controller.world.maxGenerationSeen ?? 0;
  const milestones = useMemo(() => synthesizeMilestones(events), [events]);
  const span = Math.max(1, generation);

  return (
    <div className="milestone-timeline" aria-label="Evolutionary timeline">
      <div className="milestone-timeline-head">
        <span className="milestone-gen-label">Gen 0</span>
        <button className="milestone-play" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? '▶' : '❚❚'}
        </button>
      </div>
      <div className="milestone-track" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}>
        <div className="milestone-track-line" />
        {milestones.map((m) => {
          const left = Math.min(100, (m.generation / span) * 100);
          return (
            <div key={m.id} className="milestone-point" style={{ left: `${left}%` }} title={`${m.label} · Gen ${m.generation.toLocaleString()}`}>
              <MilestoneIcon type={m.icon} />
              <b>{m.label}</b>
              <em>Gen {m.generation.toLocaleString()}</em>
            </div>
          );
        })}
        <div className="milestone-cursor" style={{ left: '100%' }} aria-hidden="true" />
      </div>
      <div className="milestone-timeline-tail">
        <span>Generation <b>{generation.toLocaleString()}</b></span>
      </div>
    </div>
  );
}

function MilestoneIcon({ type }: { type: Milestone['icon'] }) {
  switch (type) {
    case 'sprout': return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 22V13m0 0c-3-1-6-4-6-8 4 0 6 3 6 8zm0 0c3-1 6-4 6-8-4 0-6 3-6 8z" /></svg>;
    case 'paw': return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="6" cy="10" r="2" /><circle cx="10" cy="6" r="2" /><circle cx="14" cy="6" r="2" /><circle cx="18" cy="10" r="2" /><path d="M12 11c-3 0-6 3-6 6a3 3 0 0 0 3 3c1 0 2-.6 3-.6s2 .6 3 .6a3 3 0 0 0 3-3c0-3-3-6-6-6z" /></svg>;
    case 'sun': return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="12" cy="12" r="4" /><g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></g></svg>;
    case 'skull': return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3C7 3 4 7 4 11c0 3 2 5 3 6v3h3v-2h4v2h3v-3c1-1 3-3 3-6 0-4-3-8-8-8zM9 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" /></svg>;
    case 'mountain': return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 20l6-10 4 6 3-5 5 9z" /></svg>;
    case 'dna': return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M7 3c0 5 10 5 10 10s-10 5-10 10" /><path d="M17 3c0 5-10 5-10 10s10 5 10 10" /></svg>;
    case 'flame': return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3c1 3-2 5-2 8s2 4 2 4-4-1-4-5c0 0-3 2-3 6a5 5 0 0 0 10 0c0-4-3-6-3-9z" /></svg>;
  }
}
