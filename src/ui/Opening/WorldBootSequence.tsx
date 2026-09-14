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

// The five milestones shown as a persistent breadcrumb beneath the progress bar —
// stageIndex maps each timed frame onto one of these so the closing frames ("life finds
// a way") can keep the last milestone highlighted rather than inventing a sixth item.
const GENERATION_STAGES = [
  'GENERATING WORLD',
  'ASSEMBLING FIRST GENOMES',
  'ESTABLISHING LAWS OF NATURE',
  'INTRODUCING VARIATION',
  'INITIALIZING ECOSYSTEM',
] as const;

const BIRTH_STAGES = [
  { at: 0, label: 'GENERATING WORLD', stageIndex: 0 },
  { at: 1000, label: 'ASSEMBLING FIRST GENOMES', stageIndex: 1 },
  { at: 2000, label: 'ESTABLISHING LAWS OF NATURE', stageIndex: 2 },
  { at: 3000, label: 'INTRODUCING VARIATION', stageIndex: 3 },
  { at: 4000, label: 'INITIALIZING ECOSYSTEM', stageIndex: 4 },
  { at: 5100, label: 'LIFE FINDS A WAY.', stageIndex: 4 },
  { at: 6200, label: 'WORLD IS ALIVE', stageIndex: 4 },
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
    timers.push(window.setTimeout(() => finish(), 7400 * timing));
    return () => timers.forEach(window.clearTimeout);
  }, [finish, timing]);
  const current = BIRTH_STAGES[stage] ?? BIRTH_STAGES.at(-1)!;
  const alive = stage >= BIRTH_STAGES.length - 1;
  const className = `world-boot first-cell-loader stage-${stage}${alive ? ' is-alive' : ''}${hasGodHint(seed) ? ' has-god-hint' : ''}`;
  const progress = Math.round((stage / (BIRTH_STAGES.length - 1)) * 100);

  return (
    <section className={className} aria-label="Creating a new world" role="status">
      <div className="world-boot-particles" aria-hidden="true">
        {LIFE_POINTS.map(([x, y], index) => (
          <i key={index} style={{ '--x': `${x * 34}vw`, '--y': `${y * 34}vw`, '--delay': `${index * 43}ms` } as CSSProperties} />
        ))}
      </div>
      <div className="world-boot-life" aria-hidden="true">
        {LIFE_POINTS.map(([x, y], index) => (
          <i key={index} style={{ '--x': `${x * 85}vw`, '--y': `${y * 85}vh`, '--delay': `${index * 35}ms`, '--scale': 0.6 + (index % 5) * 0.15 } as CSSProperties} />
        ))}
      </div>
      <div className="world-boot-division" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => {
          const angle = (index / 16) * Math.PI * 2;
          const distance = 12 + (index % 4) * 7;
          return <i key={index} style={{ '--x': `${Math.cos(angle) * distance}vw`, '--y': `${Math.sin(angle) * distance}vh`, '--delay': `${index * 42}ms` } as CSSProperties} />;
        })}
      </div>

      <div className="world-boot-frame">
        <div className="world-boot-brand">
          <strong>EVO</strong>
          <span>ARTIFICIAL LIFE LAB</span>
        </div>
        <p className="world-boot-tagline">LIFE BEGINS<br />WITH A SINGLE<br />POSSIBILITY.</p>

        <div className="world-boot-heading">
          <h2>GENERATING <b>WORLD</b></h2>
          {current.label && <p className="world-boot-status">{current.label}&hellip;</p>}
        </div>

        <DividingCell stage={stage} />

        <div className="world-boot-progress" aria-hidden="true">
          <span><i style={{ width: `${Math.max(4, progress)}%` }} /></span>
          <b>{progress}%</b>
        </div>

        <ol className="world-boot-stagelist" aria-hidden="true">
          {GENERATION_STAGES.map((label, index) => (
            <li key={label} className={index === current.stageIndex ? 'is-active' : index < current.stageIndex ? 'is-done' : ''}>{label}</li>
          ))}
        </ol>

        <blockquote className="world-boot-quote">
          &ldquo;Life begins with a single possibility.&rdquo;
          <cite>&mdash; Unknown</cite>
        </blockquote>
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

