import { useCallback, useEffect, useRef, useState } from 'react';
import { SimulationController } from '../../state/simulationController';
import type { WorldConfig, Organism } from '../../simulation/types';
import { WorldCanvas } from './WorldCanvas';
import { TopBar } from './TopBar';
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
import { seasonalFactor } from '../../environment/climate';
import { WorldCard } from './WorldCard';
import { CompassBiome } from './CompassBiome';
import { SimulationRail, type RailTool } from './SimulationRail';
import type { GodCategory } from '../GodMode/GodPanel';
import { WorldAnalytics } from '../Analytics/WorldAnalytics';
import { WorldInsights } from '../Insights/WorldInsights';
import { ReferenceIcon } from '../shared/ReferenceIcon';
import './EvolutionVision.css';

type Modal = 'tree' | 'time' | 'experiment' | 'about' | 'cinematic' | 'analytics' | 'insights' | null;

// Fixed wheel position, independent of any click/anchor — matches the reference, where
// the radial always opens in the same place rather than following the cursor.
const GOD_WHEEL_ANCHOR = { x: 360, y: 420 };

export function SimulationScreen({ config, onExit, bootMode = 'birth' }: { config: WorldConfig; onExit: () => void; bootMode?: WorldBootMode }) {
  // The controller owns a rAF loop and a canvas attachment, so it must be created and
  // torn down entirely inside an effect (not useMemo) — React 19 StrictMode runs effects
  // mount -> cleanup -> mount in dev, and a memoized instance would get destroyed by the
  // phantom cleanup with no matching re-creation, permanently freezing the simulation.
  const [controller, setController] = useState<SimulationController | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [godArrival, setGodArrival] = useState(false);
  const [radialAnchor, setRadialAnchor] = useState<{ x: number; y: number } | null>(null);
  const [godInitialLayer, setGodInitialLayer] = useState<GodCategory | null>(null);
  const [activeRailTool, setActiveRailTool] = useState<RailTool>('world');
  const [impact, setImpact] = useState<{ before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number } | null>(null);
  const [divineToast, setDivineToast] = useState<string | null>(null);
  const [hudIdle, setHudIdle] = useState(false);
  const divineToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hudIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const seedDisplay = useSimStore((s) => s.seedDisplay);

  useEffect(() => {
    const c = new SimulationController(config);
    introFinished.current = false;
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
    if (divineToastTimer.current) clearTimeout(divineToastTimer.current);
    if (hudIdleTimer.current) clearTimeout(hudIdleTimer.current);
  }, []);

  const wakeHud = useCallback(() => {
    setHudIdle(false);
    if (hudIdleTimer.current) clearTimeout(hudIdleTimer.current);
    hudIdleTimer.current = null;
    if (modal === null && !inspector && !godMode) {
      hudIdleTimer.current = setTimeout(() => setHudIdle(true), 3200);
    }
  }, [godMode, inspector, modal]);

  useEffect(() => {
    wakeHud();
    return () => {
      if (hudIdleTimer.current) clearTimeout(hudIdleTimer.current);
      hudIdleTimer.current = null;
    };
  }, [wakeHud]);

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

  const enterGodWheel = (tool: RailTool, initialLayer: GodCategory | null) => {
    setModal(null);
    setPending(null);
    setActiveRailTool(tool);
    setGodInitialLayer(initialLayer);
    setRadialAnchor(GOD_WHEEL_ANCHOR);
    if (!godMode) {
      setGodMode(true);
      setGodArrival(true);
      setSpeed(1);
      controller.zoom(0.88);
      restoreSpeed.current = setTimeout(() => {
        setGodArrival(false);
        setSpeed(speed);
      }, 700);
    }
  };

  const showDivineToast = (message: string) => {
    setDivineToast(message);
    if (divineToastTimer.current) clearTimeout(divineToastTimer.current);
    divineToastTimer.current = setTimeout(() => setDivineToast(null), 3200);
  };

  // Every full-screen view (Tree of Life, Analytics, Time Machine, Experiments...) should
  // be the only floating panel on top of it — opening one always closes a dangling God
  // wheel first, so the two can never render stacked on top of each other.
  const openModal = (m: Exclude<Modal, null>) => {
    setPending(null);
    setModal(m);
    setRadialAnchor(null);
    setGodInitialLayer(null);
  };

  const handleSelectTool = (tool: RailTool) => {
    if (tool === 'world') {
      if (restoreSpeed.current) clearTimeout(restoreSpeed.current);
      setGodArrival(false);
      setActiveRailTool('world');
      setGodMode(false);
      setPending(null);
      setRadialAnchor(null);
      setGodInitialLayer(null);
      setModal(null);
      return;
    }
    if (tool === 'tools') { setActiveRailTool('tools'); openModal('experiment'); return; }
    if (tool === 'analytics') { setActiveRailTool('analytics'); openModal('analytics'); return; }
    if (tool === 'evolution') { setActiveRailTool('evolution'); openModal('tree'); return; }
    if (tool === 'life') {
      setModal(null);
      setRadialAnchor(null);
      setPending(null);
      setActiveRailTool('life');
      if (!inspector) {
        let closest: Organism | null = null;
        let bestDist = Infinity;
        for (const org of controller.world.organisms.values()) {
          if (!org.alive) continue;
          const d = Math.hypot(org.x - controller.camera.x, org.y - controller.camera.y);
          if (d < bestDist) { bestDist = d; closest = org; }
        }
        if (closest) controller.select(closest.id);
      }
      return;
    }
    enterGodWheel(tool, tool === 'weather' ? 'weather' : null);
  };

  // Simulated "year" from the world's tick — ticks per year is arbitrary but derived so
  // higher speed setting still walks the clock at the same rate. Kept out of the World
  // card component so the top-right card can render without touching the raw sim state.
  const worldYear = Math.max(1, Math.floor(controller.world.tick / 60));
  const seasonPct = seasonalFactor(controller.world.climate); // 0=winter, 1=summer
  const worldTempC = Math.round(15 + controller.world.climate.baseTemperature * 12 + (seasonPct - 0.5) * 12);

  return (
    <div
      className={godArrival ? 'god-arrival-active' : ''}
      style={{ position: 'absolute', inset: 0 }}
      data-godmode={godMode ? 'true' : 'false'}
      onPointerMove={wakeHud}
      onPointerDown={wakeHud}
      onWheel={wakeHud}
      onTouchStart={wakeHud}
      onKeyDown={wakeHud}
    >
      <WorldCanvas controller={controller} onMeteorImpact={(report) => { setImpact(report); window.setTimeout(() => setImpact(null), 4300); }} />
      {introComplete && <div
        className={`simulation-ui is-visible${hudIdle ? ' is-hud-idle' : ''}${godMode ? ' mode-god' : ' mode-world'}`}
        onFocusCapture={wakeHud}
      >
        <TopBar
          onOpenTree={() => { setActiveRailTool('evolution'); openModal('tree'); }}
          onOpenTimeMachine={() => openModal('time')}
          onOpenExperiment={() => { setActiveRailTool('tools'); openModal('experiment'); }}
          onOpenAbout={() => openModal('about')}
          onOpenCinematic={() => openModal('cinematic')}
          onOpenInsights={() => openModal('insights')}
          onExit={onExit}
        />
        {!inspector && modal === null && <WorldCard seed={seedDisplay} climate={config.climate} year={worldYear} tempC={worldTempC} />}
        <SimulationRail activeTool={activeRailTool} onSelectTool={handleSelectTool} />

        {godArrival && <GodArrival generation={useSimStore.getState().stats?.generation ?? 0} seed={useSimStore.getState().seedDisplay} />}
        {godMode && radialAnchor && !godArrival && (
          <GodPanel
            key={godInitialLayer ?? 'root'}
            controller={controller}
            anchor={radialAnchor}
            initialLayer={godInitialLayer}
            onClose={() => { setRadialAnchor(null); setGodInitialLayer(null); }}
            onAction={showDivineToast}
          />
        )}
        {rainBrush && modal === null && !radialAnchor && <RainBrushPanel controller={controller} action={rainBrush} onChange={setPending} onAction={showDivineToast} />}
        {impact && <MeteorImpactReport impact={impact} />}
        {evolutionVision && modal === null && <EvolutionVision speciesCount={species.length} selectedName={inspector?.name ?? null} />}
        {divineToast && <div className="divine-toast">{divineToast}</div>}

        {modal === null && <CompassBiome controller={controller} tempC={worldTempC} />}
        <BottomTimeline controller={controller} onOpen={() => openModal('time')} />
        {inspector && modal === null && <div className="creature-inspector-slot"><CreatureInspector controller={controller} onAction={showDivineToast} /></div>}

        <DeathToast />

        {modal === 'tree' && <TreeOfLife controller={controller} onClose={() => { setModal(null); setActiveRailTool('world'); }} />}
        {modal === 'analytics' && <WorldAnalytics controller={controller} onAsk={() => openModal('insights')} onClose={() => { setModal(null); setActiveRailTool('world'); }} />}
        {modal === 'insights' && <WorldInsights controller={controller} onClose={() => { setModal(null); setActiveRailTool('world'); }} />}
        {modal === 'time' && <TimeMachine controller={controller} onClose={() => setModal(null)} />}
        {modal === 'experiment' && <ExperimentPanel controller={controller} onClose={() => { setModal(null); setActiveRailTool('world'); }} />}
        {modal === 'about' && <About onClose={() => setModal(null)} />}
        {modal === 'cinematic' && <GenerationsLater controller={controller} onClose={() => setModal(null)} />}
      </div>}
      {!introComplete && (
        <WorldBootSequence
          mode={bootMode}
          seed={config.seed}
          generation={controller.world.maxGenerationSeen}
          events={controller.world.events.all()}
          climate={config.climate}
          foodAbundance={config.foodAbundance}
          onComplete={finishIntroduction}
          onEcologyReveal={() => setPaused(false)}
        />
      )}
    </div>
  );
}

