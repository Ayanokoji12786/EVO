import { useEffect, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { Overlay } from '../TimeMachine/TimeMachine';
import { createExperimentPair, compareResults, exportResultAsCSV, exportResultAsJSON, type ExperimentVariable } from '../../experiments/experiment';
import { useSimStore } from '../../state/simStore';
import { stepWorld } from '../../simulation/engine';
import worldAtlas from '../../assets/world-atlas.png';
import './ExperimentPanel.css';

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
  const activeRun = useRef(false);
  const [error,setError] = useState<string | null>(null);

  useEffect(() => () => {
    cancelled.current = true;
    setRunning(false);
  }, [setRunning]);

  async function run() {
    if (activeRun.current) return;
    activeRun.current = true;
    cancelled.current = false;
    setError(null);
    setProgress(0);
    setRunning(true);
    setResult(null);
    try {
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
    } catch { if (!cancelled.current) setError('The experiment could not finish. Please try a shorter run.'); }
    finally { activeRun.current=false; setRunning(false); }
  }

  const variable = result?.variable ?? { path:VARIABLES[variableIdx].path,controlValue:VARIABLES[variableIdx].control,experimentValue:VARIABLES[variableIdx].experiment };
  const variableName = variable.path.split('.').at(-1)!.replace(/([A-Z])/g,' $1');

  return (
    <Overlay title="MULTIVERSE" onClose={onClose}>
      <p className="reference-subtitle">SAME BEGINNING. DIFFERENT POSSIBILITIES.</p>
      <div className="experiment-content scroll-thin">
        <div className="experiment-worlds reference-card"><WorldPreview title="WORLD A" label={`${variableName} · ${variable.controlValue}`} population={result?.control.population} generation={result?.control.generation} tick={result?.control.tick} /><span className="experiment-versus">VS</span><WorldPreview title="WORLD B" label={`${variableName} · ${variable.experimentValue}`} alternate population={result?.experimentWorld.population} generation={result?.experimentWorld.generation} tick={result?.experimentWorld.tick} /></div>
        <div className="experiment-workspace">
        <div className="reference-card experiment-controls">
          <label className="field">
            Question
            <input type="text" disabled={running} value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <label className="field">
            Variable to change
            <select disabled={running} value={variableIdx} onChange={(e) => setVariableIdx(Number(e.target.value))}>
              {VARIABLES.map((v, i) => (
                <option key={v.path} value={i}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Ticks to run <span className="value">{ticks}</span>
            <input type="range" disabled={running} min={500} max={20000} step={500} value={ticks} onChange={(e) => setTicks(Number(e.target.value))} />
          </label>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
            Both universes start from the exact same seed and population. Only the selected variable differs.
          </div>
          <button className="reference-primary" style={{ width: '100%' }} disabled={running} onClick={run}>
            {running ? `COMPARING… ${Math.round(progress * 100)}%` : 'COMPARE EVOLUTION →'}
          </button>
          {running && <progress max={1} value={progress} />}
          {error && <p role="alert">{error}</p>}
        </div>

        <div className="reference-card experiment-results">
          {!result && <div className="experiment-result-empty"><small>CONTROLLED EXPERIMENT</small><h3>One change can rewrite everything.</h3><p>Choose an environmental or genetic factor, then run both worlds to discover what diverges.</p></div>}
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
                        <td style={{ padding: '8px 0' }}>{r.trait.replace(/([A-Z])/g,' $1').replace(/^./,(letter)=>letter.toUpperCase())}</td>
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
      </div>
    </Overlay>
  );
}

function WorldPreview({title,label,alternate,population,generation,tick}:{title:string;label:string;alternate?:boolean;population?:number;generation?:number;tick?:number}) { return <div className={`experiment-world ${alternate?'is-alternate':''}`}><small>{title}</small><p>{label}</p><div className="experiment-globe" style={{backgroundImage:`url(${worldAtlas})`}} /><em>Illustrative world</em>{population !== undefined && <div className="experiment-world-numbers"><span>{population.toLocaleString()} organisms</span><span>{generation} generations · {tick?.toLocaleString()} ticks</span></div>}</div>; }

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
