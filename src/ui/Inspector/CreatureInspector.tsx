import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../../state/simStore';
import type { SimulationController } from '../../state/simulationController';
import { drawCreatureSprite } from '../../rendering/creatureSprite';
import specimenPortrait from '../../assets/specimen-portrait.png';
import './CreatureInspector.css';

const CORE_TRAITS = [
  { key: 'maxSpeed', label: 'Speed', range: [.3, 3.2] },
  { key: 'visionRadius', label: 'Vision', range: [20, 260] },
  { key: 'metabolism', label: 'Metabolism', range: [.5, 2.6] },
  { key: 'aggression', label: 'Aggression', range: [0, 1] },
  { key: 'tempToleranceRange', label: 'Cold Tolerance', range: [.15, 1.4] },
  { key: 'size', label: 'Body Size', range: [.3, 3.5] },
] as const;

export function CreatureInspector({ controller, onAction }: { controller: SimulationController; onAction?: (message: string) => void }) {
  const inspector = useSimStore((s) => s.inspector);
  const followId = useSimStore((s) => s.followId);
  const godMode = useSimStore((s) => s.godMode);
  const setXrayGene = useSimStore((s) => s.setXrayGene);
  const setOverlay = useSimStore((s) => s.setOverlay);
  const [showGenome, setShowGenome] = useState(false);
  const [liveSpecimen, setLiveSpecimen] = useState(false);

  if (!inspector) return null;

  const isFollowing = followId === inspector.id;
  const energy = Math.round((inspector.energy / inspector.maxEnergy) * 100);
  const mutations = inspector.mutatedFromParent.slice(0, 3);
  const parentTraits = inspector.ancestryChain.find((ancestor) => ancestor.id === inspector.parentId)?.traits;
  const predator = (inspector.traits.diet ?? 0) >= .62;

  return (
    <section className="creature-inspector hud-panel" aria-label={`Creature inspector for ${inspector.name}`}>
      <header className="creature-inspector-header">
        <div>
          <h2>{inspector.name}{inspector.protectedFromThreats && <span className="creature-protected-badge" title="Protected from threats">🛡</span>}</h2>
          <p>{inspector.speciesName}</p>
          <span className={`creature-diet ${predator ? 'is-predator' : ''}`}>{predator ? 'PREDATOR' : (inspector.traits.diet ?? 0) >= .42 ? 'OMNIVORE' : 'HERBIVORE'}</span>
        </div>
        <button className="creature-close" onClick={() => controller.select(null)} aria-label="Close creature inspector">×</button>
      </header>

      <div className="creature-specimen-frame">
        {liveSpecimen ? <CreatureSpecimen controller={controller} organismId={inspector.id} /> : <img src={specimenPortrait} alt="Detailed artistic visualization of an evolved organism" />}
        <button className="creature-portrait-toggle" onClick={() => setLiveSpecimen((value) => !value)}>{liveSpecimen ? 'LIVE PHENOTYPE · VIEW ART' : 'CONCEPT PORTRAIT · VIEW LIVE PHENOTYPE'}</button>
        {!inspector.alive && <em>DECEASED · {inspector.causeOfDeath ?? 'CAUSE UNRECORDED'}</em>}
      </div>

      <div className="creature-stat-rows">
        <StatRow label="Generation" value={inspector.generation} />
        <StatRow label="Age" value={inspector.age} />
        <StatRow label="Energy" value={`${energy}%`}><i className="creature-stat-bar"><b style={{ width: `${energy}%` }} /></i></StatRow>
      </div>

      <section className="creature-genome">
        <div className="creature-section-title"><span>GENOME</span><button onClick={() => setShowGenome((open) => !open)}>{showGenome ? 'Hide Full Genome' : 'View Full Genome'} →</button></div>
        {CORE_TRAITS.map(({ key, label, range }) => {
          const value = inspector.traits[key];
          if (value === undefined) return null;
          return <TraitBar key={key} label={label} value={value} min={range[0]} max={range[1]} mutated={inspector.mutatedFromParent.includes(key)} onHover={setXrayGene} gene={key} />;
        })}
      </section>

        <section className="creature-mutations">
          <div className="creature-section-title"><span>RECENT MUTATIONS</span></div>
          {mutations.length > 0
            ? mutations.map((trait) => {
              const before = parentTraits?.[trait];
              const after = inspector.traits[trait];
              const delta = before === undefined || after === undefined ? null : (after - before) / (Math.abs(before) + 1e-6) * 100;
              return <p key={trait}><b className={delta !== null && delta < 0 ? 'mutation-down' : ''}>{delta !== null && delta < 0 ? '▼' : '▲'}</b>{formatTrait(trait)} <small>{delta === null ? 'Inherited variation' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}</small></p>;
            })
            : <p className="mutation-stable"><b>●</b>No notable trait drift recorded</p>}
        </section>

        <div className="creature-family"><p><span>PARENT</span><b>{inspector.parentId === null ? 'FIRST LINEAGE' : `EVO-${inspector.parentId}`}</b></p><p><span>OFFSPRING</span><b>{inspector.offspringCount}</b></p></div>

      {showGenome && <>

        <div className="creature-detail-drawer">
          <DetailRow label="Body size" value={inspector.traits.size?.toFixed(2) ?? '—'} />
          <DetailRow label="Parent" value={inspector.parentId === null ? 'FIRST LINEAGE' : `EVO-${inspector.parentId}`} />
          <DetailRow label="Offspring" value={inspector.offspringCount} />
          <DetailRow label="Food gathered" value={inspector.foodEaten} />
          <DetailRow label="Distance travelled" value={`${inspector.distanceTravelled} m`} />
          <DetailRow label="Predation / escapes" value={`${inspector.kills} / ${inspector.escapes}`} />
          {godMode && inspector.alive && <div className="creature-divine-actions">
            <button onClick={() => { controller.god.bless(controller.world, inspector.id); onAction?.(`✨ ${inspector.name} has been blessed — energy and health restored.`); }}>BLESS</button>
            <button onClick={() => { controller.god.forceMutate(controller.world, inspector.id); onAction?.(`🧬 A mutation has been forced in ${inspector.name}.`); }}>MUTATE</button>
            <button className={inspector.protectedFromThreats ? 'is-active' : ''} onClick={() => { controller.god.protectLineage(controller.world, inspector.id); onAction?.(`🛡️ ${inspector.name}'s lineage is now protected from threats.`); }}>{inspector.protectedFromThreats ? 'PROTECTED ✓' : 'PROTECT'}</button>
          </div>}
        </div>
      </>}

      <footer className="creature-actions">
        {inspector.alive && (
          <button className={isFollowing ? 'is-active' : ''} onClick={() => controller.follow(isFollowing ? null : inspector.id)}>
            <span>{isFollowing ? '◉' : '◎'}</span>Follow
          </button>
        )}
        <button onClick={() => setOverlay('ancestry', inspector.id)}><span>⌁</span>Ancestry</button>
        <button className="creature-view-details" onClick={() => setShowGenome((open) => !open)}>Genome<span>→</span></button>
      </footer>
    </section>
  );
}

