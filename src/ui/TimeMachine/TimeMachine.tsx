import { useMemo, useState, type ReactNode } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { TRAIT_SPECS } from '../../genetics/traits';

function hashHue(n: number): number {
  return (n * 137.508) % 360;
}

export function TimeMachine({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const snapshots = controller.world.history.snapshots;
  const [index, setIndex] = useState(snapshots.length - 1);
  const [compareIndex, setCompareIndex] = useState<number | null>(0);
  const snap = snapshots[index];
  const compareSnap = compareIndex !== null ? snapshots[compareIndex] : null;

  const worldSize = controller.world.config.worldSize;

  const traitDeltas = useMemo(() => {
    if (!snap || !compareSnap) return [];
    return TRAIT_SPECS.map((t) => {
      const before = compareSnap.stats.avg[t.key] ?? 0;
      const after = snap.stats.avg[t.key] ?? 0;
      const pct = before !== 0 ? ((after - before) / Math.abs(before)) * 100 : 0;
      return { key: t.key, before, after, pct };
    }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  }, [snap, compareSnap]);

  if (snapshots.length === 0) {
    return (
      <Overlay onClose={onClose} title="⏱ Time Machine">
        <div style={{ padding: 20, color: 'var(--text-dim)' }}>No snapshots recorded yet — let the world run a while longer.</div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} title="⏱ Time Machine">
      <div style={{ display: 'flex', gap: 16, padding: 16, flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass" style={{ padding: 12, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox={`0 0 ${worldSize} ${worldSize}`} width="100%" height="100%" style={{ maxHeight: 420, background: '#080b10', borderRadius: 8 }}>
              {snap?.sampleOrganisms.map((o) => (
                <circle key={o.id} cx={o.x} cy={o.y} r={Math.max(2, o.traits.size * 6)} fill={`hsl(${hashHue(o.speciesId)},65%,55%)`} opacity={0.85} />
              ))}
            </svg>
          </div>
          <div>
            <input
              type="range"
              min={0}
              max={snapshots.length - 1}
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
              <span>Generation {snap?.generation} · tick {snap?.tick}</span>
              <span>{snapshots.length} snapshots recorded</span>
            </div>
          </div>
        </div>

        <div className="glass scroll-thin" style={{ width: 340, padding: 16, overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Compare to</h3>
          <select
            value={compareIndex ?? ''}
            onChange={(e) => setCompareIndex(e.target.value === '' ? null : Number(e.target.value))}
            style={{ width: '100%', marginBottom: 12 }}
          >
            <option value="">— none —</option>
            {snapshots.map((s, i) => (
              <option key={i} value={i}>
                Generation {s.generation} (tick {s.tick})
              </option>
            ))}
          </select>

          {compareSnap && snap && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10, color: 'var(--text-dim)' }}>
                <span>Population {compareSnap.stats.population} → {snap.stats.population}</span>
                <span>Species {compareSnap.stats.speciesCount} → {snap.stats.speciesCount}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {traitDeltas.slice(0, 10).map((d) => (
                  <div key={d.key} style={{ fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>{d.key}</span>
                      <span style={{ fontFamily: 'var(--mono)' }}>
                        {d.before.toFixed(2)} → {d.after.toFixed(2)} ({d.pct >= 0 ? '+' : ''}
                        {d.pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 2 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.abs(d.pct))}%`,
                          background: d.pct >= 0 ? 'var(--accent)' : 'var(--danger)',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

export function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,10,0.9)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        <button className="btn" onClick={onClose}>
          ✕ Close
        </button>
      </div>
      {children}
    </div>
  );
}
