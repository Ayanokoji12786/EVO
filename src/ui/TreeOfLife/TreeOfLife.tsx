import { useMemo, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { geneticDistance } from '../../genetics/genome';

type Branch = { id:number; name:string; from:number; to:number; extinct:boolean; parent:number|null; lane:number; generation:number; population:number; peak:number };
const hue = (id:number) => (id * 137.508) % 360;

export function TreeOfLife({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState({ pan: 0, zoom: 1 });
  const drag = useRef({ active:false, x:0 });
  const tick = controller.world.tick;
  const { branches, lanes } = useMemo(() => {
    const ends:number[]=[]; const result:Branch[]=[];
    for (const s of [...controller.world.species.all()].sort((a,b)=>a.originTick-b.originTick)) {
      const to=s.extinctTick ?? tick; let lane=ends.findIndex((end)=>end<s.originTick-8); if(lane<0){lane=ends.length;ends.push(to);}else ends[lane]=to;
      result.push({id:s.id,name:s.name,from:s.originTick,to,extinct:s.extinctTick!==null,parent:s.parentSpeciesId,lane,generation:s.originGeneration,population:s.population,peak:s.peakPopulation});
    }
    return { branches:result, lanes:Math.max(1,ends.length) };
  }, [controller.world.species.all(), tick]);
  const events=controller.world.events.all().filter((e)=>/mass extinction|meteor|wildfire|plague/i.test(e.message));
  const w=1280, h=Math.max(560,lanes*30+130), max=Math.max(1,tick);
  const x=(t:number)=>100+(t/max)*(w-180)*view.zoom+view.pan;
  const y=(lane:number)=>75+lane*(Math.min(34,Math.max(18,(h-150)/lanes)));
  const chosen=selected===null?null:controller.world.species.get(selected);
  const parent=chosen?.parentSpeciesId===null||chosen?.parentSpeciesId===undefined?null:controller.world.species.get(chosen.parentSpeciesId);

  return <div className="tree-galaxy">
    <header className="tree-header"><div><b>✦ GALAXY OF EVOLUTION</b><span>GENERATION 1 → {controller.world.maxGenerationSeen.toLocaleString()} · {branches.length} LINEAGES ARCHIVED</span></div><div><button className="btn" onClick={()=>setView({pan:0,zoom:1})}>⌖ Reset view</button><button className="btn" onClick={onClose}>✕ Close</button></div></header>
    <main className="tree-main">
      <div className="tree-canvas" onMouseDown={(e)=>drag.current={active:true,x:e.clientX}} onMouseMove={(e)=>{if(drag.current.active){const d=e.clientX-drag.current.x;drag.current.x=e.clientX;setView(v=>({...v,pan:v.pan+d}));}}} onMouseUp={()=>drag.current.active=false} onMouseLeave={()=>drag.current.active=false} onWheel={(e)=>setView(v=>({...v,zoom:Math.max(.45,Math.min(5,v.zoom*(e.deltaY<0?1.13:.88)))}))}>
        <svg width={w} height={h}>
          <defs><filter id="livingGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="stars" width="70" height="70" patternUnits="userSpaceOnUse"><circle cx="8" cy="11" r=".7" fill="#d7ddff"/><circle cx="45" cy="31" r=".5" fill="#a5f6ed"/><circle cx="62" cy="58" r=".8" fill="#9675ff"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#stars)"/><text x="100" y="34" fill="#8f9ab7" fontSize="10" letterSpacing="2">TIME →</text>
          {events.map((event)=><g key={event.id}><line x1={x(event.tick)} y1="52" x2={x(event.tick)} y2={h-38} stroke="#ff735b" strokeOpacity=".42" strokeWidth="2"/><text x={x(event.tick)+5} y="65" fill="#ff967d" fontSize="8">EXTINCTION SCAR · G{event.generation}</text></g>)}
          {branches.map((b)=>{const p=b.parent===null?null:branches.find((candidate)=>candidate.id===b.parent);return <g key={b.id}>{p&&<path d={`M${x(b.from)} ${y(p.lane)} C${x(b.from)-22} ${y(p.lane)},${x(b.from)-22} ${y(b.lane)},${x(b.from)} ${y(b.lane)}`} fill="none" stroke={`hsla(${hue(b.id)},75%,70%,.45)`} strokeWidth="1.4"/>}<line x1={x(b.from)} y1={y(b.lane)} x2={x(b.to)} y2={y(b.lane)} stroke={`hsla(${hue(b.id)},${b.extinct?28:75}%,${b.extinct?42:66}%,${selected===null||selected===b.id?1:.2})`} strokeWidth={b.extinct?1.5:2.5} strokeDasharray={b.extinct?'4 4':undefined} filter={b.extinct?undefined:'url(#livingGlow)'} onClick={()=>setSelected(b.id)} style={{cursor:'pointer'}}/><circle cx={x(b.to)} cy={y(b.lane)} r={b.extinct?3:5} fill={b.extinct?'#586071':`hsl(${hue(b.id)},85%,72%)`} filter={b.extinct?undefined:'url(#livingGlow)'} onClick={()=>setSelected(b.id)} style={{cursor:'pointer'}}/>{(selected===b.id||(!b.extinct&&b.lane%3===0))&&<text x={x(b.to)+7} y={y(b.lane)+3} fontSize="10" fill={b.extinct?'#687185':'#edf8ff'}>{b.name}</text>}</g>;})}
        </svg>
      </div>
      <aside className="tree-inspector">{chosen ? <><span>LINEAGE SIGNAL</span><h2>{chosen.name}</h2><b className={chosen.extinctTick===null?'living':'extinct'}>{chosen.extinctTick===null?'● LIVING SPECIES':'○ EXTINCT'}</b><Row label="Origin" value={`Generation ${chosen.originGeneration}`}/><Row label="Lifetime" value={`${chosen.originTick} → ${chosen.extinctTick??tick}`}/><Row label="Population" value={`${chosen.population} now · ${chosen.peakPopulation} peak`}/>{parent&&<Row label="Diverged from" value={parent.name}/>} {parent&&<Row label="Genetic distance" value={geneticDistance(chosen.representativeGenome,parent.representativeGenome).toFixed(3)}/>}<button className="btn primary" onClick={()=>setView({zoom:3,pan:-x(chosen.originTick)*2+360})}>Zoom to branch</button></> : <><span>COMPLETE PHYLOGENY</span><h2>Choose a branch</h2><p>Living species glow. Extinct lineages fade into the background. Vertical scars mark catastrophic population collapses.</p></>}</aside>
    </main>
    <footer>Drag to traverse time · Scroll to zoom · Click a lineage to inspect its complete history</footer>
  </div>;
}
function Row({label,value}:{label:string;value:string|number}){return <div className="tree-row"><span>{label}</span><b>{value}</b></div>}
