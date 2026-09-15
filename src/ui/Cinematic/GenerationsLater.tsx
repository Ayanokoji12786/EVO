import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore } from '../../state/simStore';
import type { HistoryEvent } from '../../simulation/types';
import worldAtlas from '../../assets/world-atlas.png';
import crisis from '../../assets/world-crisis.png';
import orbitalHero from '../../assets/evo-orbital-hero.png';
import cosmos from '../../assets/genesis-cosmos.png';
import './GenerationsLater.css';

type Chapter = { generation:number; title:string; detail:string; tone:'birth'|'evolution'|'danger'|'final' };
function chapterFor(event:HistoryEvent):Chapter {
  const message=event.message.replace(/^Generation \d+\s+—\s*/,'');
  const danger=/extinction|meteor|drought|plague|wildfire|volcano|ice age/i.test(message);
  const title=/drought/i.test(message)?'THE GREAT DROUGHT':/meteor/i.test(message)?'A WORLD INTERRUPTED':/extinct/i.test(message)?'THE END OF A LINEAGE':/species|evolution/i.test(message)?'FROM SIMPLICITY, INFINITE FORMS':'A WORLD IN MOTION';
  return {generation:event.generation,title,detail:message,tone:danger?'danger':'evolution'};
}

export function GenerationsLater({controller,onClose}:{controller:SimulationController;onClose:()=>void}) {
  const setPaused=useSimStore((state)=>state.setPaused);
  const originalPause=useRef(useSimStore.getState().paused);
  const [index,setIndex]=useState(0);
  const [playing,setPlaying]=useState(true);
  const chapters=useMemo(()=>{
    const events=controller.world.events.all().filter((event)=>event.generation>0 && ['evolutionary','extinction','environmental','divine'].includes(event.category));
    const step=Math.max(1,Math.ceil(events.length/6));
    const featured=events.filter((_,i)=>i%step===0).slice(0,6);
    return [{generation:0,title:'LIFE BEGINS WITH A POSSIBILITY',detail:`${controller.world.config.initialPopulation.toLocaleString()} random organisms awaken in a new world.`,tone:'birth' as const},...featured.map(chapterFor),{generation:controller.world.maxGenerationSeen,title:'DIFFERENT HISTORIES. INFINITE POSSIBILITIES.',detail:`${controller.world.species.living().length} living species · ${controller.world.totalBirths.toLocaleString()} organisms born · ${controller.world.species.all().filter(item=>item.extinctTick!==null).length} extinct lineages`,tone:'final' as const}];
  },[controller]);
  const chapter=chapters[index];
  const final=index===chapters.length-1;
  useEffect(()=>{const restore=originalPause.current;setPaused(true);return()=>setPaused(restore);},[setPaused]);
  useEffect(()=>{if(final || !playing)return;const timer=window.setTimeout(()=>setIndex(current=>Math.min(current+1,chapters.length-1)),6000);return()=>window.clearTimeout(timer);},[index,final,playing,chapters.length]);
  const artwork=chapter.tone==='birth'?cosmos:chapter.tone==='danger'?crisis:chapter.tone==='final'?orbitalHero:worldAtlas;
  return <section className={`reference-replay ${chapter.tone}`} aria-label="Cinematic evolution replay">
    <div className="reference-replay-art" key={index} style={{backgroundImage:`url(${artwork})`}} />
    <div className="reference-replay-shade" />
    <header><span>E V O<small>THE LIVING RECORD</small></span><button aria-label="Close cinematic replay" onClick={onClose}>×</button></header>
    <div className="reference-replay-title" key={chapter.title}><small>GENERATION {chapter.generation.toLocaleString()}</small><h1>{chapter.title}</h1></div>
    <div className="reference-replay-detail"><span>CHAPTER {String(index+1).padStart(2,'0')} / {String(chapters.length).padStart(2,'0')}</span><p>{chapter.detail}</p><small>Illustrative cinematic artwork · details from this world's record</small></div>
    <div className="reference-replay-controls"><button disabled={index===0} aria-label="Previous replay chapter" onClick={()=>setIndex(current=>Math.max(0,current-1))}>‹</button><button aria-label={playing?'Pause cinematic replay':'Play cinematic replay'} onClick={()=>setPlaying(active=>!active)}>{playing?'Ⅱ':'▶'}</button><input aria-label="Replay chapter" type="range" min={0} max={chapters.length-1} value={index} onChange={event=>setIndex(Number(event.target.value))} /><button disabled={final} aria-label="Next replay chapter" onClick={()=>setIndex(current=>Math.min(chapters.length-1,current+1))}>›</button><button className="reference-replay-return" onClick={onClose}>RETURN TO WORLD →</button></div>
  </section>;
}
