import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { HistoryEvent, WorldConfig } from '../../simulation/types';
import orbitalHero from '../../assets/evo-orbital-hero.png';
import { createResumeFrames, flavorLine, hasGodHint, type WorldBootMode } from './worldBoot';

type WorldBootSequenceProps = {
  mode: WorldBootMode;
  seed: string;
  generation: number;
  events: HistoryEvent[];
  climate: WorldConfig['climate'];
  foodAbundance: number;
  onComplete: () => void;
  /** Fired once, the moment the sequence reaches the "ecology" phase — lets the caller
   * unpause the (already fully-generated, already-rendering) simulation a little early so
   * real creatures are actually wandering by the time the dark overlay dissolves away,
   * instead of revealing a static frame. finishIntroduction() unpauses unconditionally at
   * the end regardless, so skipping the intro before this ever fires is still safe. */
  onEcologyReveal?: () => void;
};

type Phase = 'seed' | 'matter' | 'life' | 'ecology' | 'arrival';

// Percent-of-progress boundaries and status copy for each narrative beat. `to` is the
// percent at which this phase ENDS (i.e. the next phase's start) — arrival's `to` is 100.
const PHASES: { key: Phase; to: number; label: string }[] = [
  { key: 'seed', to: 20, label: 'ESTABLISHING PHYSICAL LAWS' },
  { key: 'matter', to: 45, label: 'SCULPTING LAND AND WATER' },
  { key: 'life', to: 70, label: 'ASSEMBLING FIRST GENOMES' },
  { key: 'ecology', to: 90, label: 'BALANCING A LIVING SYSTEM' },
  { key: 'arrival', to: 100, label: '' },
];

function phaseForPercent(percent: number): (typeof PHASES)[number] {
  return PHASES.find((p) => percent < p.to) ?? PHASES[PHASES.length - 1];
}

function phaseIndex(key: Phase): number {
  return PHASES.findIndex((p) => p.key === key);
}

// Branch-tip positions for the Life-stage genetic network, as percent-of-box coordinates
// (50,50 = center) so the SVG paths and the HTML organism-silhouette blips can share one
// source of truth instead of two coordinate systems drifting apart.
const NETWORK_TIPS: { xPct: number; yPct: number; delay: number }[] = [
  { xPct: 27, yPct: 33, delay: 0 },
  { xPct: 75, yPct: 40, delay: 340 },
  { xPct: 35, yPct: 73, delay: 680 },
  { xPct: 72, yPct: 70, delay: 1020 },
];
const toSvg = (pct: number) => pct * 2 - 100;

const BLOOM_POINTS = [
  [-0.42, 0.5], [-0.2, 0.62], [0.05, 0.48], [0.28, 0.6], [0.46, 0.42],
  [-0.55, 0.3], [0.55, 0.25], [-0.1, 0.7], [0.15, 0.35], [-0.35, 0.15],
] as const;

export function WorldBootSequence({ mode, seed, generation, events, climate, foodAbundance, onComplete, onEcologyReveal }: WorldBootSequenceProps) {
  return mode === 'resume'
    ? <ResumeWorldSequence generation={generation} events={events} onComplete={onComplete} />
    : <FirstCellSequence seed={seed} climate={climate} foodAbundance={foodAbundance} onComplete={onComplete} onEcologyReveal={onEcologyReveal} />;
}

