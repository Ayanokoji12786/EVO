import { useState } from 'react';
import { useSimStore } from '../../state/simStore';
import type { EventCategory } from '../../simulation/types';
import { ReferenceIcon } from '../shared/ReferenceIcon';
import './EventLogPanel.css';

const CATEGORIES:Record<EventCategory,string>={natural:'Natural',divine:'Interventions',evolutionary:'Evolution',extinction:'Extinctions',environmental:'Environment'};
const ICONS:Record<EventCategory,string>={natural:'life',divine:'storm',evolutionary:'evolution',extinction:'destruction',environmental:'globe'};
export function EventLogPanel({embedded=false}:{embedded?:boolean}) {
  const events=useSimStore((s)=>s.events);
  const [category,setCategory]=useState<EventCategory|'all'>('all');
  const recent=events.filter((event)=>category==='all'||event.category===category).slice(-60).reverse();
  return <section className={`natural-history ${embedded?'is-embedded':'scroll-thin'}`} aria-label="Natural History">
    <header><div><small>THE WORLD REMEMBERS</small><h3>NATURAL HISTORY</h3><p>Real events from your world, newest first.</p></div><span>{events.length.toLocaleString()} retained events</span></header>
    <nav aria-label="History event categories"><button aria-pressed={category==='all'} onClick={()=>setCategory('all')}>All Events</button>{Object.entries(CATEGORIES).map(([key,value])=><button key={key} aria-pressed={category===key} onClick={()=>setCategory(key as EventCategory)}>{value}</button>)}</nav>
    <div className="natural-history-records">{recent.length ? recent.map((event)=><article key={event.id} className={`history-${event.category}`}><div className="natural-history-icon"><ReferenceIcon kind={ICONS[event.category]} size={23}/></div><div><small>{CATEGORIES[event.category].toUpperCase()} · GENERATION {event.generation.toLocaleString()}</small><p>{event.message.replace(/^Generation \d+\s+—\s*/,'')}</p></div><span>Tick {event.tick.toLocaleString()}</span></article>) : <div className="natural-history-empty"><ReferenceIcon kind="life" size={38}/><h3>A new chapter is forming.</h3><p>No events in this category yet. Keep observing the world.</p></div>}</div>
    {recent.length===60&&<p className="reference-note">Showing the latest 60 events in this category.</p>}
  </section>;
}
