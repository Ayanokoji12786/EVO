import { useEffect, useMemo, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore } from '../../state/simStore';
import type { HistoryEvent } from '../../simulation/types';

type Chapter = { generation:number; title:string; detail:string; tone:'birth'|'evolution'|'danger'|'final' };
function chapterFor(event:HistoryEvent):Chapter {
  const message=event.message.replace(/^Generation \d+\s+—\s*/,'');
  const danger=/extinction|meteor|drought|plague|wildfire/i.test(message);
  const evolution=/species emerged|increased|decreased|evolution/i.test(message);
  return {generation:event.generation,title:danger?'ECOLOGICAL CRISIS':evolution?'EVOLUTIONARY SHIFT':'A WORLD IN MOTION',detail:message,tone:danger?'danger':evolution?'evolution':'birth'};
}

export function GenerationsLater({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const setPaused=useSimStore((s)=>s.setPaused); const wasPaused=useSimStore((s)=>s.paused);
  const [index,setIndex]=useState(0);
  const chapters=useMemo(()=>{
    const events=controller.world.events.all().filter((e)=>e.generation>0 && ['evolutionary','extinction','environmental','divine'].includes(e.category));
    const featured=events.length<=4?events:events.filter((_,i)=>i%Math.ceil(events.length/4)===0).slice(0,4);
    const finalGen=controller.world.maxGenerationSeen;
    return [{generation:1,title:'THE WORLD BEGINS',detail:`${controller.world.config.initialPopulation} random organisms awaken beneath an unfamiliar sky.`,tone:'birth' as const},...featured.map(chapterFor),{generation:finalGen,title:'THE LIVING RECORD',detail:`${controller.world.species.living().length} species · ${controller.world.totalBirths.toLocaleString()} organisms born · ${controller.world.species.all().filter(s=>s.extinctTick!==null).length} extinct lineages`,tone:'final' as const}];
  },[controller]);
  const chapter=chapters[index]; const final=index===chapters.length-1;
  useEffect(()=>{setPaused(true); return()=>setPaused(wasPaused);},[setPaused,wasPaused]);
  useEffect(()=>{if(final)return;const timer=window.setTimeout(()=>setIndex(i=>Math.min(i+1,chapters.length-1)),2800);return()=>window.clearTimeout(timer);},[index,final,chapters.length]);
  return <div className={`evolution-replay ${chapter.tone}`} onClick={()=>final?onClose():setIndex(i=>Math.min(i+1,chapters.length-1))}>
    <div className="replay-grain"/><div className="replay-top"><span>▶ REPLAY EVOLUTION</span><small>CHAPTER {index+1} / {chapters.length} · CLICK TO ADVANCE</small></div>
    <div className="replay-card" key={`${index}-${chapter.generation}`}><small>GENERATION {chapter.generation.toLocaleString()}</small><h1>{chapter.title}</h1><p>{chapter.detail}</p>{final&&<><div className="replay-rule"/><strong>THIS WORLD BEGAN WITH {controller.world.config.initialPopulation} RANDOM ORGANISMS.</strong><button className="btn primary" onClick={(e)=>{e.stopPropagation();onClose();}}>RETURN TO WORLD</button></>}</div>
    <div className="replay-progress"><i style={{width:`${((index+1)/chapters.length)*100}%`}}/></div>
  </div>;
}