function GodArrival({ generation, seed }: { generation: number; seed: string }) {
  return <div className="god-arrival" aria-live="polite"><div className="god-arrival-lines" /><div className="god-arrival-message"><span>DIVINE CONTROL ESTABLISHED</span><small>WORLD {seed || '7F3A'} · GENERATION {generation.toLocaleString()}</small></div></div>;
}

function RainBrushPanel({ controller, action, onChange, onAction }: { controller: SimulationController; action: Extract<PendingGodAction, { kind: 'rainfall' }>; onChange: (action: Extract<PendingGodAction, { kind: 'rainfall' }> | null) => void; onAction: (message: string) => void }) {
  const field = (label: string, key: 'radius' | 'intensity' | 'duration', min: number, max: number, step: number, format: (v: number) => string) => <label className="rain-brush-field">{label}<b>{format(action[key])}</b><input type="range" min={min} max={max} step={step} value={action[key]} onChange={(e) => onChange({ ...action, [key]: Number(e.target.value) })} /></label>;
  return <section className="rain-brush-panel hud-panel" aria-label="Rainfall tool"><div className="rain-brush-title"><span>☁</span><div><strong>RAINFALL TOOL</strong><small>INCREASE PRECIPITATION</small></div><button onClick={() => onChange(null)} aria-label="Close rainfall tool">×</button></div>{field('Intensity', 'intensity', 0.2, 1, 0.02, (v) => `${Math.round(v * 100)}%`)}{field('Radius', 'radius', 45, 190, 5, (v) => `${v} m`)}{field('Duration', 'duration', 240, 1800, 60, (v) => `${Math.round(v / 60)} days`)}<button className="rain-brush-apply" onClick={() => { const target = controller.targetTerrain(controller.camera.viewportW / 2, controller.camera.viewportH / 2); if (target) { controller.applyPendingGodAction(...target); onAction('Rainfall applied to the centre of your view.'); } else onAction('Move your view over the world to apply rainfall.'); }}>APPLY TO VIEW CENTRE　→</button><p>Click or drag on the world to paint rain in a selected area. Life responds over the following days.</p><div className="rain-brush-live"><span>WORLD RAINFALL</span><b>{controller.world.climate.rainfall.toFixed(2)}×</b></div></section>;
}

