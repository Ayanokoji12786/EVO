import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { useSimStore } from '../../state/simStore';
import { TRAIT_SPECS } from '../../genetics/traits';

const GRAPHABLE = [
  { key: 'population', label: 'Population', fromStats: true },
  { key: 'speciesCount', label: 'Species', fromStats: true },
  { key: 'foodAbundance', label: 'Food abundance', fromStats: true },
  ...TRAIT_SPECS.map((t) => ({ key: t.key, label: t.key, fromStats: false })),
];

export function StatsPanel() {
  const stats = useSimStore((s) => s.stats);
  const history = useSimStore((s) => s.statsHistory);
  const [selected, setSelected] = useState<string[]>(['population', 'maxSpeed', 'visionRadius']);

  function toggle(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : cur.length < 4 ? [...cur, key] : cur));
  }

  const chartData = history.slice(-300).map((s) => {
    const row: Record<string, number> = { tick: s.tick };
    for (const key of selected) {
      const spec = GRAPHABLE.find((g) => g.key === key);
      row[key] = spec?.fromStats ? (s as unknown as Record<string, number>)[key] : s.avg[key];
    }
    return row;
  });

  const colors = ['#5ee6c5', '#d98cff', '#ffb454', '#ff6b6b'];

  return (
    <div className="glass scroll-thin" style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, letterSpacing: 1, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        Live Statistics
      </h3>

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

      <div style={{ height: 180, marginBottom: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="tick" hide />
            <YAxis width={30} tick={{ fontSize: 9, fill: 'var(--text-dim)' }} />
            <Tooltip
              contentStyle={{ background: '#10141c', border: '1px solid var(--border-strong)', fontSize: 11 }}
              labelFormatter={(v) => `tick ${v}`}
            />
            {selected.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} dot={false} strokeWidth={1.6} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>Graph traits (up to 4)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {GRAPHABLE.map((g) => (
          <button
            key={g.key}
            className={`btn ${selected.includes(g.key) ? 'active' : ''}`}
            style={{ padding: '4px 8px', fontSize: 10 }}
            onClick={() => toggle(g.key)}
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
