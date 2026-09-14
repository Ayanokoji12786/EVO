import { useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useSimStore } from '../../state/simStore';
import type { SimulationController } from '../../state/simulationController';
import type { StatsSnapshot } from '../../simulation/types';
import { StatsPanel } from '../Dashboard/StatsPanel';
import { EventLogPanel } from '../EventLog/EventLogPanel';

type Tab = 'overview' | 'population' | 'species' | 'environment' | 'traits' | 'events';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'population', label: 'Population' },
  { id: 'species', label: 'Species' },
  { id: 'environment', label: 'Environment' },
  { id: 'traits', label: 'Traits' },
  { id: 'events', label: 'Events' },
];

/** Real derived metrics only — nothing here is fabricated. "Genetic Diversity" is the mean
 * coefficient of variation across core traits (stdDev/avg), and "Biomass" is population ×
 * average body size, both computed straight from the world's own recorded history. */
function diversityIndex(s: StatsSnapshot): number {
  const keys = ['size', 'maxSpeed', 'visionRadius', 'metabolism'];
  const ratios = keys.map((k) => (s.avg[k] ? (s.stdDev[k] ?? 0) / Math.abs(s.avg[k]) : 0));
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}
function biomass(s: StatsSnapshot): number {
  return s.population * (s.avg.size ?? 0);
}

const CARD_DEFS: { id: string; label: string; unit: string; read: (s: StatsSnapshot) => number; color: string; decimals: number }[] = [
  { id: 'population', label: 'Population', unit: 'organisms', read: (s) => s.population, color: '#7fd88f', decimals: 0 },
  { id: 'species', label: 'Species Count', unit: 'living species', read: (s) => s.speciesCount, color: '#7fb8e0', decimals: 0 },
  { id: 'diversity', label: 'Genetic Diversity', unit: 'diversity index', read: diversityIndex, color: '#b98fe0', decimals: 2 },
  { id: 'size', label: 'Average Body Size', unit: 'relative size', read: (s) => s.avg.size ?? 0, color: '#e0a87f', decimals: 2 },
  { id: 'speed', label: 'Average Speed', unit: 'relative speed', read: (s) => s.avg.maxSpeed ?? 0, color: '#e07f7f', decimals: 2 },
  { id: 'metabolism', label: 'Average Metabolism', unit: 'relative rate', read: (s) => s.avg.metabolism ?? 0, color: '#e0d27f', decimals: 2 },
  { id: 'food', label: 'Food Abundance', unit: 'items available', read: (s) => s.foodAbundance, color: '#7fe0c7', decimals: 0 },
  { id: 'births', label: 'Births', unit: 'this interval', read: (s) => s.births, color: '#7fe0c7', decimals: 0 },
  { id: 'biomass', label: 'Biomass', unit: 'population × size', read: biomass, color: '#7fd88f', decimals: 0 },
];

