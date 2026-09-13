import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { HistoryEvent } from '../../simulation/types';
import { createResumeFrames, hasGodHint, type WorldBootMode } from './worldBoot';

type WorldBootSequenceProps = {
  mode: WorldBootMode;
  seed: string;
  generation: number;
  events: HistoryEvent[];
  onComplete: () => void;
};

const BIRTH_STAGES = [
  { at: 0, label: '' },
  { at: 550, label: 'INITIALIZING PRIMORDIAL CONDITIONS' },
  { at: 1300, label: 'GENERATING WORLD' },
  { at: 2100, label: 'ASSEMBLING FIRST GENOMES' },
  { at: 2900, label: 'ESTABLISHING LAWS OF NATURE' },
  { at: 3700, label: 'INTRODUCING VARIATION' },
  { at: 4700, label: 'LIFE FINDS A WAY.' },
  { at: 5750, label: 'WORLD IS ALIVE' },
] as const;

const LIFE_POINTS = [
  [-0.48, -0.28], [-0.3, -0.42], [-0.12, -0.35], [0.1, -0.46], [0.31, -0.3], [0.48, -0.12],
  [-0.5, 0.03], [-0.33, 0.08], [-0.16, -0.08], [0.05, 0.05], [0.22, -0.02], [0.43, 0.15],
  [-0.44, 0.3], [-0.26, 0.37], [-0.08, 0.28], [0.12, 0.38], [0.3, 0.27], [0.49, 0.4],
  [-0.58, -0.06], [0.59, 0.02], [-0.05, -0.57], [0.08, 0.58], [-0.6, 0.51], [0.6, -0.5],
] as const;

export function WorldBootSequence({ mode, seed, generation, events, onComplete }: WorldBootSequenceProps) {
  return mode === 'resume'
    ? <ResumeWorldSequence generation={generation} events={events} onComplete={onComplete} />
    : <FirstCellSequence seed={seed} onComplete={onComplete} />;
}

function FirstCellSequence({ seed, onComplete }: Pick<WorldBootSequenceProps, 'seed' | 'onComplete'>) {
  const [stage, setStage] = useState(0);
  const completeRef = useRef(false);
  const reducedMotion = prefersReducedMotion();
  const timing = reducedMotion ? 0.06 : 1;
  const finish = useCallback(() => {
    if (completeRef.current) return;
    completeRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timers = BIRTH_STAGES.slice(1).map(({ at }, index) => window.setTimeout(() => setStage(index + 1), at * timing));
    timers.push(window.setTimeout(() => finish(), 7450 * timing));
    return () => timers.forEach(window.clearTimeout);
  }, [finish, timing]);
  const current = BIRTH_STAGES[stage] ?? BIRTH_STAGES.at(-1)!;
  const alive = stage >= BIRTH_STAGES.length - 1;
  const className = `world-boot first-cell-loader stage-${stage}${alive ? ' is-alive' : ''}${hasGodHint(seed) ? ' has-god-hint' : ''}`;

  return (
    <section className={className} aria-label="Creating a new world" role="status">
      <div className="world-boot-particles" aria-hidden="true">
        {LIFE_POINTS.map(([x, y], index) => (
          <i key={index} style={{ '--x': `${x * 34}vw`, '--y': `${y * 34}vw`, '--delay': `${index * 43}ms` } as CSSProperties} />
        ))}
      </div>
      <div className="primordial-cell" aria-hidden="true">
        <i className="cell-membrane" />
        <i className="cell-core" />
        <i className="cell-organelle cell-organelle-a" />
        <i className="cell-organelle cell-organelle-b" />
        <i className="cell-strand cell-strand-a" />
        <i className="cell-strand cell-strand-b" />
      </div>
      <div className="world-boot-life" aria-hidden="true">
        {LIFE_POINTS.map(([x, y], index) => (
          <i key={index} style={{ '--x': `${x * 85}vw`, '--y': `${y * 85}vh`, '--delay': `${index * 35}ms`, '--scale': 0.6 + (index % 5) * 0.15 } as CSSProperties} />
        ))}
      </div>

      <div className="world-boot-copy">
        {current.label && <p className="world-boot-status">{current.label}</p>}
      </div>
      <p className="world-boot-god-hint" aria-hidden="true">GOD DETECTED.</p>
      <div className="world-boot-title" aria-hidden={!alive}>
        <h1>E V O</h1>
        <p>Evolution, one mutation at a time.</p>
        <small>WORLD {seed} IS ALIVE</small>
      </div>
      <button className="world-boot-skip" type="button" onClick={finish}>Skip introduction</button>
    </section>
  );
}

function ResumeWorldSequence({ generation, events, onComplete }: Pick<WorldBootSequenceProps, 'generation' | 'events' | 'onComplete'>) {
  const frames = useMemo(() => createResumeFrames(events, generation), [events, generation]);
  const [index, setIndex] = useState(0);
  const completeRef = useRef(false);
  const reducedMotion = prefersReducedMotion();
  const timing = reducedMotion ? 0.08 : 1;
  const finish = useCallback(() => {
    if (completeRef.current) return;
    completeRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timers = frames.slice(1).map((_, frameIndex) => window.setTimeout(() => setIndex(frameIndex + 1), (frameIndex + 1) * 720 * timing));
    timers.push(window.setTimeout(() => finish(), (frames.length + 1) * 720 * timing));
    return () => timers.forEach(window.clearTimeout);
  }, [finish, frames, timing]);
  const frame = frames[index] ?? frames.at(-1)!;

  return (
    <section className="world-boot resume-world-loader" aria-label="Resuming evolutionary history" role="status">
      <div className={`resume-organism morph-${index % 4}`} aria-hidden="true"><i /><i /><i /></div>
      <div className="resume-copy">
        <p>GEN {frame.generation.toLocaleString()} — {frame.title}</p>
        <small>{index === frames.length - 1 ? 'RESUMING EVOLUTION...' : 'RECONSTRUCTING EVOLUTIONARY HISTORY'}</small>
      </div>
      <button className="world-boot-skip" type="button" onClick={finish}>Skip introduction</button>
    </section>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
