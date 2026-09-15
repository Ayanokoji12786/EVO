import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { useSimStore } from '../../state/simStore';
import { TRAIT_SPECS } from '../../genetics/traits';
import type { StatsSnapshot } from '../../simulation/types';

type GraphSource = 'stats' | 'avg' | 'stdDev';
interface GraphOption {
  id: string; // unique across all sources
  key: string; // field name within its source
  label: string;
  source: GraphSource;
}

const GRAPHABLE: GraphOption[] = [
  { id: 'stats:population', key: 'population', label: 'Population', source: 'stats' },
  { id: 'stats:speciesCount', key: 'speciesCount', label: 'Species', source: 'stats' },
  { id: 'stats:foodAbundance', key: 'foodAbundance', label: 'Food abundance', source: 'stats' },
  ...TRAIT_SPECS.map((t) => ({ id: `avg:${t.key}`, key: t.key, label: t.key, source: 'avg' as GraphSource })),
  ...['size', 'maxSpeed', 'visionRadius', 'mutationRate'].map((k) => ({
    id: `stdDev:${k}`,
    key: k,
    label: `${k} (σ)`,
    source: 'stdDev' as GraphSource,
  })),
];

function readValue(s: StatsSnapshot, opt: GraphOption): number {
  if (opt.source === 'stats') return (s as unknown as Record<string, number>)[opt.key];
  if (opt.source === 'stdDev') return s.stdDev[opt.key];
  return s.avg[opt.key];
}

export function StatsPanel({ embedded = false, onAsk }: { embedded?: boolean; onAsk?: () => void }) {
  const stats = useSimStore((s) => s.stats);
  const history = useSimStore((s) => s.statsHistory);
  const [selected, setSelected] = useState<string[]>(['stats:population', 'avg:maxSpeed', 'avg:visionRadius']);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((k) => k !== id) : cur.length < 4 ? [...cur, id] : cur));
  }

  const chartData = history.slice(-300).map((s) => {
    const row: Record<string, number> = { tick: s.tick };
    for (const id of selected) {
      const opt = GRAPHABLE.find((g) => g.id === id);
      if (opt) row[id] = readValue(s, opt);
    }
    return row;
  });

  const colors = ['#5ee6c5', '#d98cff', '#ffb454', '#ff6b6b'];
  const trophic = stats?.trophic;

  return (
    <div className={embedded ? undefined : 'glass scroll-thin'} style={{ padding: 16, overflowY: embedded ? 'visible' : 'auto', height: embedded ? undefined : '100%' }}>
      {!embedded && (
        <h3 style={{ margin: '0 0 12px', fontSize: 13, letterSpacing: 1, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Live Statistics
        </h3>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 12 }}>
        <Stat label="Population" value={stats?.population ?? 0} />
        <Stat label="Generation" value={stats?.generation ?? 0} />
        <Stat label="Species" value={stats?.speciesCount ?? 0} />
        <Stat label="Food items" value={stats?.foodAbundance ?? 0} />
        <Stat label="Avg lifespan cap" value={stats?.avg.lifespan?.toFixed(1) ?? '—'} />
        <Stat label="Avg speed" value={stats?.avg.maxSpeed?.toFixed(2) ?? '—'} />
        <Stat label="Avg size" value={stats?.avg.size?.toFixed(2) ?? '—'} />
        <Stat label="Avg vision" value={stats?.avg.visionRadius?.toFixed(0) ?? '—'} />
        <Stat label="Avg metabolism" value={stats?.avg.metabolism?.toFixed(2) ?? '—'} />
        <Stat label="Avg mutation rate" value={stats ? `${(stats.avg.mutationRate * 100).toFixed(1)}%` : '—'} />
      </div>
      {onAsk && <button className="reference-primary" onClick={onAsk}>✦ ASK THE UNIVERSE →</button>}

      {trophic && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            Trophic composition (herbivore / omnivore / carnivore)
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${trophic.herbivoreFraction * 100}%`, background: '#5ee68f' }} title="herbivore" />
            <div style={{ width: `${trophic.omnivoreFraction * 100}%`, background: '#ffb454' }} title="omnivore" />
            <div style={{ width: `${trophic.carnivoreFraction * 100}%`, background: '#ff6b6b' }} title="carnivore" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 3, fontFamily: 'var(--mono)' }}>
            <span>{(trophic.herbivoreFraction * 100).toFixed(0)}%</span>
            <span>{(trophic.omnivoreFraction * 100).toFixed(0)}%</span>
            <span>{(trophic.carnivoreFraction * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      <div style={{ height: 180, marginBottom: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="tick" hide />
            <YAxis width={30} tick={{ fontSize: 9, fill: 'var(--text-dim)' }} />
            <Tooltip
              contentStyle={{ background: '#10141c', border: '1px solid var(--border-strong)', fontSize: 11 }}
              labelFormatter={(v) => `tick ${v}`}
            />
            {selected.map((id, i) => (
              <Line key={id} type="monotone" dataKey={id} stroke={colors[i % colors.length]} dot={false} strokeWidth={1.6} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>Graph traits (up to 4)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {GRAPHABLE.map((g) => (
          <button
            key={g.id}
            className={`btn ${selected.includes(g.id) ? 'active' : ''}`}
            style={{ padding: '4px 8px', fontSize: 10 }}
            onClick={() => toggle(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px' }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 15 }}>{value}</div>
    </div>
  );
}
