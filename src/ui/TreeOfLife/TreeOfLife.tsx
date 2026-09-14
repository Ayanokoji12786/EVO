import { useMemo, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { geneticDistance } from '../../genetics/genome';
import type { HistoryEvent, SpeciesRecord } from '../../simulation/types';

type Point = { x: number; y: number; angle: number; radius: number; depth: number };
const hue = (id: number) => (id * 137.508 + 178) % 360;
const CENTER = { x: 505, y: 360 };
const CREATURE_ICONS = ['🦂', '🪲', '🦠', '🐛', '🦗', '🕷', '🦋'];

interface Milestone { label: string; generation: number; color: string; }

/** Real milestones pulled from the world's own event log — "First Life" and "Present Day"
 * are the only synthesized endpoints; everything between comes from what actually happened. */
function buildMilestones(events: HistoryEvent[], currentGeneration: number): Milestone[] {
  const out: Milestone[] = [{ label: 'First Life', generation: 0, color: '#7be07b' }];
  const wanted: Array<{ re: RegExp; label: string; color: string }> = [
    { re: /predator|carnivore/i, label: 'First Predator Emerges', color: '#e8b34d' },
    { re: /drought/i, label: 'Great Drought', color: '#e8b34d' },
    { re: /mass extinction|great dying/i, label: 'Mass Extinction', color: '#e05f5f' },
    { re: /radiation|speciation|new species/i, label: 'Northern Radiation', color: '#5b9fe0' },
    { re: /flight|wing|aerial/i, label: 'Flight Evolves', color: '#e8b34d' },
    { re: /volcano|meteor|wildfire/i, label: 'Second Extinction', color: '#e05f5f' },
  ];
  const seen = new Set<string>();
  for (const event of events) {
    for (const w of wanted) {
      if (seen.has(w.label)) continue;
      if (w.re.test(event.message)) { out.push({ label: w.label, generation: event.generation, color: w.color }); seen.add(w.label); break; }
    }
  }
  out.push({ label: 'Present Day', generation: currentGeneration, color: '#7be07b' });
  return out;
}

export function TreeOfLife({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const drag = useRef({ active: false, x: 0, y: 0 });
  const species = useMemo(() => [...controller.world.species.all()].sort((a, b) => a.originTick - b.originTick || a.id - b.id), [controller]);
  const positions = useMemo(() => radialPositions(species), [species]);
  const selected = selectedId === null ? null : controller.world.species.get(selectedId);
  const parent = selected?.parentSpeciesId === null || selected?.parentSpeciesId === undefined ? null : controller.world.species.get(selected.parentSpeciesId);
  const descendants = selected ? species.filter((s) => s.parentSpeciesId === selected.id).length : 0;
  const living = species.filter((item) => item.extinctTick === null);
  const extinct = species.length - living.length;
  const scars = controller.world.events.all().filter((event) => /mass extinction|meteor|wildfire|plague|ice age/i.test(event.message));
  const radiations = controller.world.events.all().filter((event) => /radiation|speciation/i.test(event.message)).length;
  const oldestLiving = living.reduce((oldest, item) => (item.originGeneration < oldest ? item.originGeneration : oldest), living[0]?.originGeneration ?? 0);
  const milestones = useMemo(() => buildMilestones(controller.world.events.all(), controller.world.maxGenerationSeen), [controller]);

  const focus = (id: number) => {
    const point = positions.get(id);
    if (!point) return;
    setSelectedId(id);
    setView({ x: -point.x * .18, y: -point.y * .18, zoom: 1.48 });
  };

  return <section className="tree-galaxy" aria-label="Tree of Life">
    <button className="tree-close" onClick={onClose} aria-label="Close Tree of Life">×</button>

    <div className="tree-heading">
      <h1>TREE OF LIFE</h1>
      <p>ALL LIFE. ALL CONNECTIONS.</p>
      <ul className="tree-legend">
        <li><i style={{ background: '#7be07b' }} />Living Lineage</li>
        <li><i style={{ background: '#6f89b8' }} />Extinct Lineage</li>
        <li><i style={{ background: '#e8b34d' }} />Selected Lineage</li>
        <li><i style={{ background: '#e05f5f' }} />Major Event</li>
      </ul>
    </div>

    <div
      className="tree-radial-canvas"
      onMouseDown={(event) => { drag.current = { active: true, x: event.clientX, y: event.clientY }; }}
      onMouseMove={(event) => {
        if (!drag.current.active) return;
        const dx = event.clientX - drag.current.x; const dy = event.clientY - drag.current.y;
        drag.current = { active: true, x: event.clientX, y: event.clientY };
        setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
      }}
      onMouseUp={() => { drag.current.active = false; }}
      onMouseLeave={() => { drag.current.active = false; }}
      onWheel={(event) => setView((current) => ({ ...current, zoom: Math.max(.55, Math.min(2.8, current.zoom * (event.deltaY < 0 ? 1.1 : .9))) }))}
    >
      <svg viewBox="0 0 1010 720" role="img" aria-label="Radial phylogenetic tree showing living and extinct species">
        <defs>
          <radialGradient id="treeNebula"><stop stopColor="#172848" stopOpacity=".68" /><stop offset=".54" stopColor="#090f23" stopOpacity=".56" /><stop offset="1" stopColor="#03060e" stopOpacity="0" /></radialGradient>
          <filter id="treeGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <pattern id="treeStars" width="89" height="89" patternUnits="userSpaceOnUse"><circle cx="11" cy="19" r=".65" fill="#daeaff" /><circle cx="61" cy="22" r=".5" fill="#85b3e8" /><circle cx="36" cy="70" r=".72" fill="#96f5df" /></pattern>
        </defs>
        <rect width="1010" height="720" fill="url(#treeStars)" />
        <ellipse cx={CENTER.x} cy={CENTER.y} rx="347" ry="328" fill="url(#treeNebula)" />
        <g transform={`translate(${CENTER.x + view.x} ${CENTER.y + view.y}) scale(${view.zoom})`}>
          {scars.map((event, index) => <circle key={event.id} cx="0" cy="0" r={100 + index * 58} fill="none" stroke="#ff816e" strokeOpacity=".2" strokeWidth="1" strokeDasharray="3 7" />)}
          {[100, 180, 260].map((radius) => <circle key={radius} cx="0" cy="0" r={radius} fill="none" stroke="rgba(156,191,227,.1)" strokeWidth="1" strokeDasharray="2 10" />)}
          <circle cx="0" cy="0" r="23" fill="#081a22" stroke="#8df1d6" strokeOpacity=".7" filter="url(#treeGlow)" />
          <text x="0" y="-1" fill="#dcfff5" fontSize="7.5" textAnchor="middle" letterSpacing=".6">COMMON</text>
          <text x="0" y="7" fill="#dcfff5" fontSize="7.5" textAnchor="middle" letterSpacing=".6">ANCESTOR</text>
          {species.map((item) => <Lineage key={item.id} item={item} positions={positions} selected={selectedId} onSelect={() => focus(item.id)} />)}
        </g>
      </svg>
      <p className="tree-radial-help">DRAG TO NAVIGATE · SCROLL TO ZOOM · SELECT A LINEAGE</p>
    </div>

    <aside className="tree-overview-card">
      <b>EVOLUTIONARY OVERVIEW</b>
      <div className="tree-overview-grid">
        <div><strong>{living.length}</strong><span>Living Species</span></div>
        <div><strong>{extinct}</strong><span>Extinct Species</span></div>
      </div>
      <div className="tree-overview-big"><strong>{controller.world.organisms.size.toLocaleString()}</strong><span>Total Organisms</span></div>
      <div className="tree-overview-big"><strong>Gen {oldestLiving.toLocaleString()}</strong><span>Oldest Surviving Lineage</span></div>
      <div className="tree-overview-grid">
        <div><strong>{radiations}</strong><span>Major Radiations</span></div>
        <div><strong>{scars.length}</strong><span>Mass Extinction Events</span></div>
      </div>
    </aside>

    <aside className="tree-lineage-card">
      {selected ? <>
        <div className="tree-lineage-head">
          <b>LINEAGE DETAILS</b>
          <button onClick={() => setSelectedId(null)} aria-label="Deselect lineage">×</button>
        </div>
        <div className="tree-lineage-portrait">
          <span style={{ fontSize: 44 }}>{CREATURE_ICONS[selected.id % CREATURE_ICONS.length]}</span>
        </div>
        <h2>{selected.name}</h2>
        <em className={selected.extinctTick === null ? 'living' : 'extinct'}>
          <i />{selected.extinctTick === null ? 'Living Species' : 'Extinct Species'}
        </em>
        <TreeRow label="Generation Emerged" value={selected.originGeneration.toLocaleString()} />
        <TreeRow label="Current Population" value={selected.population.toLocaleString()} />
        <TreeRow label="Largest Population" value={selected.peakPopulation.toLocaleString()} />
        {parent && <TreeRow label="Genetic Distance" value={geneticDistance(selected.representativeGenome, parent.representativeGenome).toFixed(3)} />}
        <TreeRow label="Descendant Species" value={descendants} />
        <div className="tree-lineage-actions">
          <button className="primary" onClick={() => focus(selected.id)}>View Species <span>→</span></button>
          <button onClick={() => setView({ x: -( positions.get(selected.id)?.x ?? 0) * .18, y: -(positions.get(selected.id)?.y ?? 0) * .18, zoom: 1.9 })}>Highlight Lineage</button>
        </div>
      </> : <>
        <div className="tree-lineage-head"><b>PHYLOGENY</b></div>
        <p className="tree-lineage-intro">Living branches remain luminous. Extinct branches fade back into the historical record. Select any lineage to inspect it.</p>
      </>}

      <div className="tree-milestones">
        <b>EVOLUTIONARY MILESTONES</b>
        {milestones.map((m, i) => (
          <div key={i} className="tree-milestone-row"><i style={{ background: m.color }} /><span>Gen {m.generation.toLocaleString()}</span><em>{m.label}</em></div>
        ))}
      </div>

      <blockquote className="tree-quote">&ldquo;From simplicity, infinite forms.&rdquo;<cite>— EVO</cite></blockquote>
    </aside>
  </section>;
}

function radialPositions(species: SpeciesRecord[]) {
  const output = new Map<number, Point>();
  const byId = new Map(species.map((item) => [item.id, item]));
  const depthFor = (item: SpeciesRecord, seen = new Set<number>()): number => {
    if (item.parentSpeciesId === null || seen.has(item.id)) return 1;
    const parent = byId.get(item.parentSpeciesId);
    return parent ? depthFor(parent, new Set([...seen, item.id])) + 1 : 1;
  };
  species.forEach((item, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, species.length)) * Math.PI * 2;
    const depth = depthFor(item);
    const radius = 92 + depth * 78 + Math.min(56, item.originGeneration * .7);
    output.set(item.id, { angle, radius, depth, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });
  return output;
}

function Lineage({ item, positions, selected, onSelect }: { item: SpeciesRecord; positions: Map<number, Point>; selected: number | null; onSelect: () => void }) {
  const point = positions.get(item.id);
  if (!point) return null;
  const parent = item.parentSpeciesId === null ? undefined : positions.get(item.parentSpeciesId);
  const parentPoint = parent ?? { x: 0, y: 0, angle: point.angle, radius: 0 };
  const alive = item.extinctTick === null;
  const isSelected = selected === item.id;
  const focus = selected === null || isSelected;
  const color = isSelected ? '#e8b34d' : `hsl(${hue(item.id)}, ${alive ? 79 : 25}%, ${alive ? 66 : 48}%)`;
  const control = Math.max(40, (point.radius - parentPoint.radius) * .72);
  const cx1 = parentPoint.x + Math.cos(point.angle) * control;
  const cy1 = parentPoint.y + Math.sin(point.angle) * control;
  const cx2 = point.x - Math.cos(point.angle) * control * .42;
  const cy2 = point.y - Math.sin(point.angle) * control * .42;
  return <g opacity={focus ? 1 : .16} className="tree-lineage">
    <path d={`M${parentPoint.x} ${parentPoint.y} C${cx1} ${cy1}, ${cx2} ${cy2}, ${point.x} ${point.y}`} fill="none" stroke={color} strokeWidth={alive ? 2.1 : 1.1} strokeDasharray={alive ? undefined : '3 4'} filter={alive ? 'url(#treeGlow)' : undefined} onClick={onSelect} />
    <circle cx={point.x} cy={point.y} r={alive ? 5.5 : 3.3} fill={color} filter={alive ? 'url(#treeGlow)' : undefined} onClick={onSelect} />
    {alive && <text x={point.x + Math.cos(point.angle) * 15} y={point.y + Math.sin(point.angle) * 15} textAnchor="middle" fontSize="13" style={{ pointerEvents: 'none' }}>{CREATURE_ICONS[item.id % CREATURE_ICONS.length]}</text>}
    {(isSelected || (alive && (item.id % 3 === 0 || positions.size === 1))) && <text x={point.x + Math.cos(point.angle) * 28} y={point.y + Math.sin(point.angle) * 28} fill={alive ? '#e9f8ff' : '#8995a8'} fontSize="9" textAnchor={point.x > 0 ? 'start' : 'end'}>{item.name}</text>}
  </g>;
}

function TreeRow({ label, value }: { label: string; value: string | number }) {
  return <div className="tree-row"><span>{label}</span><b>{value}</b></div>;
}
