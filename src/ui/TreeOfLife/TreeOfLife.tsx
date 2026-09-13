import { useMemo, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { geneticDistance } from '../../genetics/genome';

function hashHue(n: number): number {
  return (n * 137.508) % 360;
}

interface LaneItem {
  id: number;
  name: string;
  originTick: number;
  endTick: number;
  extinct: boolean;
  parentId: number | null;
  lane: number;
  population: number;
  peakPopulation: number;
  originGeneration: number;
}

export function TreeOfLife({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState({ panX: 0, scale: 1 });
  const dragRef = useRef<{ dragging: boolean; lastX: number }>({ dragging: false, lastX: 0 });

  const species = controller.world.species.all();
  const currentTick = controller.world.tick;

  const { lanes, maxTick, laneCount } = useMemo(() => {
    const sorted = [...species].sort((a, b) => a.originTick - b.originTick);
    const laneEnds: number[] = [];
    const items: LaneItem[] = [];
    for (const s of sorted) {
      const end = s.extinctTick ?? currentTick;
      let laneIdx = laneEnds.findIndex((e) => e < s.originTick - 5);
      if (laneIdx === -1) {
        laneIdx = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[laneIdx] = end;
      }
      items.push({
        id: s.id,
        name: s.name,
        originTick: s.originTick,
        endTick: end,
        extinct: s.extinctTick !== null,
        parentId: s.parentSpeciesId,
        lane: laneIdx,
        population: s.population,
        peakPopulation: s.peakPopulation,
        originGeneration: s.originGeneration,
      });
    }
    return { lanes: items, maxTick: Math.max(1, currentTick), laneCount: laneEnds.length };
  }, [species, currentTick]);

  const width = 900;
  const laneHeight = 26;
  const height = Math.max(200, laneCount * laneHeight + 60);
  const marginX = 50;

  function xOf(tick: number) {
    return marginX + (tick / maxTick) * (width - marginX * 2) * view.scale + view.panX;
  }
  function yOf(lane: number) {
    return 40 + lane * laneHeight;
  }

  const selectedRecord = selected !== null ? controller.world.species.get(selected) : null;
  const parentRecord = selectedRecord?.parentSpeciesId != null ? controller.world.species.get(selectedRecord.parentSpeciesId) : null;
  const divergence = selectedRecord && parentRecord ? geneticDistance(selectedRecord.representativeGenome, parentRecord.representativeGenome) : null;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,10,0.88)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>🌳 Tree of Life</h2>
        <button className="btn" onClick={onClose}>
          ✕ Close
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          className="scroll-thin"
          style={{ flex: 1, overflow: 'auto', padding: 20 }}
          onMouseDown={(e) => {
            dragRef.current = { dragging: true, lastX: e.clientX };
          }}
          onMouseMove={(e) => {
            if (!dragRef.current.dragging) return;
            const dx = e.clientX - dragRef.current.lastX;
            dragRef.current.lastX = e.clientX;
            setView((v) => ({ ...v, panX: v.panX + dx }));
          }}
          onMouseUp={() => (dragRef.current.dragging = false)}
          onWheel={(e) => {
            setView((v) => ({ ...v, scale: Math.max(0.3, Math.min(6, v.scale * (e.deltaY < 0 ? 1.1 : 0.9))) }));
          }}
        >
          <svg width={Math.max(width, width * view.scale)} height={height} style={{ display: 'block' }}>
            {lanes.map((item) => {
              const parent = item.parentId !== null ? lanes.find((l) => l.id === item.parentId) : null;
              return (
                <g key={item.id}>
                  {parent && (
                    <line
                      x1={xOf(item.originTick)}
                      y1={yOf(parent.lane)}
                      x2={xOf(item.originTick)}
                      y2={yOf(item.lane)}
                      stroke="rgba(255,255,255,0.15)"
                      strokeDasharray="3,3"
                    />
                  )}
                  <rect
                    x={xOf(item.originTick)}
                    y={yOf(item.lane) - 8}
                    width={Math.max(2, xOf(item.endTick) - xOf(item.originTick))}
                    height={16}
                    rx={8}
                    fill={`hsl(${hashHue(item.id)}, 65%, ${item.extinct ? 32 : 50}%)`}
                    opacity={selected === null || selected === item.id ? 1 : 0.35}
                    stroke={selected === item.id ? '#fff' : 'none'}
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(item.id)}
                  />
                  <text x={xOf(item.originTick) + 4} y={yOf(item.lane) + 4} fontSize={9} fill="#fff" style={{ pointerEvents: 'none' }}>
                    {item.name}
                    {item.extinct ? ' ☠' : ''}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {selectedRecord && (
          <div className="glass scroll-thin" style={{ width: 300, margin: 16, padding: 16, overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 8px' }}>{selectedRecord.name}</h3>
            <DetailRow label="Origin generation" value={selectedRecord.originGeneration} />
            <DetailRow label="Origin tick" value={selectedRecord.originTick} />
            <DetailRow label="Status" value={selectedRecord.extinctTick !== null ? `Extinct @ tick ${selectedRecord.extinctTick}` : 'Living'} />
            <DetailRow label="Current population" value={selectedRecord.population} />
            <DetailRow label="Peak population" value={selectedRecord.peakPopulation} />
            <DetailRow
              label="Lineage span"
              value={`${(selectedRecord.extinctTick ?? currentTick) - selectedRecord.originTick} ticks`}
            />
            {parentRecord && <DetailRow label="Diverged from" value={parentRecord.name} />}
            {divergence !== null && <DetailRow label="Genetic distance from parent" value={divergence.toFixed(3)} />}
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '12px 0 6px' }}>
              Representative traits
            </div>
            {Object.entries(selectedRecord.representativeGenome.traits)
              .slice(0, 8)
              .map(([k, v]) => (
                <DetailRow key={k} label={k} value={v.toFixed(2)} />
              ))}
          </div>
        )}
      </div>
      <div style={{ padding: '8px 20px', fontSize: 11, color: 'var(--text-dim)' }}>
        Drag to pan, scroll to zoom. Each bar is a species' lifetime; dashed lines show where it diverged from its parent species.
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)' }}>{value}</span>
    </div>
  );
}