/** A dividing-cell centerpiece built with layered SVGs: two glowing lobes on a warm
 * amber core with cyan neural filaments radiating out. Progresses through stages so the
 * cell physically divides as world generation completes — matches the reference's
 * centerpiece aesthetic without needing a rendered photograph as an asset. */
function DividingCell({ stage }: { stage: number }) {
  const separated = stage >= 3;
  const bloomed = stage >= 5;
  return (
    <div className={`dividing-cell ${separated ? 'is-separated' : ''} ${bloomed ? 'is-bloomed' : ''}`} aria-hidden="true">
      <div className="dividing-cell-aura" />
      <svg viewBox="-100 -100 200 200" className="dividing-cell-svg">
        <defs>
          <radialGradient id="cellCore" cx="0.4" cy="0.35">
            <stop offset="0%" stopColor="#fff2d8" />
            <stop offset="35%" stopColor="#ff9b52" />
            <stop offset="75%" stopColor="#c04a1f" />
            <stop offset="100%" stopColor="#3a0a02" />
          </radialGradient>
          <radialGradient id="cellHalo" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="rgba(140,200,255,0.55)" />
            <stop offset="50%" stopColor="rgba(60,120,200,0.22)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="cellGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Outer halo — always present, pulses subtly */}
        <circle cx="0" cy="0" r="90" fill="url(#cellHalo)" className="dividing-cell-halo-ring" />

        {/* Filaments — thin cyan strands radiating outward like a firing neuron */}
        <g className="dividing-cell-filaments" stroke="rgba(140,200,255,0.55)" strokeWidth="0.6" fill="none">
          {Array.from({ length: 18 }, (_, i) => {
            const angle = (i / 18) * Math.PI * 2;
            const inner = 46;
            const outer = 76 + (i % 3) * 8;
            const midAngle = angle + 0.14;
            return <path key={i} d={`M ${Math.cos(angle) * inner} ${Math.sin(angle) * inner} Q ${Math.cos(midAngle) * (inner + outer) / 2} ${Math.sin(midAngle) * (inner + outer) / 2} ${Math.cos(angle) * outer} ${Math.sin(angle) * outer}`} />;
          })}
        </g>

        {/* Left lobe */}
        <g className="dividing-cell-lobe dividing-cell-lobe-a" filter="url(#cellGlow)">
          <circle cx="-2" cy="0" r="42" fill="url(#cellCore)" />
          <circle cx="-2" cy="0" r="42" fill="none" stroke="rgba(180,220,255,0.5)" strokeWidth="1.4" />
        </g>
        {/* Right lobe */}
        <g className="dividing-cell-lobe dividing-cell-lobe-b" filter="url(#cellGlow)">
          <circle cx="2" cy="0" r="42" fill="url(#cellCore)" />
          <circle cx="2" cy="0" r="42" fill="none" stroke="rgba(180,220,255,0.5)" strokeWidth="1.4" />
        </g>

        {/* Bright centerline where the two lobes meet */}
        <ellipse cx="0" cy="0" rx="2" ry="30" fill="rgba(255,220,150,0.85)" filter="url(#cellGlow)" className="dividing-cell-centerline" />
      </svg>

      {/* Ambient particle field around the cell */}
      <div className="dividing-cell-particles">
        {Array.from({ length: 20 }, (_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const r = 110 + (i % 4) * 22;
          return <i key={i} style={{ '--dx': `${Math.cos(angle) * r}px`, '--dy': `${Math.sin(angle) * r}px`, '--delay': `${(i * 137) % 1200}ms` } as React.CSSProperties} />;
        })}
      </div>
    </div>
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
