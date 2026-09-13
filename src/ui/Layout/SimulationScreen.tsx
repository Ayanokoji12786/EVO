import { useEffect, useState } from 'react';
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
import { useSimStore } from '../../state/simStore';

type Modal = 'tree' | 'time' | 'experiment' | 'about' | 'cinematic' | null;

export function SimulationScreen({ config, onExit }: { config: WorldConfig; onExit: () => void }) {
  // The controller owns a rAF loop and a canvas attachment, so it must be created and
  // torn down entirely inside an effect (not useMemo) — React 19 StrictMode runs effects
  // mount -> cleanup -> mount in dev, and a memoized instance would get destroyed by the
  // phantom cleanup with no matching re-creation, permanently freezing the simulation.
  const [controller, setController] = useState<SimulationController | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const setWorldConfig = useSimStore((s) => s.setWorldConfig);
  const godMode = useSimStore((s) => s.godMode);
  const inspector = useSimStore((s) => s.inspector);

  useEffect(() => {
    const c = new SimulationController(config);
    setWorldConfig(config, config.seed);
    setController(c);
    if (import.meta.env.DEV) (window as unknown as { __controller: unknown }).__controller = c;
    return () => c.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  if (!controller) return null;

  return (
    <div style={{ position: 'absolute', inset: 0 }} data-godmode={godMode ? 'true' : 'false'}>
      <WorldCanvas controller={controller} />
      <TopBar
        onOpenTree={() => setModal('tree')}
        onOpenTimeMachine={() => setModal('time')}
        onOpenExperiment={() => setModal('experiment')}
        onOpenAbout={() => setModal('about')}
        onOpenCinematic={() => setModal('cinematic')}
        onExit={onExit}
      />

      {godMode && <GodPanel controller={controller} />}

      {/* A single flex row anchors World (left), the timeline (center, takes remaining
          space), and the Creature inspector (right) so they never overlap regardless of
          viewport width or how tall the World panel expands. */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 15, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <WorldPanel />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <BottomTimeline controller={controller} onOpen={() => setModal('time')} />
        </div>
        {inspector ? <CreatureInspector controller={controller} /> : <div />}
      </div>

      <DeathToast />

      {modal === 'tree' && <TreeOfLife controller={controller} onClose={() => setModal(null)} />}
      {modal === 'time' && <TimeMachine controller={controller} onClose={() => setModal(null)} />}
      {modal === 'experiment' && <ExperimentPanel controller={controller} onClose={() => setModal(null)} />}
      {modal === 'about' && <About onClose={() => setModal(null)} />}
      {modal === 'cinematic' && <GenerationsLater controller={controller} onClose={() => setModal(null)} />}
    </div>
  );
}