function CreatureSpecimen({ controller, organismId }: { controller: SimulationController; organismId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const organism = controller.world.organisms.get(organismId);
    if (!canvas || !organism) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const draw = (time: number) => {
      const current = controller.world.organisms.get(organismId);
      if (!current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bg = ctx.createRadialGradient(238, 106, 8, 238, 106, 220);
      bg.addColorStop(0, 'rgba(23, 69, 75, .54)'); bg.addColorStop(.55, 'rgba(7, 25, 30, .64)'); bg.addColorStop(1, 'rgba(2, 8, 12, .95)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(151, 218, 230, .075)'; ctx.lineWidth = 1;
      for (let x = 10; x < canvas.width; x += 27) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 11; y < canvas.height; y += 27) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      const glow = ctx.createRadialGradient(240, 110, 4, 240, 110, 102);
      glow.addColorStop(0, 'rgba(98, 236, 199, .15)'); glow.addColorStop(1, 'rgba(73, 224, 214, 0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawCreatureSprite(ctx, 237, 110, 142, -0.05, current.speed > .04, time / 500, current, null);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [controller, organismId]);

  return <canvas ref={canvasRef} width="474" height="220" aria-label="Animated phenotype specimen" />;
}

function TraitBar({ label, value, min, max, mutated, onHover, gene }: { label: string; value: number; min: number; max: number; mutated: boolean; onHover: (gene: string | null) => void; gene: string }) {
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return <div className="creature-trait" onMouseEnter={() => onHover(gene)} onMouseLeave={() => onHover(null)}>
    <span>{label}{mutated && <em> ▲</em>}</span><i><b style={{ width: `${fraction * 100}%` }} /></i><strong>{value.toFixed(2)}</strong>
  </div>;
}

function StatRow({ label, value, children }: { label: string; value: string | number; children?: React.ReactNode }) {
  return <div className="creature-stat-row"><span>{label}</span>{children}<b>{value}</b></div>;
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return <p><span>{label}</span><b>{value}</b></p>;
}

function formatTrait(trait: string) {
  return trait.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}