export function WorldAnalytics({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const history = useSimStore((s) => s.statsHistory);
  const stats = useSimStore((s) => s.stats);
  const events = useSimStore((s) => s.events);
  const species = useSimStore((s) => s.species);

  const majorEvents = useMemo(() => events.filter((e) => e.category === 'extinction' || e.category === 'evolutionary' || /drought|radiation|meteor|plague/i.test(e.message)).slice(-6).reverse(), [events]);

  const correlations = useMemo(() => {
    if (history.length < 12) return [];
    const xs = history.map((s) => s.foodAbundance);
    const pop = history.map((s) => s.population);
    const size = history.map((s) => s.avg.size ?? 0);
    const speciesN = history.map((s) => s.speciesCount);
    const pairs: { label: string; value: number }[] = [
      { label: 'Food Abundance ↔ Population', value: pearson(xs, pop) },
      { label: 'Food Abundance ↔ Species Count', value: pearson(xs, speciesN) },
      { label: 'Population ↔ Average Body Size', value: pearson(pop, size) },
    ];
    return pairs.filter((p) => Number.isFinite(p.value));
  }, [history]);

  const living = species.filter((s) => s.extinctTick === null).length;

  return (
    <section className="analytics-view" aria-label="World Analytics">
      <button className="analytics-close" onClick={onClose} aria-label="Close Analytics">×</button>

      <div className="analytics-heading">
        <h1>WORLD ANALYTICS</h1>
        <p>UNDERSTAND. DISCOVER. PREDICT.</p>
      </div>

      <nav className="analytics-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      <div className="analytics-body scroll-thin">
        {tab === 'overview' && <>
          <div className="analytics-grid">
            {CARD_DEFS.map((def) => <MetricCard key={def.id} def={def} history={history} />)}
          </div>
          <div className="analytics-side">
            <div className="analytics-panel">
              <b>MAJOR EVENTS</b>
              {majorEvents.length === 0 && <p className="analytics-empty">No major events recorded yet.</p>}
              {majorEvents.map((e) => (
                <div key={e.id} className="analytics-event-row"><span>Gen {e.generation.toLocaleString()}</span><em>{e.message.replace(/^[^\w]*/, '')}</em></div>
              ))}
            </div>
            <div className="analytics-panel">
              <b>CORRELATION ANALYSIS</b>
              {correlations.length === 0 && <p className="analytics-empty">Not enough history yet — let the world run longer.</p>}
              {correlations.map((c) => (
                <div key={c.label} className="analytics-corr-row">
                  <span>{c.label}</span>
                  <b className={c.value >= 0 ? 'pos' : 'neg'}>{c.value >= 0 ? '+' : ''}{c.value.toFixed(2)}</b>
                </div>
              ))}
            </div>
          </div>
        </>}

        {tab === 'population' && <div className="analytics-panel analytics-panel-wide">
          <b>POPULATION OVER TIME</b>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.slice(-400).map((s) => ({ tick: s.tick, population: s.population, births: s.births, deaths: s.deaths }))}>
                <YAxis width={40} tick={{ fontSize: 10, fill: '#8098b1' }} />
                <Line type="monotone" dataKey="population" stroke="#7fd88f" dot={false} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="analytics-mini-stats">
            <div><strong>{stats?.population.toLocaleString() ?? 0}</strong><span>Current Population</span></div>
            <div><strong>{stats?.births ?? 0}</strong><span>Recent Births</span></div>
            <div><strong>{stats?.deaths ?? 0}</strong><span>Recent Deaths</span></div>
          </div>
        </div>}

        {tab === 'species' && <div className="analytics-panel analytics-panel-wide">
          <b>LIVING SPECIES ({living})</b>
          <div className="analytics-species-list">
            {species.filter((s) => s.extinctTick === null).sort((a, b) => b.population - a.population).map((s) => (
              <div key={s.id} className="analytics-species-row">
                <span>{s.name}</span>
                <em>Gen {s.originGeneration.toLocaleString()}</em>
                <b>{s.population.toLocaleString()}</b>
              </div>
            ))}
            {living === 0 && <p className="analytics-empty">No living species recorded yet.</p>}
          </div>
        </div>}

        {tab === 'environment' && <div className="analytics-panel analytics-panel-wide">
          <b>ENVIRONMENT</b>
          <div className="analytics-mini-stats">
            <div><strong>{Math.round(15 + controller.world.climate.baseTemperature * 12)}°C</strong><span>Base Temperature</span></div>
            <div><strong>{controller.world.climate.rainfall.toFixed(2)}×</strong><span>Rainfall Multiplier</span></div>
            <div><strong>{stats?.foodAbundance.toLocaleString() ?? 0}</strong><span>Food Items</span></div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.slice(-400).map((s) => ({ tick: s.tick, food: s.foodAbundance }))}>
                <YAxis width={40} tick={{ fontSize: 10, fill: '#8098b1' }} />
                <Line type="monotone" dataKey="food" stroke="#7fe0c7" dot={false} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>}

        {tab === 'traits' && <div className="analytics-panel analytics-panel-wide"><StatsPanel embedded /></div>}
        {tab === 'events' && <div className="analytics-panel analytics-panel-wide"><EventLogPanel embedded /></div>}
      </div>
    </section>
  );
}

function MetricCard({ def, history }: { def: (typeof CARD_DEFS)[number]; history: StatsSnapshot[] }) {
  const data = history.slice(-300).map((s) => ({ tick: s.tick, v: def.read(s) }));
  const current = data.length ? data[data.length - 1].v : 0;
  return (
    <div className="analytics-card">
      <div className="analytics-card-head"><span>{def.label}</span><b>{current.toFixed(def.decimals)}</b></div>
      <div className="analytics-card-unit">{def.unit}</div>
      <div className="analytics-card-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="v" stroke={def.color} dot={false} strokeWidth={1.6} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA; const db = b[i] - meanB;
    num += da * db; denA += da * da; denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}