function FirstCellSequence({
  seed, climate, foodAbundance, onComplete, onEcologyReveal,
}: Pick<WorldBootSequenceProps, 'seed' | 'climate' | 'foodAbundance' | 'onComplete' | 'onEcologyReveal'>) {
  const [percent, setPercent] = useState(0);
  const [holding, setHolding] = useState(false);
  const completeRef = useRef(false);
  const ecologyFiredRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const reducedMotion = prefersReducedMotion();
  const totalMs = reducedMotion ? 500 : 9200;
  const holdMs = reducedMotion ? 150 : 1600;

  const finish = useCallback(() => {
    if (completeRef.current) return;
    completeRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    let raf = 0;
    let holdTimer: number | null = null;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setPercent(pct);
      if (pct >= 100) {
        setHolding(true);
        holdTimer = window.setTimeout(finish, holdMs);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (holdTimer !== null) window.clearTimeout(holdTimer);
    };
  }, [finish, totalMs, holdMs]);

  const phase = phaseForPercent(percent);

  useEffect(() => {
    if (phase.key === 'ecology' && !ecologyFiredRef.current) {
      ecologyFiredRef.current = true;
      onEcologyReveal?.();
    }
  }, [phase.key, onEcologyReveal]);

  const alive = holding;
  const className = `world-boot first-cell-loader phase-${phase.key}${alive ? ' is-alive' : ''}${hasGodHint(seed) ? ' has-god-hint' : ''}`;
  const progress = Math.round(percent);
  const quote = useMemo(() => flavorLine({ climate, foodAbundance }), [climate, foodAbundance]);
  const namedPhases = PHASES.filter((p) => p.label);
  const currentIndex = phaseIndex(phase.key);

  return (
    <section className={className} aria-label="Creating a new world" role="status">
      <div className="world-boot-backdrop" style={{ backgroundImage: `url(${orbitalHero})` }} aria-hidden="true" />
      <div className="world-boot-grain" aria-hidden="true" />
      <div className="world-boot-rain" aria-hidden="true" />
      <div className="world-boot-bloom" aria-hidden="true">
        {BLOOM_POINTS.map(([x, y], index) => (
          <i key={index} style={{ '--x': `${x * 30}vw`, '--y': `${y * 26}vh`, '--delay': `${index * 180}ms` } as CSSProperties} />
        ))}
      </div>
      <div className="world-boot-bokeh" aria-hidden="true">
        <i className="bokeh-a" /><i className="bokeh-b" /><i className="bokeh-c" /><i className="bokeh-d" /><i className="bokeh-e" />
      </div>
      <div className="world-boot-flythrough" aria-hidden="true"><i /><i /><i /></div>

      <div className="world-boot-frame">
        <div className="world-boot-brand">
          <strong>EVO</strong>
          <span>ARTIFICIAL LIFE LAB</span>
        </div>
        <p className="world-boot-tagline">LIFE BEGINS<br />WITH A SINGLE<br />POSSIBILITY.</p>

        <div className="world-boot-heading">
          <h2>GENERATING <b>WORLD</b></h2>
          {phase.label && <p className="world-boot-status">{phase.label}&hellip;</p>}
        </div>

        <div className="world-boot-artgroup">
          <DividingCell phase={phase.key} />
          <TerrainForming phase={phase.key} />
          <GeneticNetwork phase={phase.key} />
          {phase.key === 'seed' && <p className="world-boot-seedline">WORLD SEED {seed}</p>}
        </div>

        <div className="world-boot-progress" aria-hidden="true">
          <span><i style={{ width: `${Math.max(4, progress)}%` }} /></span>
          <b>{progress}%</b>
        </div>

        <ol className="world-boot-stagelist" aria-hidden="true">
          {namedPhases.map((p) => (
            <li key={p.key} className={p.key === phase.key ? 'is-active' : phaseIndex(p.key) < currentIndex ? 'is-done' : ''}>{p.label}</li>
          ))}
        </ol>

        <blockquote className="world-boot-quote">&ldquo;{quote}&rdquo;</blockquote>
      </div>

      <p className="world-boot-god-hint" aria-hidden="true">GOD DETECTED.</p>
      <div className="world-boot-title" aria-hidden={!alive}>
        <h1>E V O</h1>
        <p>LIFE DOESN&apos;T FOLLOW A SCRIPT.</p>
        <small>WORLD {seed} IS ALIVE</small>
      </div>
      <button className="world-boot-skip" type="button" onClick={finish}>Skip introduction</button>
    </section>
  );
}

/** A dividing-cell centerpiece built with layered SVGs: two glowing lobes on a warm
 * amber core with cyan neural filaments radiating out. Present through Seed/Matter,
 * fading out once Life hands off to the genetic network — it has done its job of
 * dividing by then. */
