import { useEffect, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { Overlay } from '../TimeMachine/TimeMachine';
import { TRAIT_SPECS } from '../../genetics/traits';
import type { StatsSnapshot } from '../../simulation/types';

function buildStory(start: StatsSnapshot, end: StatsSnapshot, events: { message: string; tick: number; category: string }[]): string {
  const sentences: string[] = [];
  const popChange = end.population - start.population;
  if (Math.abs(popChange) > start.population * 0.2) {
    sentences.push(
      popChange > 0
        ? `The population grew from ${start.population} to ${end.population}.`
        : `The population fell from ${start.population} to ${end.population}.`,
    );
  }
  if (end.speciesCount !== start.speciesCount) {
    sentences.push(`Species count went from ${start.speciesCount} to ${end.speciesCount}.`);
  }

  const traitDeltas = TRAIT_SPECS.map((t) => {
    const before = start.avg[t.key] ?? 0;
    const after = end.avg[t.key] ?? 0;
    const pct = before !== 0 ? ((after - before) / Math.abs(before)) * 100 : 0;
    return { key: t.key, pct, before, after };
  }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const top = traitDeltas.slice(0, 2).filter((t) => Math.abs(t.pct) > 8);
  for (const t of top) {
    sentences.push(
      `Average ${t.key} ${t.pct > 0 ? 'increased' : 'decreased'} from ${t.before.toFixed(2)} to ${t.after.toFixed(2)} (${t.pct > 0 ? '+' : ''}${t.pct.toFixed(0)}%).`,
    );
  }

  const notable = events.filter((e) => e.tick > start.tick && (e.category === 'evolutionary' || e.category === 'extinction')).slice(0, 3);
  for (const e of notable) sentences.push(e.message);

  if (sentences.length === 0) sentences.push('The population held remarkably steady — no dramatic shifts were recorded.');
  return sentences.join(' ');
}

export function GenerationsLater({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [startStats, setStartStats] = useState<StatsSnapshot | null>(null);
  const [endStats, setEndStats] = useState<StatsSnapshot | null>(null);

  useEffect(() => {
    const first = controller.world.history.statHistory[0] ?? null;
    setStartStats(first);
    let cancelled = false;
    controller.fastForward(500 * 50, (f) => !cancelled && setProgress(f)).then(() => {
      if (cancelled) return;
      const latest = controller.world.history.statHistory[controller.world.history.statHistory.length - 1] ?? null;
      setEndStats(latest);
      setDone(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Overlay title="500 Generations Later" onClose={onClose}>
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {!done && (
          <div>
            <div style={{ marginBottom: 12, color: 'var(--text-dim)' }}>Fast-forwarding the ecosystem…</div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.1s' }} />
            </div>
          </div>
        )}
        {done && startStats && endStats && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 24 }}>
              GENERATION {startStats.generation} vs GENERATION {endStats.generation}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {['maxSpeed', 'visionRadius', 'size', 'lifespan', 'metabolism', 'aggression'].map((key) => {
                const before = startStats.avg[key] ?? 0;
                const after = endStats.avg[key] ?? 0;
                return (
                  <div key={key} className="glass" style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{key}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 18 }}>
                      {before.toFixed(2)} → {after.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="glass" style={{ padding: 16, fontSize: 13, lineHeight: 1.6 }}>
              {buildStory(startStats, endStats, controller.world.events.all())}
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}
