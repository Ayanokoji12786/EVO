import { useMemo, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { geneticDistance } from '../../genetics/genome';
import type { SpeciesRecord } from '../../simulation/types';

type Point = { x: number; y: number; angle: number; radius: number; depth: number };
const hue = (id: number) => (id * 137.508 + 178) % 360;
const CENTER = { x: 505, y: 360 };

export function TreeOfLife({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const drag = useRef({ active: false, x: 0, y: 0 });
  const species = useMemo(() => [...controller.world.species.all()].sort((a, b) => a.originTick - b.originTick || a.id - b.id), [controller]);
  const positions = useMemo(() => radialPositions(species), [species]);
  const selected = selectedId === null ? null : controller.world.species.get(selectedId);
  const parent = selected?.parentSpeciesId === null || selected?.parentSpeciesId === undefined ? null : controller.world.species.get(selected.parentSpeciesId);
  const living = species.filter((item) => item.extinctTick === null);
  const extinct = species.length - living.length;
  const scars = controller.world.events.all().filter((event) => /mass extinction|meteor|wildfire|plague|ice age/i.test(event.message)).slice(-4);

  const focus = (id: number) => {
    const point = positions.get(id);
    if (!point) return;
    setSelectedId(id);
    setView({ x: -point.x * .18, y: -point.y * .18, zoom: 1.48 });
  };

  return <section className="tree-galaxy" aria-label="Tree of Life">
    <header className="tree-header">
      <div><b>TREE OF LIFE</b><span>PHYLOGENETIC OBSERVATORY · GENERATION {controller.world.maxGenerationSeen.toLocaleString()}</span></div>
      <div className="tree-header-actions"><button onClick={() => setView({ x: 0, y: 0, zoom: 1 })}>⌖ RECENTER</button><button onClick={onClose}>×</button></div>
    </header>

    <main className="tree-main">
      <aside className="tree-summary" aria-label="Lineage summary">
        <Stat label="LIVING SPECIES" value={living.length} accent="life" />
        <Stat label="EXTINCT SPECIES" value={extinct} accent="extinct" />
        <Stat label="RECORDED ORGANISMS" value={controller.world.organisms.size.toLocaleString()} accent="organisms" />
        <div className="tree-key"><span><i className="alive" />LIVING</span><span><i className="gone" />EXTINCT</span><span><i className="selected" />SELECTED</span></div>
      </aside>

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
            <text x="0" y="4" fill="#dcfff5" fontSize="8" textAnchor="middle" letterSpacing="1.1">ORIGIN</text>
            {species.map((item) => <Lineage key={item.id} item={item} positions={positions} selected={selectedId} onSelect={() => focus(item.id)} />)}
          </g>
        </svg>
        <p className="tree-radial-help">DRAG TO NAVIGATE · SCROLL TO ZOOM · SELECT A LINEAGE</p>
      </div>

      <aside className="tree-inspector">
        {selected ? <>
          <span>SELECTED LINEAGE</span><h2>{selected.name}</h2>
          <b className={selected.extinctTick === null ? 'living' : 'extinct'}>{selected.extinctTick === null ? '● THRIVING' : '○ EXTINCT'}</b>
          <TreeRow label="Origin" value={`Generation ${selected.originGeneration}`} />
          <TreeRow label="Current population" value={selected.population.toLocaleString()} />
          <TreeRow label="Historical peak" value={selected.peakPopulation.toLocaleString()} />
          {parent && <><TreeRow label="Diverged from" value={parent.name} /><TreeRow label="Genetic distance" value={geneticDistance(selected.representativeGenome, parent.representativeGenome).toFixed(3)} /></>}
          <button className="tree-focus-button" onClick={() => focus(selected.id)}>FOCUS LINEAGE</button>
        </> : <>
          <span>COMPLETE PHYLOGENY</span><h2>Choose a lineage</h2><p>Living branches remain luminous. Extinct branches fade back into the historical record. The rings mark large recorded disturbances.</p>
          {scars.length > 0 && <div className="tree-scars"><b>HISTORICAL SCARS</b>{scars.map((event) => <span key={event.id}>G{event.generation} · {event.message}</span>)}</div>}
        </>}
      </aside>
    </main>
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
  const focus = selected === null || selected === item.id;
  const color = `hsl(${hue(item.id)}, ${alive ? 79 : 25}%, ${alive ? 66 : 48}%)`;
  const control = Math.max(40, (point.radius - parentPoint.radius) * .72);
  const cx1 = parentPoint.x + Math.cos(point.angle) * control;
  const cy1 = parentPoint.y + Math.sin(point.angle) * control;
  const cx2 = point.x - Math.cos(point.angle) * control * .42;
  const cy2 = point.y - Math.sin(point.angle) * control * .42;
  return <g opacity={focus ? 1 : .16} className="tree-lineage">
    <path d={`M${parentPoint.x} ${parentPoint.y} C${cx1} ${cy1}, ${cx2} ${cy2}, ${point.x} ${point.y}`} fill="none" stroke={color} strokeWidth={alive ? 2.1 : 1.1} strokeDasharray={alive ? undefined : '3 4'} filter={alive ? 'url(#treeGlow)' : undefined} onClick={onSelect} />
    <circle cx={point.x} cy={point.y} r={alive ? 5.5 : 3.3} fill={color} filter={alive ? 'url(#treeGlow)' : undefined} onClick={onSelect} />
    {(selected === item.id || (alive && (item.id % 3 === 0 || positions.size === 1))) && <text x={point.x + Math.cos(point.angle) * 11} y={point.y + Math.sin(point.angle) * 11} fill={alive ? '#e9f8ff' : '#8995a8'} fontSize="9" textAnchor={point.x > 0 ? 'start' : 'end'}>{item.name}</text>}
  </g>;
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return <div className={`tree-stat ${accent}`}><span>{label}</span><b>{value}</b></div>;
}

function TreeRow({ label, value }: { label: string; value: string | number }) {
  return <div className="tree-row"><span>{label}</span><b>{value}</b></div>;
}
