import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorldConfig } from '../../simulation/types';
import genesisCosmos from '../../assets/genesis-cosmos.png';
import genesisWorld from '../../assets/genesis-world.png';
import { flavorLine } from './worldBoot';

type GenesisSequenceProps = {
  seed: string;
  climate: WorldConfig['climate'];
  foodAbundance: number;
  onComplete: () => void;
  onEcologyReveal?: () => void;
};

const STAGES = [
  { at: 0, id: 'seed', eyebrow: 'GENESIS PROTOCOL / 01', title: 'A single possibility.', detail: 'Seeding physical laws' },
  { at: 24, id: 'matter', eyebrow: 'GENESIS PROTOCOL / 02', title: 'Matter finds its shape.', detail: 'Gathering land and water' },
  { at: 51, id: 'life', eyebrow: 'GENESIS PROTOCOL / 03', title: 'Life writes itself.', detail: 'Composing first genomes' },
  { at: 76, id: 'ecology', eyebrow: 'GENESIS PROTOCOL / 04', title: 'An ecosystem awakens.', detail: 'Balancing a living system' },
] as const;

type Stage = (typeof STAGES)[number];

function stageAt(percent: number): Stage {
  return [...STAGES].reverse().find((stage) => percent >= stage.at) ?? STAGES[0];
}

export function GenesisSequence({ seed, climate, foodAbundance, onComplete, onEcologyReveal }: GenesisSequenceProps) {
  const [progress, setProgress] = useState(0);
  const [arriving, setArriving] = useState(false);
  const done = useRef(false);
  const ecologyRevealed = useRef(false);
  const started = useRef<number | null>(null);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  // Reduced motion removes the animated movement, but still leaves enough time to read the
  // creation state; a near-instant swap made the loader effectively invisible.
  const duration = reducedMotion ? 6500 : 8400;
  const stage = stageAt(progress);
  const quote = useMemo(() => flavorLine({ climate, foodAbundance }), [climate, foodAbundance]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    let frame = 0;
    let timer: number | undefined;
    const update = (time: number) => {
      if (started.current === null) started.current = time;
      const next = Math.min(100, ((time - started.current) / duration) * 100);
      setProgress(next);
      if (next >= 100) {
        setArriving(true);
        timer = window.setTimeout(finish, reducedMotion ? 0 : 1000);
        return;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [duration, finish, reducedMotion]);

  useEffect(() => {
    if (stage.id === 'ecology' && !ecologyRevealed.current) {
      ecologyRevealed.current = true;
      onEcologyReveal?.();
    }
  }, [onEcologyReveal, stage.id]);

  return (
    <section className={`genesis-loader genesis-${stage.id}${arriving ? ' genesis-arriving' : ''}`} role="status" aria-label="Creating a new world">
      <div className="genesis-cosmos" style={{ backgroundImage: `url(${genesisCosmos})` }} aria-hidden="true" />
      <div className="genesis-world" style={{ backgroundImage: `url(${genesisWorld})` }} aria-hidden="true" />
      <div className="genesis-shade" aria-hidden="true" />
      <div className="genesis-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>

      <header className="genesis-header">
        <div className="genesis-mark"><strong>EVO</strong><span>ARTIFICIAL LIFE LAB</span></div>
        <div className="genesis-seed"><span>WORLD SEED</span><b>{seed}</b></div>
      </header>

      <main className="genesis-content">
        <div className="genesis-orbit" aria-hidden="true">
          <i className="genesis-orbit-ring ring-a" /><i className="genesis-orbit-ring ring-b" /><i className="genesis-orbit-ring ring-c" />
          <i className="genesis-pulse" /><i className="genesis-core" />
          <i className="genesis-signal signal-a" /><i className="genesis-signal signal-b" /><i className="genesis-signal signal-c" />
        </div>
        <p className="genesis-eyebrow">{stage.eyebrow}</p>
        <h1>{stage.title}</h1>
        <p className="genesis-detail"><i />{stage.detail}</p>
      </main>

      <footer className="genesis-footer">
        <div className="genesis-stage-track" aria-hidden="true">
          {STAGES.map((item) => <span key={item.id} className={progress >= item.at ? 'is-reached' : ''}><i />{item.id}</span>)}
        </div>
        <div className="genesis-progress"><div><i style={{ transform: `scaleX(${progress / 100})` }} /></div><b>{Math.round(progress).toString().padStart(2, '0')}<small>%</small></b></div>
        <p className="genesis-quote">“{quote}”</p>
      </footer>

      <div className="genesis-arrival" aria-hidden="true"><span>WORLD {seed} IS ALIVE</span><strong>BEGIN</strong></div>
      <button className="genesis-skip" type="button" onClick={finish}>Skip creation <span>→</span></button>
    </section>
  );
}