function MeteorImpactReport({ impact }: { impact: { before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number } }) {
  return <div className="meteor-aftermath"><div className="impact-population"><span>{impact.before.toLocaleString()}</span><i>→</i><strong>{impact.after.toLocaleString()}</strong></div><div className="impact-report"><b>MASS EXTINCTION EVENT</b><span>{impact.percent.toFixed(1)}% of life eliminated</span><small>{impact.extinctSpecies} species extinct · {impact.survivors} lineages surviving</small></div></div>;
}

function EvolutionVision({ speciesCount, selectedName }: { speciesCount: number; selectedName: string | null }) {
  return <section className="evolution-vision" aria-label="Evolution Vision"><div className="evolution-field-card"><ReferenceIcon kind="evolution" size={25} /><div><h2>EVOLUTION VISION</h2><p>{selectedName ? `GENETIC DISTANCE · RELATIVE TO ${selectedName}` : 'CURRENT WORLD · HERITABLE TRAIT COLOURS'}</p></div><span>{speciesCount} living species</span>{selectedName ? <div className="evolution-distance-scale"><i /><small>Similar · 0</small><small>Distant · 1</small></div> : <small className="evolution-field-note">Select a creature to compare normalized genetic distance.<br />Without a selection, hues encode a weighted trait signature.</small>}</div></section>;
}
