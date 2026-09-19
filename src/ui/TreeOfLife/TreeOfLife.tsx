import { useMemo, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { geneticDistance } from '../../genetics/genome';
import type { HistoryEvent, SpeciesRecord } from '../../simulation/types';
import { useSimStore } from '../../state/simStore';
import specimenPortrait from '../../assets/specimen-portrait.png';
import './TreeOfLife.css';

type Point = { x: number; y: number; angle: number; radius: number; depth: number; z: number };
const hue = (id: number) => (id * 137.508 + 178) % 360;
const CENTER = { x: 505, y: 360 };

interface Milestone { label: string; generation: number; color: string; }

/** Real milestones pulled from the world's own event log — "First Life" and "Present Day"
 * are the only synthesized endpoints; everything between comes from what actually happened. */
function buildMilestones(events: HistoryEvent[], currentGeneration: number): Milestone[] {
  const out: Milestone[] = [{ label: 'First Life', generation: 0, color: '#7be07b' }];
  const wanted: Array<{ re: RegExp; label: string; color: string }> = [
    { re: /predator|carnivore/i, label: 'First Predator Emerges', color: '#e8b34d' },
    { re: /drought/i, label: 'Great Drought', color: '#e8b34d' },
    { re: /mass extinction|great dying/i, label: 'Mass Extinction', color: '#e05f5f' },
    { re: /radiation|speciation|new species/i, label: 'Speciation', color: '#5b9fe0' },
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
  const [highlightFamily, setHighlightFamily] = useState(false);
  const speciesSnapshot = useSimStore((state) => state.species);
  const events = useSimStore((state) => state.events);
  const stats = useSimStore((state) => state.stats);
  const drag = useRef({ active: false, x: 0, y: 0 });
  const species = useMemo(
    () => {
      // The store snapshot is the reactive signal; the registry remains the source of
      // truth because it also retains extinct lineages that the living snapshot omits.
      const livingSnapshotSize = speciesSnapshot.length;
      const all = [...controller.world.species.all()];
      if (livingSnapshotSize > all.length) return [...speciesSnapshot].sort((a, b) => a.originTick - b.originTick || a.id - b.id);
      return all.sort((a, b) => a.originTick - b.originTick || a.id - b.id);
    },
    [controller, speciesSnapshot],
  );
  const positions = useMemo(() => radialPositions(species), [species]);
  const selected = selectedId === null ? null : controller.world.species.get(selectedId);
  const parent = selected?.parentSpeciesId === null || selected?.parentSpeciesId === undefined ? null : controller.world.species.get(selected.parentSpeciesId);
  const descendants = selected ? species.filter((s) => s.parentSpeciesId === selected.id).length : 0;
  const living = species.filter((item) => item.extinctTick === null);
  const sparse = species.length <= 2;
  const featuredIds = new Set([...living].sort((a, b) => b.population - a.population).slice(0, 2).map((item) => item.id));
  const extinct = species.length - living.length;
  const scars = controller.world.events.all().filter((event) => /mass extinction|meteor|wildfire|plague|ice age/i.test(event.message));
  const radiations = controller.world.events.all().filter((event) => /radiation|speciation/i.test(event.message)).length;
  const oldestLiving = living.reduce((oldest, item) => (item.originGeneration < oldest ? item.originGeneration : oldest), living[0]?.originGeneration ?? 0);
  const milestones = buildMilestones(events, Math.max(stats?.generation ?? 0, controller.world.maxGenerationSeen));
  const family = useMemo(() => {
    if (selectedId === null || !highlightFamily) return null;
    const ids = new Set<number>([selectedId]);
    let cursor = species.find((item) => item.id === selectedId);
    while (cursor?.parentSpeciesId !== null && cursor?.parentSpeciesId !== undefined && !ids.has(cursor.parentSpeciesId)) { ids.add(cursor.parentSpeciesId); cursor = species.find((item) => item.id === cursor!.parentSpeciesId); }
    const visit = (id: number) => species.filter((item) => item.parentSpeciesId === id).forEach((item) => { if (!ids.has(item.id)) { ids.add(item.id); visit(item.id); } });
    visit(selectedId);
    return ids;
  }, [species, selectedId, highlightFamily]);

  const focus = (id: number) => {
    const point = positions.get(id);
    if (!point) return;
    setSelectedId(id);
    setHighlightFamily(false);
  };

  return <section className={`tree-galaxy${sparse ? ' is-sparse' : ''}`} aria-label="Tree of Life">
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
      <button className="tree-reset" onClick={() => { setView({ x:0, y:0, zoom:1 }); setSelectedId(null); }}>RESET OVERVIEW ↺</button>
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
          <radialGradient id="ancestorCore" cx="35%" cy="28%"><stop stopColor="#efffff" /><stop offset=".12" stopColor="#86ebff" /><stop offset=".42" stopColor="#216792" /><stop offset=".76" stopColor="#0d2346" /><stop offset="1" stopColor="#050816" /></radialGradient>
          <radialGradient id="ancestorHalo"><stop stopColor="#8cf2ff" stopOpacity=".42" /><stop offset=".38" stopColor="#5a8cff" stopOpacity=".17" /><stop offset="1" stopColor="#6948ff" stopOpacity="0" /></radialGradient>
          <filter id="treeGlow" filterUnits="userSpaceOnUse" x="-450" y="-450" width="900" height="900"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="ancestorGlow" filterUnits="userSpaceOnUse" x="-180" y="-180" width="360" height="360"><feGaussianBlur stdDeviation="10" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <pattern id="treeStars" width="89" height="89" patternUnits="userSpaceOnUse"><circle cx="11" cy="19" r=".65" fill="#daeaff" /><circle cx="61" cy="22" r=".5" fill="#85b3e8" /><circle cx="36" cy="70" r=".72" fill="#96f5df" /></pattern>
        </defs>
        <rect width="1010" height="720" fill="url(#treeStars)" />
        <ellipse cx={CENTER.x} cy={CENTER.y} rx="347" ry="328" fill="url(#treeNebula)" />
        <g transform={`translate(${CENTER.x + view.x} ${CENTER.y + view.y}) scale(${view.zoom})`}>
          {scars.map((event, index) => <circle key={event.id} cx="0" cy="0" r={100 + index * 58} fill="none" stroke="#ff816e" strokeOpacity=".2" strokeWidth="1" strokeDasharray="3 7" />)}
          {[100, 180, 260].map((radius) => <circle key={radius} cx="0" cy="0" r={radius} fill="none" stroke="rgba(156,191,227,.1)" strokeWidth="1" strokeDasharray="2 10" />)}
          {species.map((item) => <Lineage key={item.id} item={item} positions={positions} selected={selectedId} family={family} sparse={sparse} featured={featuredIds.has(item.id)} animateCurrent={species.length <= 150} onSelect={() => focus(item.id)} />)}
          <g className="tree-ancestor" data-sparse={sparse ? 'true' : 'false'}>
            <circle className="tree-ancestor-halo" cx="0" cy="0" r={sparse ? 104 : 78} fill="url(#ancestorHalo)" />
            <ellipse className="tree-ancestor-orbit orbit-one" cx="0" cy="0" rx={sparse ? 91 : 69} ry={sparse ? 35 : 28} fill="none" />
            <ellipse className="tree-ancestor-orbit orbit-two" cx="0" cy="0" rx={sparse ? 53 : 42} ry={sparse ? 88 : 68} fill="none" transform="rotate(28)" />
            <circle className="tree-ancestor-shell" cx="0" cy="0" r={sparse ? 68 : 50} fill="url(#ancestorCore)" filter="url(#ancestorGlow)" />
            <path className="tree-ancestor-shine" d={sparse ? 'M-34 -34 Q0 -63 36 -30' : 'M-26 -26 Q0 -47 28 -23'} fill="none" />
            <circle cx="0" cy={sparse ? -55 : -40} r={sparse ? 5 : 4} fill="#d8fbff" filter="url(#treeGlow)" />
          </g>
          <text x="0" y="-7" fill="#e2f8ff" fontSize="11" textAnchor="middle" letterSpacing="1.3">COMMON</text>
          <text x="0" y="9" fill="#e2f8ff" fontSize="11" textAnchor="middle" letterSpacing="1.3">ANCESTOR</text>
          <text x="0" y="28" fill="#849faa" fontSize="9" textAnchor="middle">Gen 0</text>
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
          <img src={specimenPortrait} alt="Concept lineage portrait" style={{ filter: `hue-rotate(${hue(selected.id) - 178}deg)` }} />
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
          <button className="primary" disabled={selected.extinctTick !== null} onClick={() => { const organism = [...controller.world.organisms.values()].find((item) => item.alive && item.speciesId === selected.id); if (organism) { controller.select(organism.id); onClose(); } }}>View Species <span>→</span></button>
          <button aria-pressed={highlightFamily} onClick={() => setHighlightFamily((active) => !active)}>{highlightFamily ? 'Show All' : 'Highlight Lineage'}</button>
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
  const childrenByParent = new Map<number, SpeciesRecord[]>();
  for (const item of species) {
    if (item.parentSpeciesId === null) continue;
    const list = childrenByParent.get(item.parentSpeciesId) ?? [];
    list.push(item);
    childrenByParent.set(item.parentSpeciesId, list);
  }
  const sparse = species.length <= 2;
  const depthFor = (item: SpeciesRecord, seen = new Set<number>()): number => {
    if (item.parentSpeciesId === null || seen.has(item.id)) return 1;
    const parent = byId.get(item.parentSpeciesId);
    return parent ? depthFor(parent, new Set([...seen, item.id])) + 1 : 1;
  };
  const children = (id: number) => childrenByParent.get(id) ?? [];
  const roots = species.filter((item) => item.parentSpeciesId === null || !byId.has(item.parentSpeciesId));
  const leafCount = (item: SpeciesRecord, seen = new Set<number>()): number => {
    if (seen.has(item.id)) return 1;
    const branches = children(item.id);
    return branches.length ? branches.reduce((sum, child) => sum + leafCount(child, new Set([...seen, item.id])), 0) : 1;
  };
  const maxDepth = Math.max(1, ...species.map((item) => depthFor(item)));
  const place = (item: SpeciesRecord, start: number, end: number, seen = new Set<number>()) => {
    if (seen.has(item.id)) return;
    const angle = (start + end) / 2;
    const depth = depthFor(item);
    const radius = sparse ? 224 + (depth - 1) * 72 : 84 + depth / maxDepth * 205;
    const z = ((item.id * 17 + depth * 11) % 9) / 8;
    output.set(item.id, { angle, radius, depth, z, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    const branches = children(item.id); const count = branches.reduce((sum, child) => sum + leafCount(child), 0); let cursor = start;
    branches.forEach((child) => { const next = cursor + (end - start) * leafCount(child) / count; place(child, cursor, next, new Set([...seen,item.id])); cursor = next; });
  };
  if (sparse && roots.length) {
    const sparseAngles = roots.length === 1 ? [-Math.PI / 2] : [-Math.PI * .76, Math.PI * .24];
    roots.forEach((item, index) => {
      const angle = sparseAngles[index] ?? -Math.PI / 2 + index * Math.PI;
      place(item, angle - .24, angle + .24);
    });
    return output;
  }
  const total = roots.reduce((sum, item) => sum + leafCount(item), 0); let angle = -Math.PI;
  roots.forEach((item) => { const end = angle + Math.PI * 2 * leafCount(item) / Math.max(1, total); place(item, angle, end); angle = end; });
  return output;
}

function Lineage({ item, positions, selected, family, sparse, featured, animateCurrent, onSelect }: { item: SpeciesRecord; positions: Map<number, Point>; selected: number | null; family: Set<number> | null; sparse: boolean; featured: boolean; animateCurrent: boolean; onSelect: () => void }) {
  const point = positions.get(item.id);
  if (!point) return null;
  const parent = item.parentSpeciesId === null ? undefined : positions.get(item.parentSpeciesId);
  const parentPoint = parent ?? { x: 0, y: 0, angle: point.angle, radius: 0, depth: 0, z: .5 };
  const alive = item.extinctTick === null;
  const isSelected = selected === item.id;
  const focus = family === null || family.has(item.id);
  const color = isSelected ? '#e8b34d' : `hsl(${hue(item.id)}, ${alive ? 79 : 25}%, ${alive ? 66 : 48}%)`;
  const dx = point.x - parentPoint.x;
  const dy = point.y - parentPoint.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;
  const bendSign = ((item.id + point.depth) % 2 === 0 ? 1 : -1);
  const bend = bendSign * (sparse ? 74 : Math.min(58, 19 + point.depth * 9));
  const cx1 = parentPoint.x + dx * .34 + normalX * bend;
  const cy1 = parentPoint.y + dy * .34 + normalY * bend;
  const cx2 = parentPoint.x + dx * .73 + normalX * bend * .62;
  const cy2 = parentPoint.y + dy * .73 + normalY * bend * .62;
  const path = `M${parentPoint.x} ${parentPoint.y} C${cx1} ${cy1}, ${cx2} ${cy2}, ${point.x} ${point.y}`;
  const depthOpacity = .5 + point.z * .5;
  const baseWidth = (alive ? 1.55 : .8) + point.z * (alive ? 1.45 : .55) + (isSelected ? 1.5 : 0);
  const portraitWidth = sparse ? 126 : (featured || isSelected ? 90 : 54);
  const portraitHeight = sparse ? 64 : (featured || isSelected ? 45 : 27);
  const showPortrait = alive && (sparse || featured || isSelected);
  return <g opacity={focus ? 1 : .16} className="tree-lineage" role="button" tabIndex={0} aria-label={`Inspect lineage ${item.name}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); } }}>
    <path className="tree-lineage-aura" d={path} fill="none" stroke={color} strokeWidth={baseWidth * 6} strokeOpacity={alive ? .12 * depthOpacity : .035} style={{ filter: `blur(${(1 - point.z) * 1.2 + .3}px)` }} />
    <path className="tree-lineage-branch" d={path} fill="none" stroke={color} strokeWidth={baseWidth} strokeOpacity={depthOpacity} strokeDasharray={alive ? undefined : '3 5'} filter={alive ? 'url(#treeGlow)' : undefined} onClick={onSelect} />
    {alive && animateCurrent && <path className="tree-lineage-current" d={path} pathLength="100" fill="none" stroke="#dcffff" strokeWidth={Math.max(.65, baseWidth * .32)} strokeOpacity={.78 * depthOpacity} />}
    <circle className="tree-lineage-node-halo" cx={point.x} cy={point.y} r={(sparse ? 17 : 9) + point.z * 4} fill="none" stroke={color} strokeOpacity={.18 + point.z * .2} />
    <circle cx={point.x} cy={point.y} r={sparse ? 9 : alive ? 5 + point.z * 2 : 3.3} fill={color} filter={alive ? 'url(#treeGlow)' : undefined} onClick={onSelect} />
    {showPortrait && <image href={specimenPortrait} x={point.x - portraitWidth / 2} y={point.y - portraitHeight - (sparse ? 18 : 11)} width={portraitWidth} height={portraitHeight} preserveAspectRatio="xMidYMid meet" style={{ filter:`hue-rotate(${hue(item.id) - 178}deg) drop-shadow(0 0 ${sparse ? 12 : 7}px ${color})` }} onClick={onSelect} />}
    {(isSelected || sparse || featured) && <text x={point.x} y={point.y + (sparse ? 34 : 23)} fill={alive ? '#e9f8ff' : '#8995a8'} fontSize={sparse ? 13 : 9} textAnchor="middle" letterSpacing={sparse ? 1 : 0} onClick={onSelect}>{item.name}</text>}
  </g>;
}

function TreeRow({ label, value }: { label: string; value: string | number }) {
  return <div className="tree-row"><span>{label}</span><b>{value}</b></div>;
}
