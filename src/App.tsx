import { useState } from 'react';
import { CreateWorld } from './ui/Opening/CreateWorld';
import { SimulationScreen } from './ui/Layout/SimulationScreen';
import type { WorldConfig } from './simulation/types';
import { useSimStore } from './state/simStore';

function App() {
  const [config, setConfig] = useState<WorldConfig | null>(null);
  const setPhase = useSimStore((s) => s.setPhase);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {!config && (
        <CreateWorld
          onStart={(c) => {
            setConfig(c);
            setPhase('running');
          }}
        />
      )}
      {config && (
        <SimulationScreen
          key={config.seed + config.worldSize}
          config={config}
          onExit={() => {
            setConfig(null);
            setPhase('opening');
          }}
        />
      )}
    </div>
  );
}

export default App;
