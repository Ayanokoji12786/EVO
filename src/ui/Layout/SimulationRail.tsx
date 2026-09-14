import { useSimStore } from '../../state/simStore';

/** Reference-style vertical rail: seven labeled sections (World, Life, Evolution,
 * Terrain, Weather, Tools, Analytics) each addressing a real feature of the sim rather
 * than being decorative. Terrain and Weather auto-arm God Mode + their brush; Analytics
 * opens the Time Machine (the closest existing analytics surface). */
export function SimulationRail({ onOpenTree, onOpenTimeMachine, onOpenExperiment, onGodMode }: { onOpenTree: () => void; onOpenTimeMachine: () => void; onOpenExperiment: () => void; onGodMode: () => void }) {
  const godMode = useSimStore((s) => s.godMode);
  const evolutionVision = useSimStore((s) => s.evolutionVision);
  const setEvolutionVision = useSimStore((s) => s.setEvolutionVision);
  const setPending = useSimStore((s) => s.setPendingGodAction);
  const pendingKind = useSimStore((s) => s.pendingGodAction?.kind ?? null);
  const clearInspector = useSimStore((s) => s.select);

  const armWeather = () => {
    if (!godMode) onGodMode();
    setPending({ kind: 'rainfall', radius: 90, intensity: 0.7, duration: 600 });
  };
  const armTerrain = () => {
    if (!godMode) onGodMode();
    setPending({ kind: 'terraform', radius: 90, terrainType: 'grass' });
  };

  return (
    <aside className="sim-rail" aria-label="World tools">
      <RailButton icon={<GlobeIcon />} label="WORLD" onClick={() => clearInspector(null)} />
      <RailButton icon={<PawIcon />} label="LIFE" onClick={onOpenTree} />
      <RailButton icon={<DnaIcon />} label="EVOLUTION" active={evolutionVision} onClick={() => setEvolutionVision(!evolutionVision)} />
      <RailButton icon={<MountainIcon />} label="TERRAIN" active={pendingKind === 'terraform'} onClick={armTerrain} />
      <RailButton icon={<CloudIcon />} label="WEATHER" active={pendingKind === 'rainfall'} onClick={armWeather} />
      <RailButton icon={<FlaskIcon />} label="TOOLS" onClick={onOpenExperiment} />
      <RailButton icon={<BarsIcon />} label="ANALYTICS" onClick={onOpenTimeMachine} />
      <i className="sim-rail-divider" />
      <RailButton icon={<BoltIcon />} label="GOD" active={godMode} onClick={onGodMode} accent />
    </aside>
  );
}

function RailButton({ icon, label, onClick, active, accent }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; accent?: boolean }) {
  return (
    <button className={`sim-rail-btn ${active ? 'is-active' : ''} ${accent ? 'is-accent' : ''}`} onClick={onClick} title={label}>
      <span className="sim-rail-icon" aria-hidden="true">{icon}</span>
      <small>{label}</small>
    </button>
  );
}

// Inline SVG icons matching the reference rail — each stroked in currentColor so
// hover/active states flow through without per-icon override.
function GlobeIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>; }
function PawIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="6" cy="10" r="2" /><circle cx="10" cy="6" r="2" /><circle cx="14" cy="6" r="2" /><circle cx="18" cy="10" r="2" /><path d="M12 11c-3 0-6 3-6 6a3 3 0 0 0 3 3c1 0 2-.6 3-.6s2 .6 3 .6a3 3 0 0 0 3-3c0-3-3-6-6-6z" /></svg>; }
function DnaIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M7 3c0 5 10 5 10 10s-10 5-10 10" /><path d="M17 3c0 5-10 5-10 10s10 5 10 10" /><path d="M9 7h6M9 17h6" /></svg>; }
function MountainIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 20l6-10 4 6 3-5 5 9z" /><path d="M8 12l2-3" /></svg>; }
function CloudIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M7 17a4 4 0 0 1 0-8 5 5 0 0 1 10 0 3.5 3.5 0 0 1 0 7z" /><path d="M9 20v2M13 20v2M17 20v2" /></svg>; }
function FlaskIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3h4M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7.5 15h9" /></svg>; }
function BarsIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="4" y="12" width="3" height="8" /><rect x="10" y="7" width="3" height="13" /><rect x="16" y="4" width="3" height="16" /></svg>; }
function BoltIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14 2l-8 12h5l-1 8 8-12h-5z" /></svg>; }
