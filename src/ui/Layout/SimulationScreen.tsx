import { useCallback, useEffect, useRef, useState } from 'react';
import { SimulationController } from '../../state/simulationController';
import type { WorldConfig } from '../../simulation/types';
import { WorldCanvas } from './WorldCanvas';
import { TopBar } from './TopBar';
import { WorldPanel } from './WorldPanel';
import { BottomTimeline } from './BottomTimeline';
import { CreatureInspector } from '../Inspector/CreatureInspector';
import { GodPanel } from '../GodMode/GodPanel';
import { DeathToast } from './DeathToast';
import { TreeOfLife } from '../TreeOfLife/TreeOfLife';
import { TimeMachine } from '../TimeMachine/TimeMachine';
import { ExperimentPanel } from '../Experiments/ExperimentPanel';
import { About } from '../About/About';
import { GenerationsLater } from '../Cinematic/GenerationsLater';
import { useSimStore, type PendingGodAction } from '../../state/simStore';
import { WorldBootSequence } from '../Opening/WorldBootSequence';
import type { WorldBootMode } from '../Opening/worldBoot';

type Modal = 'tree' | 'time' | 'experiment' | 'about' | 'cinematic' | null;

export function SimulationScreen({ config, onExit, bootMode = 'birth' }: { config: WorldConfig; onExit: () => void; bootMode?: WorldBootMode }) {
  // The controller owns a rAF loop and a canvas attachment, so it must be created and
  // torn down entirely inside an effect (not useMemo) — React 19 StrictMode runs effects
  // mount -> cleanup -> mount in dev, and a memoized instance would get destroyed by the
  // phantom cleanup with no matching re-creation, permanently freezing the simulation.
  const [controller, setController] = useState<SimulationController | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [godArrival, setGodArrival] = useState(false);
  const [radialAnchor, setRadialAnchor] = useState<{ x: number; y: number } | null>(null);
  const [impact, setImpact] = useState<{ before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number } | null>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const restoreSpeed = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealRaf = useRef<number | null>(null);
  const introFinished = useRef(false);
  const setWorldConfig = useSimStore((s) => s.setWorldConfig);
  const godMode = useSimStore((s) => s.godMode);
  const inspector = useSimStore((s) => s.inspector);
  const speed = useSimStore((s) => s.speed);
  const setGodMode = useSimStore((s) => s.setGodMode);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const setPaused = useSimStore((s) => s.setPaused);
  const rainBrush = useSimStore((s) => s.pendingGodAction?.kind === 'rainfall' ? s.pendingGodAction : null);
  const setPending = useSimStore((s) => s.setPendingGodAction);
  const evolutionVision = useSimStore((s) => s.evolutionVision);
  const species = useSimStore((s) => s.species);

  useEffect(() => {
    const c = new SimulationController(config);
    introFinished.current = false;
    // The world is already rendered under the introduction, but does not advance until
    // the cell divides and the camera arrives in the living simulation.
    setPaused(true);
    setWorldConfig(config, config.seed);
    setController(c);
    if (import.meta.env.DEV) (window as unknown as { __controller: unknown }).__controller = c;
    return () => c.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => () => {
    if (restoreSpeed.current) clearTimeout(restoreSpeed.current);
    if (revealRaf.current !== null) cancelAnimationFrame(revealRaf.current);
  }, []);

  const finishIntroduction = useCallback(() => {
    if (!controller) return;
    if (introFinished.current) return;
    introFinished.current = true;
    const startX = controller.camera.x;
    const startY = controller.camera.y;
    const startZoom = controller.camera.zoom;
    let focus = [...controller.world.organisms.values()][0];
    for (const organism of controller.world.organisms.values()) {
      if (!focus || Math.hypot(organism.x - startX, organism.y - startY) < Math.hypot(focus.x - startX, focus.y - startY)) focus = organism;
    }
    const targetX = focus?.x ?? startX;
    const targetY = focus?.y ?? startY;
    const targetZoom = Math.min(8, startZoom * 1.45);
    const started = performance.now();
    const animateCamera = (time: number) => {
      const progress = Math.min(1, (time - started) / 780);
      const eased = 1 - Math.pow(1 - progress, 3);
      controller.camera.x = startX + (targetX - startX) * eased;
      controller.camera.y = startY + (targetY - startY) * eased;
      controller.camera.zoom = startZoom + (targetZoom - startZoom) * eased;
      if (progress < 1) revealRaf.current = requestAnimationFrame(animateCamera);
    };
    revealRaf.current = requestAnimationFrame(animateCamera);
    setIntroComplete(true);
    setPaused(false);
  }, [controller, setPaused]);

  if (!controller) return null;

  const toggleGodMode = () => {
    if (godMode) {
      setGodMode(false);
      setGodArrival(false);
      setRadialAnchor(null);
      return;
    }
    setGodMode(true);
    setGodArrival(true);
    setSpeed(1);
    controller.zoom(0.88);
    restoreSpeed.current = setTimeout(() => {
      setGodArrival(false);
      setSpeed(speed);
    }, 700);
  };

  return (
    <div className={godArrival ? 'god-arrival-active' : ''} style={{ position: 'absolute', inset: 0 }} data-godmode={godMode ? 'true' : 'false'}>
      <WorldCanvas controller={controller} onGodInvoke={(point) => !godArrival && setRadialAnchor(point)} onMeteorImpact={(report) => { setImpact(report); window.setTimeout(() => setImpact(null), 4300); }} />
      {introComplete && <div className="simulation-ui is-visible">
        <TopBar
          onOpenTree={() => setModal('tree')}
          onOpenTimeMachine={() => setModal('time')}
          onOpenExperiment={() => setModal('experiment')}
          onOpenAbout={() => setModal('about')}
          onOpenCinematic={() => setModal('cinematic')}
          onGodMode={toggleGodMode}
          onExit={onExit}
        />
        <SimulationRail
          onOpenTree={() => setModal('tree')}
          onOpenTimeMachine={() => setModal('time')}
          onOpenExperiment={() => setModal('experiment')}
          onGodMode={toggleGodMode}
        />

        {godArrival && <GodArrival generation={useSimStore.getState().stats?.generation ?? 0} seed={useSimStore.getState().seedDisplay} />}
        {godMode && radialAnchor && !godArrival && <GodPanel controller={controller} anchor={radialAnchor} onClose={() => setRadialAnchor(null)} />}
        {rainBrush && <RainBrushPanel action={rainBrush} onChange={setPending} />}
        {impact && <MeteorImpactReport impact={impact} />}
        {evolutionVision && <EvolutionVision speciesCount={species.length} />}

        <div className="sim-bottom-bar">
          <WorldPanel />
          <BottomTimeline controller={controller} onOpen={() => setModal('time')} />
        </div>
        {inspector && <div className="creature-inspector-slot"><CreatureInspector controller={controller} /></div>}

        <DeathToast />

        {modal === 'tree' && <TreeOfLife controller={controller} onClose={() => setModal(null)} />}
        {modal === 'time' && <TimeMachine controller={controller} onClose={() => setModal(null)} />}
        {modal === 'experiment' && <ExperimentPanel controller={controller} onClose={() => setModal(null)} />}
        {modal === 'about' && <About onClose={() => setModal(null)} />}
        {modal === 'cinematic' && <GenerationsLater controller={controller} onClose={() => setModal(null)} />}
      </div>}
      {!introComplete && <WorldBootSequence mode={bootMode} seed={config.seed} generation={controller.world.maxGenerationSeen} events={controller.world.events.all()} onComplete={finishIntroduction} />}
    </div>
  );
}

function SimulationRail({ onOpenTree, onOpenTimeMachine, onOpenExperiment, onGodMode }: { onOpenTree: () => void; onOpenTimeMachine: () => void; onOpenExperiment: () => void; onGodMode: () => void }) {
  const evolutionVision = useSimStore((s) => s.evolutionVision);
  const setEvolutionVision = useSimStore((s) => s.setEvolutionVision);

  return <aside className="sim-rail" aria-label="World tools">
    <button className={evolutionVision ? 'is-active' : ''} onClick={() => setEvolutionVision(!evolutionVision)} title="Evolution Vision" aria-label="Toggle Evolution Vision"><span>⌬</span><small>EVOLVE</small></button>
    <button onClick={onOpenTree} title="Tree of Life" aria-label="Open Tree of Life"><span>⌁</span><small>LINEAGE</small></button>
    <button onClick={onOpenTimeMachine} title="Evolutionary timeline" aria-label="Open evolutionary timeline"><span>◷</span><small>HISTORY</small></button>
    <button onClick={onOpenExperiment} title="Experiments" aria-label="Open experiment lab"><span>◈</span><small>LAB</small></button>
    <i />
    <button className="sim-rail-god" onClick={onGodMode} title="God Mode" aria-label="Toggle God Mode"><span>ϟ</span><small>GOD</small></button>
  </aside>;
}

function GodArrival({ generation, seed }: { generation: number; seed: string }) {
  return <div className="god-arrival" aria-live="polite"><div className="god-arrival-lines" /><div className="god-arrival-message"><span>DIVINE CONTROL ESTABLISHED</span><small>WORLD {seed || '7F3A'} · GENERATION {generation.toLocaleString()}</small></div></div>;
}

function RainBrushPanel({ action, onChange }: { action: Extract<PendingGodAction, { kind: 'rainfall' }>; onChange: (action: Extract<PendingGodAction, { kind: 'rainfall' }> | null) => void }) {
  const field = (label: string, key: 'radius' | 'intensity' | 'duration', min: number, max: number, step: number, format: (v: number) => string) => <label className="rain-brush-field">{label}<b>{format(action[key])}</b><input type="range" min={min} max={max} step={step} value={action[key]} onChange={(e) => onChange({ ...action, [key]: Number(e.target.value) })} /></label>;
  return <div className="rain-brush-panel hud-panel"><div className="rain-brush-title"><span>🌧</span><div><strong>RAINFALL</strong><small>PAINT THE WEATHER</small></div><button onClick={() => onChange(null)}>×</button></div>{field('Intensity', 'intensity', 0.2, 1, 0.02, (v) => `${Math.round(v * 100)}%`)}{field('Radius', 'radius', 45, 190, 5, (v) => `${v}m`)}{field('Duration', 'duration', 240, 1800, 60, (v) => `${Math.round(v / 60)} days`)}<p>Drag over the land to form clouds, gather water, and grow a living food field.</p></div>;
}

function MeteorImpactReport({ impact }: { impact: { before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number } }) {
  return <div className="meteor-aftermath"><div className="impact-population"><span>{impact.before.toLocaleString()}</span><i>→</i><strong>{impact.after.toLocaleString()}</strong></div><div className="impact-report"><b>MASS EXTINCTION EVENT</b><span>{impact.percent.toFixed(1)}% of life eliminated</span><small>{impact.extinctSpecies} species extinct · {impact.survivors} lineages surviving</small></div></div>;
}

function EvolutionVision({ speciesCount }: { speciesCount: number }) {
  return <div className="evolution-vision" aria-live="polite"><div className="evolution-legend"><b>🧬 EVOLUTION VISION</b><span>GENETIC SIMILARITY FIELD · LAST 300 GENERATIONS</span></div><div className="evolution-branches"><i /><i /><i /></div>{speciesCount > 1 && <div className="speciation-detected"><b>SPECIATION DETECTED</b><span>one lineage has diverged into {speciesCount} living clusters</span></div>}</div>;
}