function DividingCell({ phase }: { phase: Phase }) {
  const separated = phase !== 'seed';
  const bloomed = phase === 'life' || phase === 'ecology' || phase === 'arrival';
  const fading = phase === 'life' || phase === 'ecology' || phase === 'arrival';
  return (
    <div className={`dividing-cell ${separated ? 'is-separated' : ''} ${bloomed ? 'is-bloomed' : ''} ${fading ? 'is-fading' : ''}`} aria-hidden="true">
      <div className="dividing-cell-aura" />
      <svg viewBox="-100 -100 200 200" className="dividing-cell-svg">
        <defs>
          <radialGradient id="cellCore" cx="0.4" cy="0.35">
            <stop offset="0%" stopColor="#fff2d8" />
            <stop offset="35%" stopColor="#ff9b52" />
            <stop offset="75%" stopColor="#c04a1f" />
            <stop offset="100%" stopColor="#3a0a02" />
          </radialGradient>
          {/* Membrane body: dark, cool, and lit only at the rim — a flat fill here would
              read as a vector circle, so the visible "surface" comes almost entirely from
              the rim-light and displacement-mapped speckle layers below instead. */}
          <radialGradient id="cellBody" cx="0.38" cy="0.32">
            <stop offset="0%" stopColor="#2a4258" />
            <stop offset="45%" stopColor="#152535" />
            <stop offset="80%" stopColor="#060d16" />
            <stop offset="100%" stopColor="#02050a" />
          </radialGradient>
          <radialGradient id="cellRim" cx="0.5" cy="0.5" r="0.5">
            <stop offset="72%" stopColor="rgba(150,210,255,0)" />
            <stop offset="90%" stopColor="rgba(150,210,255,.55)" />
            <stop offset="97%" stopColor="rgba(210,240,255,.95)" />
            <stop offset="100%" stopColor="rgba(210,240,255,0)" />
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
          {/* Organic surface speckle: fractal noise displaces a ring of dots so the
              membrane edge reads as an irregular biological surface instead of a
              perfect vector circle — the single biggest lever for a photographic feel. */}
          <filter id="cellSurface" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" />
          </filter>
          <clipPath id="cellClipA"><circle cx="-2" cy="0" r="42" /></clipPath>
          <clipPath id="cellClipB"><circle cx="2" cy="0" r="42" /></clipPath>
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
        <g className="dividing-cell-lobe dividing-cell-lobe-a">
          <circle cx="-2" cy="0" r="42" fill="url(#cellBody)" />
          <g clipPath="url(#cellClipA)" filter="url(#cellSurface)" opacity="0.5">
            <circle cx="-2" cy="0" r="42" fill="none" stroke="rgba(120,180,230,.4)" strokeWidth="7" />
            <circle cx="-2" cy="0" r="30" fill="none" stroke="rgba(80,140,190,.28)" strokeWidth="5" />
          </g>
          <circle cx="-2" cy="0" r="42" fill="url(#cellRim)" />
          <circle cx="-2" cy="0" r="42" fill="none" stroke="rgba(180,220,255,0.5)" strokeWidth="1" />
        </g>
        {/* Right lobe */}
        <g className="dividing-cell-lobe dividing-cell-lobe-b">
          <circle cx="2" cy="0" r="42" fill="url(#cellBody)" />
          <g clipPath="url(#cellClipB)" filter="url(#cellSurface)" opacity="0.5">
            <circle cx="2" cy="0" r="42" fill="none" stroke="rgba(120,180,230,.4)" strokeWidth="7" />
            <circle cx="2" cy="0" r="30" fill="none" stroke="rgba(80,140,190,.28)" strokeWidth="5" />
          </g>
          <circle cx="2" cy="0" r="42" fill="url(#cellRim)" />
          <circle cx="2" cy="0" r="42" fill="none" stroke="rgba(180,220,255,0.5)" strokeWidth="1" />
        </g>

        {/* Core glow shows through both lobes at the seam, plus the molten contact line */}
        <g filter="url(#cellGlow)">
          <circle cx="0" cy="0" r="16" fill="url(#cellCore)" opacity="0.9" />
          <ellipse cx="0" cy="0" rx="2.2" ry="32" fill="rgba(255,225,160,0.9)" className="dividing-cell-centerline" />
        </g>
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

/** Matter stage: the cell's filaments become contour lines, a mountain ridge, and cloud
 * bands — drawn on with stroke-dashoffset/scale rather than fading in as flat shapes, so
 * the land visibly forms rather than just appearing. Once formed it persists as the
 * backdrop for the Life stage's genetic network, matching the reference's continuity
 * (land doesn't disappear once it exists). */
function TerrainForming({ phase }: { phase: Phase }) {
  const formed = phase !== 'seed';
  return (
    <div className={`terrain-forming ${formed ? 'is-formed' : ''}`} aria-hidden="true">
      <svg viewBox="-100 -100 200 200" className="terrain-forming-svg">
        <defs>
          <linearGradient id="terrainWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(70,150,220,0)" />
            <stop offset="100%" stopColor="rgba(50,120,190,.4)" />
          </linearGradient>
        </defs>
        <ellipse cx="-28" cy="-60" rx="42" ry="7" className="terrain-cloud terrain-cloud-a" />
        <ellipse cx="34" cy="-72" rx="34" ry="6" className="terrain-cloud terrain-cloud-b" />
        <path d="M -70 20 Q -40 -10 0 10 Q 40 30 70 5" className="terrain-contour terrain-contour-a" />
        <path d="M -60 40 Q -20 15 20 35 Q 55 50 78 28" className="terrain-contour terrain-contour-b" />
        <path d="M -50 58 Q -10 38 30 55 Q 55 66 68 50" className="terrain-contour terrain-contour-c" />
        <polygon points="-90,80 -60,20 -40,48 -18,-6 4,38 28,4 52,50 74,26 92,80" className="terrain-ridge terrain-ridge-far" />
        <polygon points="-92,90 -55,42 -30,66 -2,18 26,58 58,30 92,90" className="terrain-ridge terrain-ridge-near" />
        <rect x="-100" y="60" width="200" height="40" fill="url(#terrainWater)" className="terrain-water" />
      </svg>
    </div>
  );
}

/** Life stage: the (by now faded) cell cluster is replaced by a branching genetic
 * network — a root node splitting into tips, each briefly showing a small organism
 * silhouette, echoing the app's own Tree of Life visualization rather than inventing an
 * unrelated motif. */
function GeneticNetwork({ phase }: { phase: Phase }) {
  const formed = phase === 'life' || phase === 'ecology' || phase === 'arrival';
  return (
    <div className={`genetic-network ${formed ? 'is-formed' : ''}`} aria-hidden="true">
      <svg viewBox="-100 -100 200 200" className="genetic-network-svg">
        <g className="genetic-network-branches" stroke="rgba(255,190,130,.6)" strokeWidth="1" fill="none">
          {NETWORK_TIPS.map((tip, i) => (
            <path key={i} d={`M 0 0 Q ${toSvg(tip.xPct) * 0.55} ${toSvg(tip.yPct) * 0.35} ${toSvg(tip.xPct)} ${toSvg(tip.yPct)}`} />
          ))}
          <path d={`M ${toSvg(NETWORK_TIPS[0].xPct)} ${toSvg(NETWORK_TIPS[0].yPct)} Q ${toSvg(NETWORK_TIPS[0].xPct) - 12} ${toSvg(NETWORK_TIPS[0].yPct) - 12} ${toSvg(NETWORK_TIPS[0].xPct) - 24} ${toSvg(NETWORK_TIPS[0].yPct) - 20}`} />
          <path d={`M ${toSvg(NETWORK_TIPS[1].xPct)} ${toSvg(NETWORK_TIPS[1].yPct)} Q ${toSvg(NETWORK_TIPS[1].xPct) + 16} ${toSvg(NETWORK_TIPS[1].yPct) - 10} ${toSvg(NETWORK_TIPS[1].xPct) + 30} ${toSvg(NETWORK_TIPS[1].yPct) - 16}`} />
        </g>
        <g className="genetic-network-nodes" fill="#9fe3ff">
          <circle cx="0" cy="0" r="5" className="network-node network-node-root" style={{ '--delay': '0ms' } as CSSProperties} />
          {NETWORK_TIPS.map((tip, i) => (
            <circle key={i} cx={toSvg(tip.xPct)} cy={toSvg(tip.yPct)} r="3" className="network-node" style={{ '--delay': `${tip.delay}ms` } as CSSProperties} />
          ))}
        </g>
      </svg>
      <div className="genetic-network-blips">
        {NETWORK_TIPS.map((tip, i) => (
          <i key={i} style={{ '--x': `${tip.xPct}%`, '--y': `${tip.yPct}%`, '--delay': `${tip.delay + 260}ms` } as CSSProperties} />
        ))}
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
