import { useEffect, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { Overlay } from '../TimeMachine/TimeMachine';
import { createExperimentPair, compareResults, exportResultAsCSV, exportResultAsJSON, type ExperimentVariable } from '../../experiments/experiment';
import { useSimStore } from '../../state/simStore';
import { stepWorld } from '../../simulation/engine';

const VARIABLES: { path: ExperimentVariable['path']; label: string; control: number; experiment: number }[] = [
  { path: 'config.foodAbundance', label: 'Food abundance (control 1.0 vs experiment 0.5)', control: 1, experiment: 0.5 },
  { path: 'config.mutationRate', label: 'Mutation rate (control 0.04 vs experiment 0.15)', control: 0.04, experiment: 0.15 },
  { path: 'climate.rainfall', label: 'Rainfall (control 1.0 vs experiment 1.8)', control: 1, experiment: 1.8 },
  { path: 'climate.baseTemperature', label: 'Base temperature (control 0 vs experiment 0.6)', control: 0, experiment: 0.6 },
  { path: 'laws.predationEffectiveness', label: 'Predation effectiveness (control 1.0 vs experiment 2.0)', control: 1, experiment: 2 },
];

export function ExperimentPanel({ controller, onClose }: { controller: SimulationController; onClose: () => void }) {
  const [question, setQuestion] = useState('Does scarcity cause organisms to evolve greater speed?');
  const [variableIdx, setVariableIdx] = useState(0);
  const [ticks, setTicks] = useState(6000);
  const running = useSimStore((s) => s.experimentRunning);
  const setRunning = useSimStore((s) => s.setExperimentRunning);
  const result = useSimStore((s) => s.experimentResult);
  const setResult = useSimStore((s) => s.setExperimentResult);
  const [progress, setProgress] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => () => {
    cancelled.current = true;
    setRunning(false);
  }, [setRunning]);

  async function run() {
    cancelled.current = false;
    setRunning(true);
    setResult(null);
    const v = VARIABLES[variableIdx];
    const pair = createExperimentPair(
      controller.world.config,
      question,
      { path: v.path, controlValue: v.control, experimentValue: v.experiment },
    );
    const chunk = 200;
    let done = 0;
    while (done < ticks) {
      if (cancelled.current) return;
      const n = Math.min(chunk, ticks - done);
      for (let i = 0; i < n; i++) {
        if (pair.control.organisms.size > 0) stepWorld(pair.control, 1);
        if (pair.experimentWorld.organisms.size > 0) stepWorld(pair.experimentWorld, 1);
      }
      done += n;
      if (!cancelled.current) setProgress(done / ticks);
      await new Promise((r) => setTimeout(r, 0));
    }
    if (cancelled.current) return;
    setResult(compareResults(pair));
    setRunning(false);
  }

  return (
    <Overlay title="🧪 Experiment Mode" onClose={onClose}>
      <div style={{ display: 'flex', gap: 16, padding: 16, flex: 1, overflow: 'hidden' }}>
        <div className="glass" style={{ width: 340, padding: 16, overflowY: 'auto' }}>
          <label className="field">
            Question
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <label className="field">
            Variable to change
            <select value={variableIdx} onChange={(e) => setVariableIdx(Number(e.target.value))}>
              {VARIABLES.map((v, i) => (
                <option key={v.path} value={i}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Ticks to run <span className="value">{ticks}</span>
            <input type="range" min={500} max={20000} step={500} value={ticks} onChange={(e) => setTicks(Number(e.target.value))} />
          </label>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
            Both universes start from the exact same seed and population. Only the selected variable differs.
          </div>
          <button className="btn primary" style={{ width: '100%' }} disabled={running} onClick={run}>
            {running ? `Running… ${Math.round(progress * 100)}%` : 'SPLIT TIMELINE & RUN'}
          </button>
        </div>

        <div className="glass scroll-thin" style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          {!result && <div style={{ color: 'var(--text-dim)' }}>Run an experiment to see side-by-side results here.</div>}
          {result && (
            <>
              <h3 style={{ marginTop: 0 }}>{result.question}</h3>
              <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>CONTROL</div>
                  <div>Population {result.control.population}</div>
                  <div>Species {result.control.speciesCount}</div>
                  <div>Generation {result.control.generation}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--divine)' }}>EXPERIMENT</div>
                  <div>Population {result.experimentWorld.population}</div>
                  <div>Species {result.experimentWorld.speciesCount}</div>
                  <div>Generation {result.experimentWorld.generation}</div>
                </div>
              </div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-dim)', textAlign: 'left' }}>
                    <th>Trait</th>
                    <th>Control</th>
                    <th>Experiment</th>
                    <th>Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparison
                    .slice()
                    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
                    .map((r) => (
                      <tr key={r.trait} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 0' }}>{r.trait}</td>
                        <td>{r.control.toFixed(3)}</td>
                        <td>{r.experiment.toFixed(3)}</td>
                        <td style={{ color: r.deltaPct >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                          {r.deltaPct >= 0 ? '+' : ''}
                          {r.deltaPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn" onClick={() => downloadText(exportResultAsCSV(result), 'evo-experiment.csv')}>
                  Export CSV
                </button>
                <button className="btn" onClick={() => downloadText(exportResultAsJSON(result), 'evo-experiment.json')}>
                  Export JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
