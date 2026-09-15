import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore } from '../../state/simStore';
import type { StatsSnapshot } from '../../simulation/types';
import specimen from '../../assets/specimen-portrait.png';
import { Overlay } from '../TimeMachine/TimeMachine';
import { ReferenceIcon } from '../shared/ReferenceIcon';
import './WorldInsights.css';

const QUESTIONS = [
  { key: 'size', label: 'How did body size change?', read: (s: StatsSnapshot) => s.avg.size, unit: 'mean body size' },
  { key: 'maxSpeed', label: 'How did movement evolve?', read: (s: StatsSnapshot) => s.avg.maxSpeed, unit: 'mean maximum speed' },
  { key: 'population', label: 'What happened to the population?', read: (s: StatsSnapshot) => s.population, unit: 'organisms' },
  { key: 'visionRadius', label: 'How did vision change?', read: (s: StatsSnapshot) => s.avg.visionRadius, unit: 'mean vision radius' },
];
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const percent = (before: number, after: number) => before ? (after - before) / Math.abs(before) * 100 : null;

export function WorldInsights({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const history = useSimStore((s) => s.statsHistory);
  const events = useSimStore((s) => s.events);
  const [questionKey, setQuestionKey] = useState('size');
  const [windowTicks, setWindowTicks] = useState(3000);
  const [evidence, setEvidence] = useState(false);
  const question = QUESTIONS.find((item) => item.key === questionKey)!;
  const interval = useMemo(() => history.filter((s) => s.tick >= (history.at(-1)?.tick ?? 0) - windowTicks), [history, windowTicks]);
  const first = interval[0];
  const last = interval.at(-1);
  const intervalEvents = useMemo(() => first && last ? events.filter((e) => e.tick > first.tick && e.tick <= last.tick).slice(-8) : [], [events,first,last]);
  const deaths = useMemo(() => {
    const counts: Record<string,number> = {};
    if (first && last) for (const record of controller.world.genealogy.values()) {
      if (record.deathTick !== null && record.deathTick > first.tick && record.deathTick <= last.tick) {
        const rawCause = record.causeOfDeath ?? 'Unknown';
        const cause = rawCause.startsWith('killed by ') ? 'Predation' : rawCause;
        counts[cause] = (counts[cause] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a,b) => b[1]-a[1]);
  }, [controller,first,last]);
  const ready = interval.length >= 2;
  const valueBefore = first ? question.read(first) ?? 0 : 0;
  const valueAfter = last ? question.read(last) ?? 0 : 0;
  const change = percent(valueBefore,valueAfter);
  const foodChange = first && last ? percent(first.foodAbundance,last.foodAbundance) : null;

  return <Overlay title="ASK THE UNIVERSE" onClose={onClose}>
    <p className="reference-subtitle">FOLLOW THE EVIDENCE. DISCOVER THE STORY.</p>
    <div className="insights-content scroll-thin">
      <div className="insights-layout">
        <aside className="insights-specimen reference-card"><img src={specimen} alt="Concept specimen portrait" /><small>THE LIVING LABORATORY</small><h3>Small changes.<br />Infinite possibilities.</h3><p>World {controller.world.config.seed}<br />Whole-world recorded averages</p><span>ILLUSTRATIVE SPECIMEN</span></aside>
        <section className="insights-answer reference-card">
          <small>WHAT DOES YOUR WORLD REVEAL?</small>
          <label className="insights-question"><ReferenceIcon kind="evolution" /><select aria-label="Ask the Universe question" value={questionKey} onChange={(e) => {setQuestionKey(e.target.value);setEvidence(false);}}>{QUESTIONS.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}</select></label>
          <label className="insights-range">OBSERVATION WINDOW<select aria-label="Insights observation window" value={windowTicks} onChange={(e) => setWindowTicks(Number(e.target.value))}><option value={1000}>Last 1,000 ticks</option><option value={3000}>Last 3,000 ticks</option><option value={30000}>Last 30,000 ticks</option></select></label>
          {!ready ? <div className="insights-wait"><h3>A story is beginning.</h3><p>Let the world run a little longer. Two recorded observations are needed to compare change.</p></div> : <>
            <div className="insights-measured"><span>{question.unit}</span><strong>{valueBefore.toLocaleString(undefined,{maximumFractionDigits:2})} <i>→</i> {valueAfter.toLocaleString(undefined,{maximumFractionDigits:2})}</strong><b>{change===null ? 'Started at zero' : signed(change)}</b></div>
            <small>RECORDED ANALYSIS · NOT AN AI CAUSAL CLAIM</small>
            <p>From tick {first.tick.toLocaleString()} to {last!.tick.toLocaleString()} (generation {first.generation}–{last!.generation}), {question.unit} {valueAfter<valueBefore?'decreased':valueAfter>valueBefore?'increased':'remained unchanged'}. Recorded food items changed {foodChange===null?'from zero':signed(foodChange)} in the same interval.</p>
            <p>{intervalEvents.length ? `${intervalEvents.length} recent logged events fall within this window. Their timing and the recorded death causes are available below.` : 'No notable events were logged in this interval. Natural selection, mutation and population turnover continue between recorded observations.'}</p>
            <p className="reference-note">These observations show what changed together, not why. Trait averages describe living organisms across all species; they cannot establish a single cause or one lineage’s history.</p>
            <button className="reference-primary" onClick={() => setEvidence(!evidence)}>{evidence?'HIDE EVIDENCE':'SHOW EVIDENCE'} →</button>
          </>}
        </section>
      </div>
      {evidence && ready && <section className="insights-evidence" aria-label="Recorded evidence">
        <div className="insights-charts"><EvidenceChart title={question.unit} history={interval} read={question.read} color="#82d7ee" /><EvidenceChart title="Recorded food items" history={interval} read={(s) => s.foodAbundance} color="#8edea1" /><EvidenceChart title="Population" history={interval} read={(s) => s.population} color="#c29de9" /></div>
        <div className="insights-records"><div className="reference-card"><small>EVENTS IN THE OBSERVATION WINDOW</small>{intervalEvents.length ? intervalEvents.map((event) => <p key={event.id}><b>Tick {event.tick.toLocaleString()}</b>{event.message}</p>) : <p>No notable events logged.</p>}</div><div className="reference-card"><small>RECORDED DEATH CAUSES</small>{deaths.length ? deaths.slice(0,7).map(([cause,count]) => <p key={cause}><span>{cause}</span><b>{count.toLocaleString()}</b></p>) : <p>No retained death records in this interval.</p>}<p className="reference-note">Counts use retained genealogy records; older records may be pruned. Each graph has its own scale.</p></div></div>
      </section>}
    </div>
  </Overlay>;
}

function EvidenceChart({title,history,read,color}:{title:string;history:StatsSnapshot[];read:(s:StatsSnapshot)=>number|undefined;color:string}) {
  return <div className="reference-card"><small>{title.toUpperCase()}</small><ResponsiveContainer width="100%" height={150}><AreaChart data={history.map((s)=>({tick:s.tick,value:read(s)}))} margin={{top:15,right:8,left:-15,bottom:0}}><CartesianGrid stroke="#153a48" /><XAxis dataKey="tick" minTickGap={55} tick={{fontSize:8,fill:'#86aebe'}} /><YAxis width={45} tick={{fontSize:8,fill:'#86aebe'}} /><Tooltip labelFormatter={(tick)=>`Tick ${tick}`} contentStyle={{background:'#041c28',border:'1px solid #52a4be',fontSize:10}} /><Area dataKey="value" name={title} stroke={color} fill={color} fillOpacity={.12} dot={false} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>;
}
